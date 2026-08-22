"""
§13/32/77 — the ONLY place a fleet observation decides whether it belongs to
an existing hazard or starts a new one. The mobile app never does this
matching itself; it just reports what it saw at a lat/lng.
"""
import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ACTIVE_HAZARD_STATUSES, HazardSource, HazardStatus, HazardType, Severity
from app.models.geo import make_point_wkt
from app.models.hazard import Hazard
from app.services.geo import geography_origin
from app.services.municipality.codes import generate_hazard_code

# Same-road-segment radius for "is this the same physical pothole a citizen/
# municipality already logged" (§13's own example: "within appropriate
# radius and same road"). Deliberately smaller than the Municipality
# verification module's RELEVANCE_RADIUS_METERS=150 (that one asks "is this
# evidence *about* this hazard", a looser question than "is this the *same*
# hazard to attach a brand-new fleet sighting to").
ASSOCIATION_RADIUS_METERS = 40


async def associate_or_create_hazard(
    db: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    city_id: uuid.UUID | None,
    hazard_type: HazardType,
    severity: Severity | None,
    confidence: float,
    image_url: str | None,
    observed_at: datetime,
) -> Hazard:
    hazard_type_value = hazard_type.value if isinstance(hazard_type, HazardType) else hazard_type
    severity_value = (severity.value if isinstance(severity, Severity) else severity) or Severity.MEDIUM.value

    origin = geography_origin(latitude, longitude)
    stmt = (
        select(Hazard)
        .where(
            func.ST_DWithin(Hazard.location, origin, ASSOCIATION_RADIUS_METERS),
            Hazard.type == hazard_type_value,
            Hazard.status.in_(ACTIVE_HAZARD_STATUSES),
        )
        .order_by(func.ST_Distance(Hazard.location, origin).asc())
        .limit(1)
    )
    if city_id is not None:
        stmt = stmt.where(Hazard.city_id == city_id)

    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing is not None:
        if observed_at > existing.last_observed_at:
            existing.last_observed_at = observed_at
        # Never downgrade an existing higher-confidence read from a
        # possibly-noisier single fleet pass — only raise it.
        if existing.ai_confidence is None or confidence > existing.ai_confidence:
            existing.ai_confidence = confidence
        return existing

    hazard_code = await generate_hazard_code(db)
    hazard = Hazard(
        hazard_code=hazard_code,
        type=hazard_type_value,
        latitude=latitude,
        longitude=longitude,
        location=make_point_wkt(latitude, longitude),
        location_text="Fleet-observed location — pending road match",
        severity=severity_value,
        status=HazardStatus.UNDER_REVIEW.value,
        ai_confidence=confidence,
        source=HazardSource.FLEET_OBSERVATION.value,
        image_url=image_url,
        city_id=city_id,
        last_observed_at=observed_at,
    )
    db.add(hazard)
    await db.flush()
    return hazard
