"""POST /register, POST /login, POST /refresh, GET /me, POST /logout."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.citizen_profile import CitizenProfile
from app.models.city import City
from app.models.user import User
from app.models.user_session import UserSession
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_or_create_city(db: AsyncSession, name: str) -> City:
    result = await db.execute(select(City).where(func.lower(City.name) == name.strip().lower()))
    city = result.scalar_one_or_none()
    if city is None:
        city = City(name=name)
        db.add(city)
        await db.flush()
    return city


async def _issue_tokens(db: AsyncSession, user: User) -> TokenPair:
    access_token = create_access_token(str(user.id))
    refresh_token, jti = create_refresh_token(str(user.id))
    session = UserSession(
        user_id=user.id,
        refresh_token_jti=jti,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.commit()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


async def _user_out(db: AsyncSession, user: User) -> UserOut:
    result = await db.execute(select(CitizenProfile).where(CitizenProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    city_name = None
    if profile and profile.city_id:
        city_result = await db.execute(select(City).where(City.id == profile.city_id))
        city = city_result.scalar_one_or_none()
        city_name = city.name if city else None
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        city=city_name,
        profile_photo_url=profile.profile_photo_url if profile else None,
        role=user.role,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    if not payload.accepted_terms:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "You must accept the terms to continue.")

    existing = await db.execute(select(User).where(or_(User.email == payload.email, User.phone == payload.phone)))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email or phone already exists.")

    city = await _get_or_create_city(db, payload.city)

    user = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()

    profile = CitizenProfile(user_id=user.id, city_id=city.id)
    db.add(profile)
    await db.flush()

    tokens = await _issue_tokens(db, user)
    user_out = await _user_out(db, user)
    return AuthResponse(user=user_out, tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    result = await db.execute(select(User).where(or_(User.email == payload.identifier, User.phone == payload.identifier)))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email/mobile or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")

    tokens = await _issue_tokens(db, user)
    user_out = await _user_out(db, user)
    return AuthResponse(user=user_out, tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token.")
    try:
        decoded = decode_token(payload.refresh_token)
    except JWTError:
        raise invalid
    if decoded.get("type") != "refresh":
        raise invalid

    jti = decoded.get("jti")
    result = await db.execute(select(UserSession).where(UserSession.refresh_token_jti == jti))
    session = result.scalar_one_or_none()
    if session is None or session.is_revoked or session.expires_at < datetime.now(timezone.utc):
        raise invalid

    user_result = await db.execute(select(User).where(User.id == uuid.UUID(decoded["sub"])))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise invalid

    # Rotate: revoke the old refresh token, issue a fresh pair.
    session.is_revoked = True
    tokens = await _issue_tokens(db, user)
    return tokens


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserOut:
    return await _user_out(db, current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> None:
    try:
        decoded = decode_token(payload.refresh_token)
    except JWTError:
        return None
    jti = decoded.get("jti")
    result = await db.execute(select(UserSession).where(UserSession.refresh_token_jti == jti))
    session = result.scalar_one_or_none()
    if session is not None:
        session.is_revoked = True
        await db.commit()
    return None
