"""
The single place a municipality officer's city access is checked
(section 04/52). Every `/api/municipality/*` route that touches a `city_id`
calls `require_city_access` — the mobile app is never trusted to only ask
for cities it's allowed to see.
"""
import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import DEFAULT_PERMISSIONS_BY_ROLE, MunicipalityOfficerRole
from app.models.municipality import Municipality, MunicipalityCityAccess
from app.models.municipality_profile import MunicipalityProfile
from app.models.user import User, UserRole


@dataclass
class MunicipalityContext:
    user: User
    profile: MunicipalityProfile
    municipality: Municipality
    allowed_city_ids: list[uuid.UUID]
    permissions: list[str]


async def get_municipality_context(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MunicipalityContext:
    """FastAPI dependency every municipality route depends on instead of
    bare `get_current_user` — resolves role + municipality + authorized
    cities + permissions in one place."""
    if current_user.role != UserRole.MUNICIPALITY:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not a municipality account.")

    profile_result = await db.execute(select(MunicipalityProfile).where(MunicipalityProfile.user_id == current_user.id))
    profile = profile_result.scalar_one_or_none()
    if profile is None or not profile.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This municipality account is not active.")

    municipality_result = await db.execute(select(Municipality).where(Municipality.id == profile.municipality_id))
    municipality = municipality_result.scalar_one_or_none()
    if municipality is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Municipality not found for this account.")

    access_result = await db.execute(select(MunicipalityCityAccess.city_id).where(MunicipalityCityAccess.municipality_id == municipality.id))
    allowed_city_ids = [row[0] for row in access_result.all()]

    permissions = DEFAULT_PERMISSIONS_BY_ROLE.get(profile.officer_role, DEFAULT_PERMISSIONS_BY_ROLE[MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value])

    return MunicipalityContext(
        user=current_user,
        profile=profile,
        municipality=municipality,
        allowed_city_ids=allowed_city_ids,
        permissions=permissions,
    )


def require_city_access(ctx: MunicipalityContext, city_id: uuid.UUID) -> None:
    """Section 52's exact example: `GET /hazards?city_id=CBE` from a Chennai
    officer must be rejected — never silently filtered, never trusted from
    the client."""
    if city_id not in ctx.allowed_city_ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to access this city.")


def require_permission(ctx: MunicipalityContext, permission: str) -> None:
    if permission not in ctx.permissions:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to perform this action.")


def default_city_id(ctx: MunicipalityContext) -> uuid.UUID:
    if ctx.profile.default_city_id and ctx.profile.default_city_id in ctx.allowed_city_ids:
        return ctx.profile.default_city_id
    if not ctx.allowed_city_ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No city is authorized for this account.")
    return ctx.allowed_city_ids[0]
