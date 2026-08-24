"""ORM row -> response shape builders (§13/18/54) — the fields that need a
join or a documented demo constant, not a plain `from_attributes` mapping
(those are built directly with `Model.model_validate(row)` at the call
site, same convention `app/schemas/municipality.py`'s simpler `Out` schemas
use)."""
from app.models.city import City
from app.models.fleet_operator_profile import FleetOperatorProfile
from app.models.user import User
from app.models.vehicle import Vehicle
from app.schemas.fleet import FleetOperatorOut, TodayRouteOut, TodayTargetOut, VehicleOut

# §18/53/54 — no routing engine yet, so "today's target" is a documented
# per-zone constant rather than a fabricated number that changes on every
# request. A real deployment would compute this from an assignment/routing
# service; this is the same "documented placeholder, never a random number"
# rule `app/services/municipality/dashboard.py` follows.
ZONE_TARGETS: dict[str, dict] = {
    "Chennai South": {
        "target_km": 40.0,
        "priority_zone": "Chennai South",
        "recommended_roads": ["Velachery Main Road", "OMR", "GST Road"],
    },
}
DEFAULT_TARGET = {
    "target_km": 30.0,
    "priority_zone": None,
    "recommended_roads": [],
}


def build_vehicle_out(vehicle: Vehicle | None) -> VehicleOut | None:
    if vehicle is None:
        return None
    return VehicleOut.model_validate(vehicle)


def build_fleet_operator_out(user: User, profile: FleetOperatorProfile, city: City | None, vehicle: Vehicle | None) -> FleetOperatorOut:
    return FleetOperatorOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        operator_code=profile.operator_code,
        operator_role=profile.operator_role,
        city_id=profile.city_id,
        city_name=city.name if city else None,
        zone_name=profile.zone_name,
        vehicle=build_vehicle_out(vehicle),
        permissions=profile.permissions,
    )


def build_today_target(zone_name: str | None, completed_km: float) -> TodayTargetOut:
    config = ZONE_TARGETS.get(zone_name or "", DEFAULT_TARGET)
    return TodayTargetOut(
        target_km=config["target_km"],
        completed_km=round(completed_km, 1),
        priority_zone=config["priority_zone"],
        recommended_roads=list(config["recommended_roads"]),
    )


def build_today_route(zone_name: str | None) -> TodayRouteOut:
    config = ZONE_TARGETS.get(zone_name or "", DEFAULT_TARGET)
    return TodayRouteOut(
        route_name=" → ".join(config["recommended_roads"]) if config["recommended_roads"] else "No route assigned",
        zone_name=zone_name,
        target_km=config["target_km"],
        priority="MEDIUM",
        road_segments=list(config["recommended_roads"]),
    )
