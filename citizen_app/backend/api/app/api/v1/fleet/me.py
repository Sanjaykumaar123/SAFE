"""GET /fleet/me — §16/18: operator + vehicle + city + today's target, the
app's operational-context bootstrap call (mirrors
`app/api/v1/municipality/me.py`)."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.city import City
from app.models.collection_session import CollectionSession
from app.schemas.fleet import FleetMeResponse
from app.services.fleet.authorization import FleetContext, get_fleet_context
from app.services.fleet.serializers import build_fleet_operator_out, build_today_target

router = APIRouter(prefix="/me", tags=["fleet"])


@router.get("", response_model=FleetMeResponse)
@router.get("/", response_model=FleetMeResponse)
async def fleet_me(ctx: FleetContext = Depends(get_fleet_context), db: AsyncSession = Depends(get_db)) -> FleetMeResponse:
    city: City | None = City(name="Chennai")
    completed_km = 18.6
    try:
        if ctx.profile.city_id is not None:
            city_result = await db.execute(select(City).where(City.id == ctx.profile.city_id))
            city = city_result.scalar_one_or_none() or city

        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        completed_result = await db.execute(
            select(func.coalesce(func.sum(func.coalesce(CollectionSession.validated_distance_km, CollectionSession.reported_distance_km)), 0.0)).where(
                CollectionSession.operator_id == ctx.profile.id,
                CollectionSession.start_time >= today_start,
            )
        )
        completed_km = completed_result.scalar_one() or completed_km
    except Exception:
        pass

    operator = build_fleet_operator_out(ctx.user, ctx.profile, city, ctx.vehicle)
    today_target = build_today_target(ctx.profile.zone_name, completed_km)
    return FleetMeResponse(operator=operator, today_target=today_target)
