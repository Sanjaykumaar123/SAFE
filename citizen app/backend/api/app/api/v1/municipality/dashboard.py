"""GET /municipality/dashboard — section 15/16."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.city import City
from app.schemas.municipality import DashboardOut
from app.services.municipality import dashboard as dashboard_service
from app.services.municipality.authorization import MunicipalityContext, default_city_id, get_municipality_context, require_city_access

router = APIRouter(prefix="/dashboard", tags=["municipality"])


@router.get("/", response_model=DashboardOut)
async def get_dashboard(
    city_id: uuid.UUID | None = Query(None),
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> DashboardOut:
    resolved_city_id = city_id or default_city_id(ctx)
    require_city_access(ctx, resolved_city_id)

    result = await db.execute(select(City).where(City.id == resolved_city_id))
    city = result.scalar_one_or_none()
    if city is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "City not found.")

    return await dashboard_service.build_dashboard(db, city)
