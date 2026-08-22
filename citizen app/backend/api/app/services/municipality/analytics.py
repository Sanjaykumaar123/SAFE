"""Section 44-47/68 — every figure here comes from a real aggregation query
against the common database; nothing is pre-baked into the mobile app."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.citizen_report import CitizenReport
from app.models.enums import ACTIVE_HAZARD_STATUSES, HazardStatus, Severity
from app.models.fleet_observation import FleetObservation
from app.models.hazard import Hazard
from app.models.repair import Repair
from app.models.ward import Ward
from app.schemas.municipality import (
    AnalyticsSummaryOut,
    FleetCoverageOut,
    RecurringHazardItemOut,
    ResolutionTrendPointOut,
    SeverityAnalyticsItemOut,
    WardAnalyticsItemOut,
)
from app.services.municipality.dashboard import ESTIMATED_KM_PER_OBSERVED_ROAD_SEGMENT

RECURRING_ROAD_MIN_REPORTS = 2
RESOLUTION_TREND_DAYS = 14


async def summary(db: AsyncSession, city_id) -> AnalyticsSummaryOut:
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)

    active_result = await db.execute(select(func.count()).select_from(Hazard).where(Hazard.city_id == city_id, Hazard.status.in_(ACTIVE_HAZARD_STATUSES)))
    critical_result = await db.execute(
        select(func.count()).select_from(Hazard).where(Hazard.city_id == city_id, Hazard.status.in_(ACTIVE_HAZARD_STATUSES), Hazard.severity == Severity.CRITICAL)
    )
    resolved_week_result = await db.execute(
        select(func.count()).select_from(Hazard).where(Hazard.city_id == city_id, Hazard.status == HazardStatus.RESOLVED, Hazard.resolved_at >= week_start)
    )

    avg_resolution_result = await db.execute(
        select(func.avg(func.extract("epoch", Hazard.resolved_at - Hazard.created_at) / 3600.0)).where(
            Hazard.city_id == city_id, Hazard.status == HazardStatus.RESOLVED, Hazard.resolved_at.is_not(None)
        )
    )
    avg_resolution_hours = avg_resolution_result.scalar_one()

    recurring_result = await db.execute(
        select(func.count()).select_from(
            select(Hazard.road_name).where(Hazard.city_id == city_id, Hazard.road_name.is_not(None)).group_by(Hazard.road_name).having(func.count() >= RECURRING_ROAD_MIN_REPORTS).subquery()
        )
    )
    recurring_roads = recurring_result.scalar_one()

    citizen_reports_result = await db.execute(
        select(func.count()).select_from(CitizenReport).join(Hazard, Hazard.id == CitizenReport.hazard_id).where(Hazard.city_id == city_id)
    )
    fleet_observations_result = await db.execute(
        select(func.count()).select_from(FleetObservation).join(Hazard, Hazard.id == FleetObservation.hazard_id).where(Hazard.city_id == city_id)
    )

    avg_turnaround_result = await db.execute(
        select(func.avg(func.extract("epoch", Repair.completed_at - Repair.created_at) / 3600.0)).where(
            Repair.city_id == city_id, Repair.completed_at.is_not(None)
        )
    )
    avg_turnaround_hours = avg_turnaround_result.scalar_one()

    return AnalyticsSummaryOut(
        active_hazards=active_result.scalar_one(),
        critical_hazards=critical_result.scalar_one(),
        resolved_this_week=resolved_week_result.scalar_one(),
        avg_resolution_time_hours=round(avg_resolution_hours, 1) if avg_resolution_hours is not None else None,
        recurring_hazard_roads=recurring_roads,
        citizen_reports_count=citizen_reports_result.scalar_one(),
        fleet_observation_count=fleet_observations_result.scalar_one(),
        avg_repair_turnaround_hours=round(avg_turnaround_hours, 1) if avg_turnaround_hours is not None else None,
    )


async def by_ward(db: AsyncSession, city_id) -> list[WardAnalyticsItemOut]:
    active_expr = func.count().filter(Hazard.status.in_(ACTIVE_HAZARD_STATUSES))
    critical_expr = func.count().filter(Hazard.status.in_(ACTIVE_HAZARD_STATUSES), Hazard.severity == Severity.CRITICAL)
    resolved_expr = func.count().filter(Hazard.status == HazardStatus.RESOLVED)

    result = await db.execute(
        select(Ward.id, Ward.name, active_expr, critical_expr, resolved_expr)
        .select_from(Ward)
        .join(Hazard, Hazard.ward_id == Ward.id, isouter=True)
        .where(Ward.city_id == city_id)
        .group_by(Ward.id, Ward.name)
        .order_by(Ward.name)
    )
    items = [
        WardAnalyticsItemOut(ward_id=ward_id, ward_name=name, active_hazards=active, critical_hazards=critical, resolved_hazards=resolved)
        for ward_id, name, active, critical, resolved in result.all()
    ]

    unassigned_result = await db.execute(
        select(active_expr, critical_expr, resolved_expr).select_from(Hazard).where(Hazard.city_id == city_id, Hazard.ward_id.is_(None))
    )
    unassigned = unassigned_result.first()
    if unassigned and any(unassigned):
        items.append(WardAnalyticsItemOut(ward_id=None, ward_name="Unassigned", active_hazards=unassigned[0], critical_hazards=unassigned[1], resolved_hazards=unassigned[2]))
    return items


async def by_severity(db: AsyncSession, city_id) -> list[SeverityAnalyticsItemOut]:
    result = await db.execute(
        select(Hazard.severity, func.count()).where(Hazard.city_id == city_id, Hazard.status.in_(ACTIVE_HAZARD_STATUSES)).group_by(Hazard.severity)
    )
    return [SeverityAnalyticsItemOut(severity=severity, count=count) for severity, count in result.all()]


async def resolution_trend(db: AsyncSession, city_id) -> list[ResolutionTrendPointOut]:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=RESOLUTION_TREND_DAYS)
    day_bucket = func.date_trunc("day", Hazard.resolved_at)
    result = await db.execute(
        select(day_bucket.label("day"), func.count())
        .where(Hazard.city_id == city_id, Hazard.status == HazardStatus.RESOLVED, Hazard.resolved_at >= since)
        .group_by(day_bucket)
        .order_by(day_bucket)
    )
    by_day = {row[0].date(): row[1] for row in result.all()}
    return [
        ResolutionTrendPointOut(date=(since + timedelta(days=i)).date(), resolved_count=by_day.get((since + timedelta(days=i)).date(), 0))
        for i in range(RESOLUTION_TREND_DAYS + 1)
    ]


async def recurring_hazards(db: AsyncSession, city_id) -> list[RecurringHazardItemOut]:
    resolved_count_expr = func.count().filter(Hazard.status == HazardStatus.RESOLVED)
    result = await db.execute(
        select(Hazard.road_name, func.count().label("report_count"), resolved_count_expr.label("resolved_count"))
        .where(Hazard.city_id == city_id, Hazard.road_name.is_not(None))
        .group_by(Hazard.road_name)
        .having(func.count() >= RECURRING_ROAD_MIN_REPORTS)
        .order_by(func.count().desc())
        .limit(20)
    )
    items = []
    for road_name, report_count, resolved_count in result.all():
        recommendation = (
            "Investigate underlying road condition — repeated failures suggest the surface repair isn't holding."
            if resolved_count >= 2
            else "Monitor for repeat reports after the next repair."
        )
        items.append(RecurringHazardItemOut(road_name=road_name, report_count=report_count, recurring_event_count=resolved_count, recommendation=recommendation))
    return items


async def fleet_coverage(db: AsyncSession, city_id) -> FleetCoverageOut:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    observed_today_result = await db.execute(
        select(func.count(func.distinct(FleetObservation.road_id))).select_from(FleetObservation).join(Hazard, Hazard.id == FleetObservation.hazard_id, isouter=True).where(
            Hazard.city_id == city_id, FleetObservation.observed_at >= today_start, FleetObservation.road_id.is_not(None)
        )
    )
    roads_observed_today = observed_today_result.scalar_one() or 0

    total_roads_result = await db.execute(select(func.count(func.distinct(Hazard.road_id))).select_from(Hazard).where(Hazard.city_id == city_id, Hazard.road_id.is_not(None)))
    total_roads = max(total_roads_result.scalar_one() or 0, roads_observed_today, 1)

    all_road_names_result = await db.execute(select(Hazard.road_name.distinct()).where(Hazard.city_id == city_id, Hazard.road_name.is_not(None)))
    all_road_names = {row[0] for row in all_road_names_result.all()}

    observed_road_names_result = await db.execute(
        select(Hazard.road_name.distinct()).select_from(FleetObservation).join(Hazard, Hazard.id == FleetObservation.hazard_id).where(
            Hazard.city_id == city_id, FleetObservation.observed_at >= today_start
        )
    )
    observed_road_names = {row[0] for row in observed_road_names_result.all() if row[0]}
    stale_roads = sorted(all_road_names - observed_road_names)[:10]

    coverage_percent = min(100, round((roads_observed_today / total_roads) * 100))

    return FleetCoverageOut(
        observed_today_km_estimate=round(roads_observed_today * ESTIMATED_KM_PER_OBSERVED_ROAD_SEGMENT, 1),
        coverage_percent=coverage_percent,
        data_gap_segments=max(total_roads - roads_observed_today, 0),
        roads_observed_today=roads_observed_today,
        total_roads_tracked=total_roads,
        stale_roads=stale_roads,
    )
