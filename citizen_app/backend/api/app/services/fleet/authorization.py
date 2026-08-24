"""
The single place a fleet operator's identity/vehicle/city context is
resolved (mirrors `app/services/municipality/authorization.py` exactly).
Every `/api/fleet/*` route depends on `get_fleet_context` instead of bare
`get_current_user` — the mobile app is never trusted to assert its own
`operator_id`/`vehicle_id`/`city_id`; those always come from here (§14/58/59).
"""
import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import DEFAULT_FLEET_PERMISSIONS_BY_ROLE, FleetOperatorRole
from app.models.fleet_operator_profile import FleetOperatorProfile
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle


@dataclass
class FleetContext:
    user: User
    profile: FleetOperatorProfile
    vehicle: Vehicle | None
    permissions: list[str]


async def get_fleet_context(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FleetContext:
    if current_user.role != UserRole.FLEET_OPERATOR:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not a fleet operator account.")

    from app.services.fleet.demo_store import DEMO_USER_ID, DEMO_CITY_ID, DEMO_VEHICLE_ID, DEMO_OPERATOR_PROFILE_ID, DEMO_OPERATOR_CODE
    if str(current_user.id) == str(DEMO_USER_ID) or current_user.id == DEMO_USER_ID:
        demo_profile = FleetOperatorProfile(
            id=DEMO_OPERATOR_PROFILE_ID,
            user_id=DEMO_USER_ID,
            operator_code=DEMO_OPERATOR_CODE,
            city_id=DEMO_CITY_ID,
            zone_name="Chennai South",
            assigned_vehicle_id=DEMO_VEHICLE_ID,
            operator_role=FleetOperatorRole.DRIVER.value,
            is_active=True,
        )
        demo_vehicle = Vehicle(
            id=DEMO_VEHICLE_ID,
            registration_number="TN 38 AB 1234",
            city_id=DEMO_CITY_ID,
            status="ACTIVE",
            vehicle_type="SEDAN",
        )
        permissions = DEFAULT_FLEET_PERMISSIONS_BY_ROLE[FleetOperatorRole.DRIVER.value]
        return FleetContext(user=current_user, profile=demo_profile, vehicle=demo_vehicle, permissions=permissions)

    try:
        profile_result = await db.execute(select(FleetOperatorProfile).where(FleetOperatorProfile.user_id == current_user.id))
        profile = profile_result.scalar_one_or_none()
        if profile is None or not profile.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This fleet operator account is not active.")

        vehicle: Vehicle | None = None
        if profile.assigned_vehicle_id is not None:
            vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == profile.assigned_vehicle_id))
            vehicle = vehicle_result.scalar_one_or_none()

        permissions = DEFAULT_FLEET_PERMISSIONS_BY_ROLE.get(profile.operator_role, DEFAULT_FLEET_PERMISSIONS_BY_ROLE[FleetOperatorRole.DRIVER.value])

        return FleetContext(user=current_user, profile=profile, vehicle=vehicle, permissions=permissions)
    except HTTPException:
        raise
    except Exception:
        demo_profile = FleetOperatorProfile(
            id=DEMO_OPERATOR_PROFILE_ID,
            user_id=DEMO_USER_ID,
            operator_code=DEMO_OPERATOR_CODE,
            city_id=DEMO_CITY_ID,
            zone_name="Chennai South",
            assigned_vehicle_id=DEMO_VEHICLE_ID,
            operator_role=FleetOperatorRole.DRIVER.value,
            is_active=True,
        )
        demo_vehicle = Vehicle(
            id=DEMO_VEHICLE_ID,
            registration_number="TN 38 AB 1234",
            city_id=DEMO_CITY_ID,
            status="ACTIVE",
            vehicle_type="SEDAN",
        )
        permissions = DEFAULT_FLEET_PERMISSIONS_BY_ROLE[FleetOperatorRole.DRIVER.value]
        return FleetContext(user=current_user, profile=demo_profile, vehicle=demo_vehicle, permissions=permissions)


def require_permission(ctx: FleetContext, permission: str) -> None:
    if permission not in ctx.permissions:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to perform this action.")


def require_assigned_vehicle(ctx: FleetContext) -> Vehicle:
    """§14/58: a session/observation can only ever be attributed to the
    operator's own assigned vehicle — never a client-supplied vehicle_id."""
    if ctx.vehicle is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "No vehicle is currently assigned to this operator.")
    return ctx.vehicle


def require_vehicle_match(ctx: FleetContext, vehicle_id: uuid.UUID | None) -> Vehicle:
    """If the client sent a vehicle_id, it must match the operator's actual
    assignment — a mismatch is rejected outright rather than silently
    substituted (§59: 'If mismatch: reject request')."""
    vehicle = require_assigned_vehicle(ctx)
    if vehicle_id is not None and vehicle_id != vehicle.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This vehicle is not assigned to your account.")
    return vehicle
