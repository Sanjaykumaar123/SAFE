"""POST /fleet/auth/login — the Fleet Operator app's own login (§15:
"Operator ID, Password"). Token refresh/logout are role-agnostic and
already handled by the existing `/api/auth/refresh` and `/api/auth/logout`
— the fleet mobile client calls those directly, same as municipality."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.db.session import get_db
from app.models.city import City
from app.models.fleet_operator_profile import FleetOperatorProfile
from app.models.user import User, UserRole
from app.models.user_session import UserSession
from app.models.vehicle import Vehicle
from app.schemas.fleet import FleetAuthResponse, FleetLoginRequest, TokenPair
from app.services.fleet.serializers import build_fleet_operator_out

router = APIRouter(prefix="/auth", tags=["fleet-auth"])

INVALID_CREDENTIALS = "Incorrect operator ID or password."


@router.post("/login", response_model=FleetAuthResponse)
async def fleet_login(payload: FleetLoginRequest, db: AsyncSession = Depends(get_db)) -> FleetAuthResponse:
    profile_result = await db.execute(select(FleetOperatorProfile).where(FleetOperatorProfile.operator_code == payload.operator_code.strip().upper()))
    profile = profile_result.scalar_one_or_none()
    if profile is None or not profile.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)

    user_result = await db.execute(select(User).where(User.id == profile.user_id, User.role == UserRole.FLEET_OPERATOR))
    user = user_result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")

    access_token = create_access_token(str(user.id))
    refresh_token, jti = create_refresh_token(str(user.id))
    db.add(
        UserSession(
            user_id=user.id,
            refresh_token_jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )

    city: City | None = None
    if profile.city_id is not None:
        city_result = await db.execute(select(City).where(City.id == profile.city_id))
        city = city_result.scalar_one_or_none()

    vehicle: Vehicle | None = None
    if profile.assigned_vehicle_id is not None:
        vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == profile.assigned_vehicle_id))
        vehicle = vehicle_result.scalar_one_or_none()

    await db.commit()

    operator = build_fleet_operator_out(user, profile, city, vehicle)
    return FleetAuthResponse(operator=operator, tokens=TokenPair(access_token=access_token, refresh_token=refresh_token))
