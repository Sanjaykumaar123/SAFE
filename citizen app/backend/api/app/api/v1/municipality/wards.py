"""GET /municipality/wards — backs the ward filter (section 04/09/14/20)."""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.ward import Ward
from app.schemas.municipality import WardOut
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context, require_city_access

router = APIRouter(prefix="/wards", tags=["municipality"])


@router.get("/", response_model=list[WardOut])
async def list_wards(
    city_id: uuid.UUID = Query(...),
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> list[WardOut]:
    require_city_access(ctx, city_id)
    result = await db.execute(select(Ward).where(Ward.city_id == city_id).order_by(Ward.name))
    return [WardOut.model_validate(w) for w in result.scalars().all()]
