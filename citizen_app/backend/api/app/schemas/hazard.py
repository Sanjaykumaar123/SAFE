import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.models.enums import HazardStatus, HazardType, Severity

if TYPE_CHECKING:
    from app.models.hazard import Hazard


class HazardOut(BaseModel):
    """
    Citizen-facing hazard shape. Deliberately excludes
    `verified_by_admin` / `municipality_status` internals — the API layer
    translates those into the friendly `verification_note` string instead
    (section 46: never leak backend/fleet/admin language to citizens).
    """

    id: uuid.UUID
    type: HazardType
    latitude: float
    longitude: float
    location_text: str
    road_name: str | None
    severity: Severity
    status: HazardStatus
    ai_confidence: float | None
    image_url: str | None
    description: str | None
    distance_meters: float | None = None
    verification_note: str | None = None
    created_at: datetime
    updated_at: datetime
    last_observed_at: datetime

    model_config = {"from_attributes": True}


class HazardDetailOut(HazardOut):
    media: list[str] = []


class HazardListResponse(BaseModel):
    items: list[HazardOut]
    total: int


def build_verification_note(verified_by_admin: bool, verification_count: int) -> str | None:
    """The single place that turns internal verification state into citizen
    copy — see section 13/46."""
    if verified_by_admin:
        return "Recently verified by SafePath road observations."
    if verification_count > 0:
        return "Confirmed by multiple recent road observations."
    return None


def build_hazard_out(hazard: "Hazard", distance_meters: float | None = None, verification_count: int = 0) -> HazardOut:
    """The single place a `Hazard` ORM row turns into the citizen-facing
    `HazardOut` shape — used by the hazards router, the citizen/home
    dashboard, and anywhere else a hazard needs serializing."""
    return HazardOut(
        id=hazard.id,
        type=hazard.type,
        latitude=hazard.latitude,
        longitude=hazard.longitude,
        location_text=hazard.location_text,
        road_name=hazard.road_name,
        severity=hazard.severity,
        status=hazard.status,
        ai_confidence=hazard.ai_confidence,
        image_url=hazard.image_url,
        description=hazard.description,
        distance_meters=round(distance_meters, 1) if distance_meters is not None else None,
        verification_note=build_verification_note(hazard.verified_by_admin, verification_count),
        created_at=hazard.created_at,
        updated_at=hazard.updated_at,
        last_observed_at=hazard.last_observed_at,
    )
