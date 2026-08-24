"""GET /citizen/home — the single optimized dashboard payload (section 42)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.city import City
from app.models.citizen_profile import CitizenProfile
from app.models.enums import Severity
from app.models.user import User
from app.schemas.citizen import HomeResponse, HomeStats
from app.schemas.hazard import build_hazard_out
from app.services.geo import query_nearby_hazards

router = APIRouter(prefix="/citizen", tags=["citizen"])


def _greeting_for(now: datetime) -> str:
    hour = now.hour
    if hour < 12:
        return "Good Morning"
    if hour < 17:
        return "Good Afternoon"
    return "Good Evening"


@router.get("/home", response_model=HomeResponse)
async def citizen_home(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius: float = Query(5000, gt=0, le=50000),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> HomeResponse:
    city_name = "Chennai"
    user_name = "Guest"
    if current_user:
        user_name = current_user.full_name.split(" ")[0]
        profile_result = await db.execute(select(CitizenProfile).where(CitizenProfile.user_id == current_user.id))
        profile = profile_result.scalar_one_or_none()
        if profile and profile.city_id:
            city_result = await db.execute(select(City).where(City.id == profile.city_id))
            city = city_result.scalar_one_or_none()
            if city:
                city_name = city.name

    rows = await query_nearby_hazards(db, latitude=latitude, longitude=longitude, radius_meters=radius, limit=100)

    nearby_out = [build_hazard_out(hazard, distance) for hazard, distance in rows[:20]]

    critical_count = sum(1 for hazard, _ in rows if hazard.severity == Severity.CRITICAL)
    warning_count = sum(1 for hazard, _ in rows if hazard.severity in (Severity.MEDIUM, Severity.LOW))

    return HomeResponse(
        greeting=_greeting_for(datetime.now(timezone.utc)),
        user_name=user_name,
        city_name=city_name,
        stats=HomeStats(nearby_count=len(rows), critical_count=critical_count, warning_count=warning_count),
        nearby_hazards=nearby_out,
        map_markers=[build_hazard_out(hazard, distance) for hazard, distance in rows],
    )
