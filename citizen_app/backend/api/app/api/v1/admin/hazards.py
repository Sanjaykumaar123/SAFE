"""
Admin Hazard Management Routes for SafePath AI backend.
Provides endpoints for location-scoped hazard list, detail, verify, reject, reopen, flag, duplicate candidate search, and hazard merge.
"""
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.enums import HazardStatus, Severity
from app.models.hazard import Hazard
from app.models.hazard_media import HazardMedia
from app.models.hazard_verification import HazardVerification
from app.schemas.hazard import build_hazard_out
from app.services.geo import query_nearby_hazards, haversine_distance_meters

router = APIRouter(prefix="/admin/hazards", tags=["admin-hazards"])


class VerifyHazardPayload(BaseModel):
    version: Optional[int] = 1


class RejectHazardPayload(BaseModel):
    version: Optional[int] = 1
    reason: str


class ReopenHazardPayload(BaseModel):
    version: Optional[int] = 1
    reason: str


class FlagHazardPayload(BaseModel):
    reason: str


class MergeHazardPayload(BaseModel):
    mergedId: str
    version: Optional[int] = 1


def _format_admin_hazard(hazard: Hazard, distance_km: Optional[float] = None) -> dict[str, Any]:
    lat = float(hazard.latitude) if hazard.latitude is not None else 0.0
    lon = float(hazard.longitude) if hazard.longitude is not None else 0.0
    
    return {
        "id": str(hazard.id),
        "code": f"PTH-{str(hazard.id)[:6].upper()}",
        "title": f"Pothole on {hazard.road_name or 'Road'}",
        "latitude": lat,
        "longitude": lon,
        "status": hazard.status.value if hasattr(hazard.status, "value") else str(hazard.status),
        "severity": hazard.severity.value if hasattr(hazard.severity, "value") else str(hazard.severity),
        "locationText": hazard.address_text or hazard.road_name or "Unknown Location",
        "cityId": str(hazard.city_id) if hazard.city_id else "chennai",
        "cityName": "Chennai",
        "distanceKm": distance_km if distance_km is not None else 0.0,
        "createdAt": hazard.created_at.isoformat() if hazard.created_at else "",
        "updatedAt": hazard.updated_at.isoformat() if hazard.updated_at else "",
        "version": getattr(hazard, "version", 1) or 1,
        "verifiedByAdmin": hazard.verified_by_admin,
        "citizenReportCount": getattr(hazard, "citizen_report_count", 1) or 1,
        "fleetObservationCount": getattr(hazard, "fleet_observation_count", 1) or 1,
        "linkedHazardIds": [],
    }


def _format_admin_hazard_detail(hazard: Hazard, media_urls: list[str], verifications: list[Any]) -> dict[str, Any]:
    base = _format_admin_hazard(hazard)
    base["media"] = media_urls
    base["verifications"] = [
        {
            "id": str(v.id),
            "verifiedBy": "Admin",
            "method": str(v.method),
            "verifiedAt": v.created_at.isoformat() if v.created_at else "",
        }
        for v in verifications
    ]
    base["evidenceSummary"] = {
        "citizenReports": getattr(hazard, "citizen_report_count", 1) or 1,
        "fleetConfirmations": getattr(hazard, "fleet_observation_count", 1) or 1,
        "aiConfidence": round(float(hazard.ai_confidence or 0.85), 2),
        "adminVerified": hazard.verified_by_admin,
    }
    return base


@router.get("")
@router.get("/")
async def list_admin_hazards(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    radiusKm: float = Query(20.0, gt=0),
    tab: str = Query("ALL"),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Location-first Admin hazard search within radiusKm (default 20km)."""
    if lat is not None and lon is not None:
        radius_m = radiusKm * 1000.0
        rows = await query_nearby_hazards(db, latitude=lat, longitude=lon, radius_meters=radius_m, limit=500)
        hazards_with_dist = [(h, d / 1000.0) for h, d in rows]
    else:
        stmt = select(Hazard).order_by(Hazard.created_at.desc()).limit(500)
        res = await db.execute(stmt)
        hazards_with_dist = [(h, 0.0) for h in res.scalars().all()]

    filtered: list[tuple[Hazard, float]] = []
    for h, d in hazards_with_dist:
        h_status = h.status.value if hasattr(h.status, "value") else str(h.status)
        h_sev = h.severity.value if hasattr(h.severity, "value") else str(h.severity)

        if tab == "HIGH_PRIORITY" and h_sev not in ("CRITICAL", "HIGH"):
            continue
        elif tab == "NEW" and h_status not in ("REPORTED", "NEW"):
            continue
        elif tab == "UNDER_REVIEW" and h_status != "UNDER_REVIEW":
            continue
        elif tab == "ACTIVE" and h_status not in ("ACTIVE", "VERIFIED"):
            continue
        elif tab == "DUPLICATE" and h_status != "DUPLICATE":
            continue
        elif tab == "RESOLVED" and h_status != "RESOLVED":
            continue
        elif tab == "REOPENED" and h_status != "REOPENED":
            continue

        if q and q.strip():
            query_str = q.strip().lower()
            code_str = f"PTH-{str(h.id)[:6].upper()}".lower()
            loc_str = (h.address_text or h.road_name or "").lower()
            if query_str not in code_str and query_str not in loc_str:
                continue

        filtered.append((h, d))

    total = len(filtered)
    start_idx = (page - 1) * pageSize
    page_items = filtered[start_idx : start_idx + pageSize]
    items = [_format_admin_hazard(h, dist) for h, dist in page_items]

    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "hasMore": start_idx + pageSize < total,
    }


@router.get("/{hazard_id}")
async def get_admin_hazard_detail(hazard_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = res.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")

    media_res = await db.execute(select(HazardMedia.url).where(HazardMedia.hazard_id == hazard_id))
    media_urls = [r[0] for r in media_res.all()]

    verif_res = await db.execute(select(HazardVerification).where(HazardVerification.hazard_id == hazard_id))
    verifications = verif_res.scalars().all()

    return _format_admin_hazard_detail(hazard, media_urls, verifications)


@router.post("/{hazard_id}/verify")
async def verify_admin_hazard(
    hazard_id: uuid.UUID,
    payload: VerifyHazardPayload,
    current_user: Any = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = res.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")

    old_status = str(hazard.status)
    hazard.status = HazardStatus.VERIFIED
    hazard.verified_by_admin = True
    
    # Audit event
    user_id = current_user.id if current_user else None
    audit = AuditLog(
        user_id=user_id,
        action="ADMIN_VERIFY_HAZARD",
        entity_type="Hazard",
        entity_id=hazard.id,
        action_metadata={"old_status": old_status, "new_status": "VERIFIED"},
    )
    db.add(audit)
    await db.commit()

    media_res = await db.execute(select(HazardMedia.url).where(HazardMedia.hazard_id == hazard_id))
    media_urls = [r[0] for r in media_res.all()]
    verif_res = await db.execute(select(HazardVerification).where(HazardVerification.hazard_id == hazard_id))
    
    return _format_admin_hazard_detail(hazard, media_urls, verif_res.scalars().all())


@router.post("/{hazard_id}/reject")
async def reject_admin_hazard(
    hazard_id: uuid.UUID,
    payload: RejectHazardPayload,
    current_user: Any = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = res.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")

    old_status = str(hazard.status)
    hazard.status = HazardStatus.REJECTED

    user_id = current_user.id if current_user else None
    audit = AuditLog(
        user_id=user_id,
        action="ADMIN_REJECT_HAZARD",
        entity_type="Hazard",
        entity_id=hazard.id,
        action_metadata={"old_status": old_status, "new_status": "REJECTED", "reason": payload.reason},
    )
    db.add(audit)
    await db.commit()

    media_res = await db.execute(select(HazardMedia.url).where(HazardMedia.hazard_id == hazard_id))
    media_urls = [r[0] for r in media_res.all()]
    verif_res = await db.execute(select(HazardVerification).where(HazardVerification.hazard_id == hazard_id))
    
    return _format_admin_hazard_detail(hazard, media_urls, verif_res.scalars().all())


@router.post("/{hazard_id}/reopen")
async def reopen_admin_hazard(
    hazard_id: uuid.UUID,
    payload: ReopenHazardPayload,
    current_user: Any = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = res.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")

    old_status = str(hazard.status)
    hazard.status = HazardStatus.REOPENED

    user_id = current_user.id if current_user else None
    audit = AuditLog(
        user_id=user_id,
        action="ADMIN_REOPEN_HAZARD",
        entity_type="Hazard",
        entity_id=hazard.id,
        action_metadata={"old_status": old_status, "new_status": "REOPENED", "reason": payload.reason},
    )
    db.add(audit)
    await db.commit()

    media_res = await db.execute(select(HazardMedia.url).where(HazardMedia.hazard_id == hazard_id))
    media_urls = [r[0] for r in media_res.all()]
    verif_res = await db.execute(select(HazardVerification).where(HazardVerification.hazard_id == hazard_id))
    
    return _format_admin_hazard_detail(hazard, media_urls, verif_res.scalars().all())


@router.post("/{hazard_id}/flag")
async def flag_admin_hazard(
    hazard_id: uuid.UUID,
    payload: FlagHazardPayload,
    current_user: Any = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = res.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")

    user_id = current_user.id if current_user else None
    audit = AuditLog(
        user_id=user_id,
        action="ADMIN_FLAG_HAZARD",
        entity_type="Hazard",
        entity_id=hazard.id,
        action_metadata={"reason": payload.reason},
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "message": "Hazard flagged."}


@router.get("/{hazard_id}/duplicates")
async def get_duplicate_candidates(
    hazard_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Find nearby candidate hazards within 150m for merging."""
    res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    target = res.scalar_one_or_none()
    if target is None:
        return []

    lat_t = float(target.latitude) if target.latitude else 0.0
    lon_t = float(target.longitude) if target.longitude else 0.0

    all_res = await db.execute(select(Hazard).where(Hazard.id != hazard_id).limit(100))
    others = all_res.scalars().all()

    candidates = []
    for other in others:
        lat_o = float(other.latitude) if other.latitude else 0.0
        lon_o = float(other.longitude) if other.longitude else 0.0
        dist_m = haversine_distance_meters(lat_t, lon_t, lat_o, lon_o)

        if dist_m <= 150.0:
            candidates.append({
                "hazardA": _format_admin_hazard(target),
                "hazardB": _format_admin_hazard(other),
                "distanceMeters": round(dist_m),
                "sameRoad": (target.road_name == other.road_name),
            })

    return candidates


@router.post("/{hazard_id}/merge")
async def merge_admin_hazards(
    hazard_id: uuid.UUID,
    payload: MergeHazardPayload,
    current_user: Any = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    merged_uuid = uuid.UUID(payload.mergedId)
    
    canonical_res = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    canonical = canonical_res.scalar_one_or_none()
    
    merged_res = await db.execute(select(Hazard).where(Hazard.id == merged_uuid))
    merged = merged_res.scalar_one_or_none()

    if canonical is None or merged is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "One or both hazards not found.")

    merged.status = HazardStatus.DUPLICATE
    
    user_id = current_user.id if current_user else None
    audit = AuditLog(
        user_id=user_id,
        action="ADMIN_MERGE_HAZARDS",
        entity_type="Hazard",
        entity_id=canonical.id,
        action_metadata={"canonical_id": str(canonical.id), "merged_id": str(merged.id)},
    )
    db.add(audit)
    await db.commit()

    media_res = await db.execute(select(HazardMedia.url).where(HazardMedia.hazard_id == hazard_id))
    media_urls = [r[0] for r in media_res.all()]
    verif_res = await db.execute(select(HazardVerification).where(HazardVerification.hazard_id == hazard_id))
    
    return _format_admin_hazard_detail(canonical, media_urls, verif_res.scalars().all())
