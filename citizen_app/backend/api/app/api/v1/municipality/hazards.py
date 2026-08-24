"""GET /municipality/hazards[, /map implied by query params], /{id},
/{id}/verification, /{id}/timeline, POST /{id}/resolve, /{id}/reopen —
sections 17-32, 39-43, 65-67, 74-76."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.ai_analysis import AIAnalysis
from app.models.citizen_report import CitizenReport
from app.models.enums import (
    ACTIVE_HAZARD_STATUSES,
    HazardStatus,
    MunicipalityPermission,
    NotificationType,
    RepairStatus,
    Severity,
    VerificationMethod,
    VerificationState,
)
from app.models.fleet_observation import FleetObservation
from app.models.hazard import Hazard
from app.models.municipality_action import MunicipalityAction
from app.models.notification import Notification
from app.models.repair import Repair
from app.models.report_media import ReportMedia
from app.models.resolution import Resolution
from app.schemas.municipality import (
    AIAnalysisEvidenceOut,
    CitizenReportEvidenceOut,
    FleetObservationOut,
    MunicipalityActionOut,
    MunicipalityHazardDetailOut,
    MunicipalityHazardListResponse,
    ReopenHazardRequest,
    ResolutionOut,
    ResolveHazardRequest,
    TimelineEventOut,
    TimelineResponse,
    VerificationOut,
)
from app.services.geo import bbox_filter
from app.services.municipality.audit import log_action
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context, require_city_access, require_permission
from app.services.municipality.labels import label_for
from app.services.municipality.priority import compute_priority
from app.services.municipality.serializers import bulk_current_repairs, build_hazard_list, current_repair_summary, display_hazard_code, source_summary_for
from app.services.municipality.verification import compute_verification

router = APIRouter(prefix="/hazards", tags=["municipality"])

PAGE_SIZE_DEFAULT = 50
PAGE_SIZE_MAX = 200


@router.get("/", response_model=MunicipalityHazardListResponse)
async def list_hazards(
    city_id: uuid.UUID = Query(...),
    north: float | None = Query(None),
    south: float | None = Query(None),
    east: float | None = Query(None),
    west: float | None = Query(None),
    status_filter: str | None = Query(None, alias="status", description="Comma-separated HazardStatus values"),
    severity: Severity | None = Query(None),
    source: str | None = Query(None, description="CITIZEN | FLEET | CITIZEN_AND_FLEET"),
    ward_id: uuid.UUID | None = Query(None),
    road: str | None = Query(None),
    search: str | None = Query(None),
    date_from: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(PAGE_SIZE_DEFAULT, gt=0, le=PAGE_SIZE_MAX),
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> MunicipalityHazardListResponse:
    """Section 18/20/57/79 — every filter is applied server-side; a bbox
    (north/south/east/west) narrows to the map viewport, everything else
    narrows the list view. Never a full-city fetch-then-filter."""
    require_city_access(ctx, city_id)

    stmt = select(Hazard).where(Hazard.city_id == city_id)

    if north is not None and south is not None and east is not None and west is not None:
        stmt = stmt.where(bbox_filter(north, south, east, west))

    if status_filter:
        statuses = [s.strip().upper() for s in status_filter.split(",") if s.strip()]
        stmt = stmt.where(Hazard.status.in_(statuses))
    else:
        stmt = stmt.where(Hazard.status.in_(ACTIVE_HAZARD_STATUSES))

    if severity is not None:
        stmt = stmt.where(Hazard.severity == severity)
    if ward_id is not None:
        stmt = stmt.where(Hazard.ward_id == ward_id)
    if road:
        stmt = stmt.where(Hazard.road_name.ilike(f"%{road}%"))
    if date_from is not None:
        stmt = stmt.where(Hazard.created_at >= date_from)
    if search:
        needle = f"%{search}%"
        stmt = stmt.where(or_(Hazard.hazard_code.ilike(needle), Hazard.road_name.ilike(needle), Hazard.location_text.ilike(needle)))

    count_stmt = stmt.with_only_columns(Hazard.id)
    total = len((await db.execute(count_stmt)).all())

    stmt = stmt.order_by(Hazard.last_observed_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    hazards = list(result.scalars().all())

    if source:
        # Source filtering needs the bulk evidence lookup this list already
        # builds; cheapest to filter in Python on this already-narrow page
        # rather than a second round-trip.
        from app.services.municipality.serializers import bulk_source_summaries

        summaries = await bulk_source_summaries(db, [h.id for h in hazards])
        hazards = [h for h in hazards if summaries.get(h.id) == source]

    items = await build_hazard_list(db, hazards)
    return MunicipalityHazardListResponse(items=items, total=total, page=page, page_size=page_size)


async def _get_authorized_hazard(db: AsyncSession, ctx: MunicipalityContext, hazard_id: uuid.UUID) -> Hazard:
    result = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = result.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")
    if hazard.city_id is None or hazard.city_id not in ctx.allowed_city_ids:
        # 404, not 403 — never confirm to an unauthorized caller that a
        # hazard with this id exists in a city they can't see.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")
    return hazard


@router.get("/{hazard_id}", response_model=MunicipalityHazardDetailOut)
async def get_hazard_detail(
    hazard_id: uuid.UUID,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> MunicipalityHazardDetailOut:
    hazard = await _get_authorized_hazard(db, ctx, hazard_id)

    reports_result = await db.execute(select(CitizenReport).where(CitizenReport.hazard_id == hazard.id).order_by(CitizenReport.created_at.desc()))
    reports = list(reports_result.scalars().all())
    report_ids = [r.id for r in reports]
    media_by_report: dict[uuid.UUID, list[str]] = {}
    if report_ids:
        media_result = await db.execute(select(ReportMedia.report_id, ReportMedia.url).where(ReportMedia.report_id.in_(report_ids)))
        for report_id, url in media_result.all():
            media_by_report.setdefault(report_id, []).append(url)
    citizen_reports = [
        CitizenReportEvidenceOut(
            id=r.id,
            report_code=r.report_code,
            hazard_type=r.hazard_type,
            severity=r.severity,
            description=r.description,
            media=media_by_report.get(r.id, []),
            created_at=r.created_at,
        )
        for r in reports
    ]

    ai_analysis_ids = [r.ai_analysis_id for r in reports if r.ai_analysis_id]
    latest_ai: AIAnalysisEvidenceOut | None = None
    if ai_analysis_ids:
        ai_result = await db.execute(select(AIAnalysis).where(AIAnalysis.id.in_(ai_analysis_ids)).order_by(AIAnalysis.created_at.desc()).limit(1))
        ai_row = ai_result.scalar_one_or_none()
        if ai_row:
            latest_ai = AIAnalysisEvidenceOut(
                id=ai_row.id, detected=ai_row.detected, confidence=ai_row.confidence, severity=ai_row.severity,
                model_version=ai_row.model_version, image_url=ai_row.image_url, created_at=ai_row.created_at,
            )

    verification = await compute_verification(db, hazard)
    fleet_observations = [_fleet_out(o) for o in verification.observations]

    actions_result = await db.execute(select(MunicipalityAction).where(MunicipalityAction.hazard_id == hazard.id).order_by(MunicipalityAction.created_at.desc()).limit(20))
    actions = [
        MunicipalityActionOut(
            id=a.id, action_type=a.action_type, notes=a.notes, performed_by=a.performed_by,
            from_status=a.from_status, to_status=a.to_status, created_at=a.created_at,
        )
        for a in actions_result.scalars().all()
    ]

    repairs = await bulk_current_repairs(db, [hazard.id])
    repair = repairs.get(hazard.id)

    priority = await compute_priority(db, hazard)
    source_summary = await source_summary_for(db, hazard.id)

    resolution_state = "ACTIVE"
    if hazard.status == HazardStatus.RESOLVED:
        resolution_state = "RESOLVED"
    elif hazard.status == HazardStatus.REOPENED:
        resolution_state = "REOPENED"

    await log_action(
        db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=hazard.city_id,
        action="VIEWED_HAZARD", entity_type="hazard", entity_id=hazard.id,
    )
    await db.commit()

    return MunicipalityHazardDetailOut(
        id=hazard.id,
        hazard_code=display_hazard_code(hazard),
        type=hazard.type,
        latitude=hazard.latitude,
        longitude=hazard.longitude,
        location_text=hazard.location_text,
        road_name=hazard.road_name,
        city_id=hazard.city_id,
        ward_id=hazard.ward_id,
        severity=hazard.severity,
        status=hazard.status,
        ai_confidence=hazard.ai_confidence,
        image_url=hazard.image_url,
        description=hazard.description,
        source_summary=source_summary,
        repair_status=repair.status if repair else None,
        repair_code=repair.repair_code if repair else None,
        created_at=hazard.created_at,
        updated_at=hazard.updated_at,
        last_observed_at=hazard.last_observed_at,
        citizen_reports=citizen_reports,
        latest_ai_analysis=latest_ai,
        latest_fleet_observations=fleet_observations,
        municipality_actions=actions,
        current_repair=current_repair_summary(repair),
        priority=priority,
        resolution_state=resolution_state,
    )


def _fleet_out(o: FleetObservation) -> FleetObservationOut:
    return FleetObservationOut(
        id=o.id, vehicle_id=o.vehicle_id, observed_at=o.observed_at, observation_state=o.observation_state,
        confidence=o.confidence, severity=o.severity, image_url=o.image_url, latitude=o.latitude,
        longitude=o.longitude, data_quality=o.data_quality,
    )


@router.get("/{hazard_id}/verification", response_model=VerificationOut)
async def get_verification(
    hazard_id: uuid.UUID,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> VerificationOut:
    hazard = await _get_authorized_hazard(db, ctx, hazard_id)
    result = await compute_verification(db, hazard)
    return VerificationOut(
        hazard_id=hazard.id,
        state=result.state,
        confidence=result.confidence,
        detected_count=result.detected_count,
        clear_count=result.clear_count,
        observations=[_fleet_out(o) for o in result.observations],
        summary=result.summary,
        previously_resolved=result.previously_resolved,
        reopen_suggested=result.reopen_suggested,
    )


@router.get("/{hazard_id}/timeline", response_model=TimelineResponse)
async def get_timeline(
    hazard_id: uuid.UUID,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> TimelineResponse:
    hazard = await _get_authorized_hazard(db, ctx, hazard_id)
    result = await db.execute(select(MunicipalityAction).where(MunicipalityAction.hazard_id == hazard.id).order_by(MunicipalityAction.created_at.asc()))
    events = [
        TimelineEventOut(
            id=a.id, label=label_for(a.action_type), detail=a.notes, from_status=a.from_status,
            to_status=a.to_status, actor=a.performed_by, created_at=a.created_at,
        )
        for a in result.scalars().all()
    ]
    return TimelineResponse(hazard_id=hazard.id, events=events)


@router.post("/{hazard_id}/resolve", response_model=ResolutionOut)
async def resolve_hazard(
    hazard_id: uuid.UUID,
    payload: ResolveHazardRequest,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> ResolutionOut:
    """Sections 39/40/41/76 — the backend is the only place a hazard can be
    marked resolved; never a client-side decision. The hazard row is never
    deleted, only its status changes (section 87)."""
    require_permission(ctx, MunicipalityPermission.RESOLVE_HAZARD.value)
    hazard = await _get_authorized_hazard(db, ctx, hazard_id)

    if hazard.status == HazardStatus.RESOLVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "This hazard is already resolved.")

    repair: Repair | None = None
    if payload.repair_id is not None:
        repair_result = await db.execute(select(Repair).where(Repair.id == payload.repair_id))
        repair = repair_result.scalar_one_or_none()
        if repair is None or repair.hazard_id != hazard.id:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The specified repair does not belong to this hazard.")
    else:
        repairs = await bulk_current_repairs(db, [hazard.id])
        repair = repairs.get(hazard.id)

    if payload.verification_method in (VerificationMethod.MUNICIPAL_INSPECTION, VerificationMethod.COMBINED):
        if repair is None or repair.status not in (RepairStatus.READY_FOR_INSPECTION, RepairStatus.RESOLVED):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "The repair must pass inspection (marked ready and approved) before resolution can be confirmed.",
            )
    else:  # FLEET_REVALIDATION — resolve on evidence alone, no repair required
        verification = await compute_verification(db, hazard)
        if verification.state not in (VerificationState.CONFIRMED_CLEAR, VerificationState.PROBABLY_CLEAR):
            raise HTTPException(status.HTTP_409_CONFLICT, "Recent fleet evidence does not yet confirm this road is clear.")

    now = datetime.now(timezone.utc)
    from_status = hazard.status
    hazard.status = HazardStatus.RESOLVED
    hazard.resolved_at = now
    hazard.municipality_status = "RESOLVED"

    if repair is not None and repair.status != RepairStatus.RESOLVED:
        repair.status = RepairStatus.RESOLVED
        repair.completed_at = now

    resolution = Resolution(
        hazard_id=hazard.id,
        repair_id=repair.id if repair else None,
        verified_by=ctx.user.id,
        verified_at=now,
        resolution_notes=payload.resolution_notes,
        evidence_media=payload.evidence_media_ids,
        latitude=payload.latitude,
        longitude=payload.longitude,
        verification_method=payload.verification_method,
        status="CONFIRMED",
    )
    db.add(resolution)

    db.add(
        MunicipalityAction(
            hazard_id=hazard.id, action_type="HAZARD_RESOLVED", notes=payload.resolution_notes,
            performed_by=ctx.user.full_name, performed_by_user_id=ctx.user.id,
            from_status=from_status, to_status=HazardStatus.RESOLVED.value,
        )
    )

    # Section 41/48 — every reporting citizen finds out their road was
    # fixed. `NotificationType.ROAD_RESOLVED` already existed unused,
    # created specifically for this cross-app moment.
    reports_result = await db.execute(select(CitizenReport.user_id).where(CitizenReport.hazard_id == hazard.id).distinct())
    for (user_id,) in reports_result.all():
        db.add(
            Notification(
                user_id=user_id, type=NotificationType.ROAD_RESOLVED, title="Your reported hazard has been resolved",
                body=f"{hazard.road_name or hazard.location_text} has been repaired and confirmed clear.",
                related_hazard_id=hazard.id,
            )
        )

    await log_action(
        db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=hazard.city_id,
        action="RESOLVE_HAZARD", entity_type="hazard", entity_id=hazard.id,
        metadata={"repair_id": str(repair.id) if repair else None, "verification_method": payload.verification_method.value},
    )

    await db.commit()
    await db.refresh(resolution)
    return ResolutionOut.model_validate(resolution)


@router.post("/{hazard_id}/reopen", response_model=MunicipalityHazardDetailOut)
async def reopen_hazard(
    hazard_id: uuid.UUID,
    payload: ReopenHazardRequest,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> MunicipalityHazardDetailOut:
    """Section 42/64 — a resolved hazard is never permanently final; new
    evidence of deterioration reopens it in place (Option A: same hazard
    row, new status), preserving full history rather than creating a
    disconnected duplicate."""
    require_permission(ctx, MunicipalityPermission.ASSIGN_REPAIR.value)
    hazard = await _get_authorized_hazard(db, ctx, hazard_id)

    if hazard.status != HazardStatus.RESOLVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only a resolved hazard can be reopened.")

    hazard.status = HazardStatus.REOPENED
    hazard.resolved_at = None
    hazard.municipality_status = "REOPENED"

    db.add(
        MunicipalityAction(
            hazard_id=hazard.id, action_type="HAZARD_REOPENED", notes=payload.note,
            performed_by=ctx.user.full_name, performed_by_user_id=ctx.user.id,
            from_status=HazardStatus.RESOLVED.value, to_status=HazardStatus.REOPENED.value,
        )
    )
    await log_action(
        db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=hazard.city_id,
        action="REOPEN_HAZARD", entity_type="hazard", entity_id=hazard.id,
    )
    await db.commit()

    return await get_hazard_detail(hazard_id, ctx, db)
