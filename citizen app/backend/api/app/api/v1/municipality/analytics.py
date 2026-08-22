"""GET /municipality/analytics/* — sections 44-47/68. Every figure comes
from a real aggregation query (see app/services/municipality/analytics.py);
nothing here is calculated from mobile-cached data."""
import uuid

from fastapi import APIRouter, Depends, Query

from app.db.session import get_db
from app.schemas.municipality import (
    AnalyticsSummaryOut,
    FleetCoverageOut,
    RecurringHazardItemOut,
    ResolutionTrendPointOut,
    SeverityAnalyticsItemOut,
    WardAnalyticsItemOut,
)
from app.services.municipality import analytics as analytics_service
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context, require_city_access, require_permission
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.enums import MunicipalityPermission

router = APIRouter(prefix="/analytics", tags=["municipality"])


def _authorize(ctx: MunicipalityContext, city_id: uuid.UUID) -> None:
    require_permission(ctx, MunicipalityPermission.VIEW_ANALYTICS.value)
    require_city_access(ctx, city_id)


@router.get("/summary", response_model=AnalyticsSummaryOut)
async def analytics_summary(city_id: uuid.UUID = Query(...), ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> AnalyticsSummaryOut:
    _authorize(ctx, city_id)
    return await analytics_service.summary(db, city_id)


@router.get("/wards", response_model=list[WardAnalyticsItemOut])
async def analytics_wards(city_id: uuid.UUID = Query(...), ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> list[WardAnalyticsItemOut]:
    _authorize(ctx, city_id)
    return await analytics_service.by_ward(db, city_id)


@router.get("/severity", response_model=list[SeverityAnalyticsItemOut])
async def analytics_severity(city_id: uuid.UUID = Query(...), ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> list[SeverityAnalyticsItemOut]:
    _authorize(ctx, city_id)
    return await analytics_service.by_severity(db, city_id)


@router.get("/resolution", response_model=list[ResolutionTrendPointOut])
async def analytics_resolution(city_id: uuid.UUID = Query(...), ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> list[ResolutionTrendPointOut]:
    _authorize(ctx, city_id)
    return await analytics_service.resolution_trend(db, city_id)


@router.get("/recurring", response_model=list[RecurringHazardItemOut])
async def analytics_recurring(city_id: uuid.UUID = Query(...), ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> list[RecurringHazardItemOut]:
    _authorize(ctx, city_id)
    return await analytics_service.recurring_hazards(db, city_id)


@router.get("/coverage", response_model=FleetCoverageOut)
async def analytics_coverage(city_id: uuid.UUID = Query(...), ctx: MunicipalityContext = Depends(get_municipality_context), db: AsyncSession = Depends(get_db)) -> FleetCoverageOut:
    _authorize(ctx, city_id)
    return await analytics_service.fleet_coverage(db, city_id)
