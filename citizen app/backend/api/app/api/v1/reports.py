"""
POST /, GET /me, GET /{id}.

`POST /reports` is the single transaction that creates the Hazard +
CitizenReport + ReportStatusHistory + ReportMedia rows together (section
23). The request schema (`ReportCreateRequest`) simply has no fields for
`verified_by_admin` / `municipality_status` / `resolved_at` / `report_code`
/ arbitrary `status` — there is nothing for a malicious client to even send
that would touch them; those are only ever set by backend logic.
"""
import uuid
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.ai_analysis import AIAnalysis
from app.models.citizen_report import CitizenReport
from app.models.enums import ACTIVE_HAZARD_STATUSES, HazardSource, HazardStatus
from app.models.geo import make_point_wkt
from app.models.hazard import Hazard
from app.models.hazard_media import HazardMedia
from app.models.report_media import ReportMedia
from app.models.report_status_history import ReportStatusHistory
from app.models.user import User
from app.schemas.ai import AIAnalysisResult
from app.schemas.report import ReportCreateRequest, ReportListItem, ReportListResponse, ReportOut, ReportStatusHistoryOut
from app.services.report_code import generate_report_code

router = APIRouter(prefix="/reports", tags=["reports"])


async def _to_report_out(db: AsyncSession, report: CitizenReport) -> ReportOut:
    media_result = await db.execute(select(ReportMedia.url).where(ReportMedia.report_id == report.id))
    media_urls = [row[0] for row in media_result.all()]

    ai_result: AIAnalysisResult | None = None
    if report.ai_analysis_id:
        ai_row = await db.execute(select(AIAnalysis).where(AIAnalysis.id == report.ai_analysis_id))
        ai = ai_row.scalar_one_or_none()
        if ai:
            ai_result = AIAnalysisResult(
                detected=ai.detected,
                hazard_type=ai.hazard_type,
                confidence=ai.confidence,
                severity=ai.severity,
                bounding_box=ai.bounding_box,
                processing_time_ms=ai.processing_time_ms,
                model_version=ai.model_version,
                message=ai.message,
            )

    history_result = await db.execute(
        select(ReportStatusHistory).where(ReportStatusHistory.report_id == report.id).order_by(ReportStatusHistory.created_at)
    )
    history = [ReportStatusHistoryOut.model_validate(h) for h in history_result.scalars().all()]

    return ReportOut(
        id=report.id,
        report_code=report.report_code,
        hazard_id=report.hazard_id,
        hazard_type=report.hazard_type,
        severity=report.severity,
        status=report.status,
        description=report.description,
        latitude=report.latitude,
        longitude=report.longitude,
        location_text=report.location_text,
        media=media_urls,
        ai_analysis=ai_result,
        status_history=history,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.post("/", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportOut:
    point_wkt = make_point_wkt(payload.latitude, payload.longitude)

    ai_analysis_id = None
    ai_confidence = None
    if payload.ai_analysis is not None:
        ai_row = AIAnalysis(
            image_url=payload.media_urls[0] if payload.media_urls else "",
            detected=payload.ai_analysis.detected,
            hazard_type=payload.ai_analysis.hazard_type,
            confidence=payload.ai_analysis.confidence,
            severity=payload.ai_analysis.severity,
            bounding_box=payload.ai_analysis.bounding_box.model_dump() if payload.ai_analysis.bounding_box else None,
            processing_time_ms=payload.ai_analysis.processing_time_ms,
            model_version=payload.ai_analysis.model_version,
            message=payload.ai_analysis.message,
        )
        db.add(ai_row)
        await db.flush()
        ai_analysis_id = ai_row.id
        ai_confidence = payload.ai_analysis.confidence

    hazard = Hazard(
        type=payload.hazard_type,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=point_wkt,
        location_text=payload.location_text,
        severity=payload.severity,
        status=HazardStatus.REPORTED,
        ai_confidence=ai_confidence,
        source=HazardSource.CITIZEN_REPORT,
        image_url=payload.media_urls[0] if payload.media_urls else None,
        description=payload.description,
        city_id=payload.city_id,
    )
    db.add(hazard)
    await db.flush()

    for url in payload.media_urls:
        db.add(HazardMedia(hazard_id=hazard.id, url=url))

    report_code = await generate_report_code(db)
    report = CitizenReport(
        report_code=report_code,
        user_id=current_user.id,
        hazard_id=hazard.id,
        hazard_type=payload.hazard_type,
        severity=payload.severity,
        status=HazardStatus.REPORTED,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=point_wkt,
        location_text=payload.location_text,
        city_id=payload.city_id,
        ai_analysis_id=ai_analysis_id,
        client_timestamp=payload.client_timestamp if payload.client_timestamp.tzinfo else payload.client_timestamp.replace(tzinfo=timezone.utc),
    )
    db.add(report)
    await db.flush()

    for url in payload.media_urls:
        db.add(ReportMedia(report_id=report.id, url=url))

    db.add(
        ReportStatusHistory(
            report_id=report.id,
            status=HazardStatus.REPORTED,
            note="Report submitted by citizen.",
            changed_by="CITIZEN",
        )
    )

    await db.commit()
    await db.refresh(report)
    return await _to_report_out(db, report)


@router.get("/me", response_model=ReportListResponse)
async def my_reports(
    tab: str = Query("all", pattern="^(all|active|resolved)$"),
    limit: int = Query(50, gt=0, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportListResponse:
    stmt = select(CitizenReport).where(CitizenReport.user_id == current_user.id)
    if tab == "active":
        stmt = stmt.where(CitizenReport.status.in_(ACTIVE_HAZARD_STATUSES))
    elif tab == "resolved":
        stmt = stmt.where(CitizenReport.status == HazardStatus.RESOLVED)
    stmt = stmt.order_by(CitizenReport.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    reports = result.scalars().all()
    items = [ReportListItem.model_validate(r) for r in reports]
    return ReportListResponse(items=items, total=len(items))


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportOut:
    result = await db.execute(select(CitizenReport).where(CitizenReport.id == report_id))
    report = result.scalar_one_or_none()
    if report is None or report.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found.")
    return await _to_report_out(db, report)
