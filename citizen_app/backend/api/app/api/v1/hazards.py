"""GET /, GET /nearby, GET /{id} — read-only, guest-accessible hazard data."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.enums import ACTIVE_HAZARD_STATUSES, HazardStatus, Severity
from app.models.hazard import Hazard
from app.models.hazard_media import HazardMedia
from app.models.hazard_verification import HazardVerification
from app.schemas.hazard import HazardDetailOut, HazardListResponse, build_hazard_out
from app.services.geo import query_nearby_hazards

router = APIRouter(prefix="/hazards", tags=["hazards"])


@router.get("/nearby", response_model=HazardListResponse)
async def nearby_hazards(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius: float = Query(5000, gt=0, le=50000, description="Radius in meters"),
    severity: Severity | None = Query(None),
    status_filter: HazardStatus | None = Query(None, alias="status"),
    limit: int = Query(100, gt=0, le=500),
    db: AsyncSession = Depends(get_db),
) -> HazardListResponse:
    """The one real PostGIS radius query — never fetch-everything-then-
    filter-client-side (section 27/43)."""
    rows = await query_nearby_hazards(
        db, latitude=latitude, longitude=longitude, radius_meters=radius, severity=severity, status=status_filter, limit=limit
    )
    items = [build_hazard_out(hazard, distance) for hazard, distance in rows]
    return HazardListResponse(items=items, total=len(items))


@router.get("/", response_model=HazardListResponse)
async def list_hazards(
    city_id: uuid.UUID | None = Query(None),
    severity: Severity | None = Query(None),
    status_filter: HazardStatus | None = Query(None, alias="status"),
    limit: int = Query(100, gt=0, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> HazardListResponse:
    stmt = select(Hazard)
    if city_id is not None:
        stmt = stmt.where(Hazard.city_id == city_id)
    if severity is not None:
        stmt = stmt.where(Hazard.severity == severity)
    if status_filter is not None:
        stmt = stmt.where(Hazard.status == status_filter)
    else:
        stmt = stmt.where(Hazard.status.in_(ACTIVE_HAZARD_STATUSES))
    stmt = stmt.order_by(Hazard.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    hazards = result.scalars().all()
    items = [build_hazard_out(h) for h in hazards]
    return HazardListResponse(items=items, total=len(items))


@router.get("/{hazard_id}", response_model=HazardDetailOut)
async def get_hazard(hazard_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> HazardDetailOut:
    result = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = result.scalar_one_or_none()
    if hazard is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")

    media_result = await db.execute(select(HazardMedia.url).where(HazardMedia.hazard_id == hazard_id))
    media_urls = [row[0] for row in media_result.all()]

    verification_count_result = await db.execute(select(HazardVerification).where(HazardVerification.hazard_id == hazard_id))
    verification_count = len(verification_count_result.scalars().all())

    base = build_hazard_out(hazard, verification_count=verification_count)
    return HazardDetailOut(**base.model_dump(), media=media_urls)
