"""POST /municipality/auth/login — the Municipality app's own login (section
08: "Municipality ID, Official email, Password"). Token refresh/logout are
role-agnostic and already handled by the existing `/api/auth/refresh` and
`/api/auth/logout` — the municipality mobile client calls those directly
(see docs/architecture.md)."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.db.session import get_db
from app.models.enums import DEFAULT_PERMISSIONS_BY_ROLE, MunicipalityOfficerRole
from app.models.municipality import Municipality, MunicipalityCityAccess
from app.models.municipality_profile import MunicipalityProfile
from app.models.user import User, UserRole
from app.models.user_session import UserSession
from app.schemas.municipality import MunicipalityAuthResponse, MunicipalityLoginRequest, MunicipalityOfficerOut, TokenPair

router = APIRouter(prefix="/auth", tags=["municipality-auth"])

INVALID_CREDENTIALS = "Incorrect municipality ID, email, or password."


@router.post("/login", response_model=MunicipalityAuthResponse)
async def municipality_login(payload: MunicipalityLoginRequest, db: AsyncSession = Depends(get_db)) -> MunicipalityAuthResponse:
    municipality_result = await db.execute(select(Municipality).where(Municipality.code == payload.municipality_code.strip().upper()))
    municipality = municipality_result.scalar_one_or_none()
    if municipality is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)

    user_result = await db.execute(select(User).where(User.email == payload.email, User.role == UserRole.MUNICIPALITY))
    user = user_result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")

    profile_result = await db.execute(select(MunicipalityProfile).where(MunicipalityProfile.user_id == user.id))
    profile = profile_result.scalar_one_or_none()
    if profile is None or profile.municipality_id != municipality.id or not profile.is_active:
        # Same generic message as any other credential mismatch — never
        # confirm which piece (municipality ID vs. email) was wrong.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)

    access_token = create_access_token(str(user.id))
    refresh_token, jti = create_refresh_token(str(user.id))
    db.add(
        UserSession(
            user_id=user.id,
            refresh_token_jti=jti,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )

    access_result = await db.execute(select(MunicipalityCityAccess.city_id).where(MunicipalityCityAccess.municipality_id == municipality.id))
    allowed_city_ids = [row[0] for row in access_result.all()]

    await db.commit()

    officer = MunicipalityOfficerOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        officer_role=profile.officer_role,
        municipality_id=municipality.id,
        municipality_code=municipality.code,
        municipality_name=municipality.name,
        allowed_city_ids=allowed_city_ids,
        default_city_id=profile.default_city_id,
        ward_ids=profile.ward_ids,
        permissions=DEFAULT_PERMISSIONS_BY_ROLE.get(profile.officer_role, DEFAULT_PERMISSIONS_BY_ROLE[MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value]),
    )
    return MunicipalityAuthResponse(officer=officer, tokens=TokenPair(access_token=access_token, refresh_token=refresh_token))
