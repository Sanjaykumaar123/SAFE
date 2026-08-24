"""GET /municipality/cities — the authorized-city switcher (section 03/14)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.city import City
from app.models.ward import Ward
from app.schemas.municipality import CityOut
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context

router = APIRouter(prefix="/cities", tags=["municipality"])


@router.get("/", response_model=list[CityOut])
async def list_authorized_cities(ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> list[CityOut]:
    if not ctx.allowed_city_ids:
        return []
    result = await db.execute(
        select(City, func.count(Ward.id)).outerjoin(Ward, Ward.city_id == City.id).where(City.id.in_(ctx.allowed_city_ids)).group_by(City.id).order_by(City.name)
    )
    return [
        CityOut(id=city.id, code=city.code or city.name[:3].upper(), name=city.name, state=city.state, center_latitude=city.center_latitude, center_longitude=city.center_longitude, ward_count=ward_count)
        for city, ward_count in result.all()
    ]
