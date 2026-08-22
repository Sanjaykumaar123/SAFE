"""GET /fleet/routes/today — §54. A simple per-zone constant today (see
`app/services/fleet/serializers.py::ZONE_TARGETS`), not a routing engine;
kept as its own endpoint so the mobile "Assigned Routes" screen has a
stable contract to grow into later."""
from fastapi import APIRouter, Depends

from app.schemas.fleet import TodayRouteOut
from app.services.fleet.authorization import FleetContext, get_fleet_context
from app.services.fleet.serializers import build_today_route

router = APIRouter(prefix="/routes", tags=["fleet"])


@router.get("/today", response_model=TodayRouteOut)
async def today_route(ctx: FleetContext = Depends(get_fleet_context)) -> TodayRouteOut:
    return build_today_route(ctx.profile.zone_name)
