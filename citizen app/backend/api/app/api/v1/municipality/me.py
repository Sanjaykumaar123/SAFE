"""GET /municipality/me — section 13: officer + municipality + authorized
cities + permissions, the app's operational-context bootstrap call."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.city import City
from app.models.ward import Ward
from app.schemas.municipality import CityOut, MunicipalityMeResponse, MunicipalityOfficerOut
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context

router = APIRouter(prefix="/me", tags=["municipality"])


@router.get("/", response_model=MunicipalityMeResponse)
async def municipality_me(ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> MunicipalityMeResponse:
    officer = MunicipalityOfficerOut(
        id=ctx.user.id,
        full_name=ctx.user.full_name,
        email=ctx.user.email,
        officer_role=ctx.profile.officer_role,
        municipality_id=ctx.municipality.id,
        municipality_code=ctx.municipality.code,
        municipality_name=ctx.municipality.name,
        allowed_city_ids=ctx.allowed_city_ids,
        default_city_id=ctx.profile.default_city_id,
        ward_ids=ctx.profile.ward_ids,
        permissions=ctx.permissions,
    )

    cities: list[CityOut] = []
    if ctx.allowed_city_ids:
        result = await db.execute(
            select(City, func.count(Ward.id)).outerjoin(Ward, Ward.city_id == City.id).where(City.id.in_(ctx.allowed_city_ids)).group_by(City.id)
        )
        for city, ward_count in result.all():
            cities.append(CityOut(id=city.id, code=city.code or city.name[:3].upper(), name=city.name, state=city.state, center_latitude=city.center_latitude, center_longitude=city.center_longitude, ward_count=ward_count))

    return MunicipalityMeResponse(officer=officer, authorized_cities=cities)
