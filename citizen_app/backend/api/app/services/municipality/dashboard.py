"""Section 15/16 — one aggregated query set behind `GET
/municipality/dashboard`, so the mobile app never assembles the dashboard
from several unrelated calls (section 15's explicit instruction)."""
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.city import City
from app.models.enums import ACTIVE_HAZARD_STATUSES, HazardStatus, OPEN_REPAIR_STATUSES, Severity
from app.models.fleet_observation import FleetObservation
from app.models.hazard import Hazard
from app.models.municipality_action import MunicipalityAction
from app.models.repair import Repair
from app.schemas.municipality import DashboardOut, FleetCoverageSummaryOut, PriorityRoadOut, RecentActivityItemOut
from app.services.municipality.labels import label_for

# Rough placeholder for "km observed" until the Fleet Operator app supplies
# real route geometry — documented, derived from real observation counts
# (never a hardcoded UI number), see section 84's "not hardcoded once API
# mode is enabled" rule.
ESTIMATED_KM_PER_OBSERVED_ROAD_SEGMENT = 0.6


async def build_dashboard(db: AsyncSession, city: City) -> DashboardOut:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    active_result = await db.execute(
        select(func.count()).select_from(Hazard).where(Hazard.city_id == city.id, Hazard.status.in_(ACTIVE_HAZARD_STATUSES))
    )
    active_hazards = active_result.scalar_one()

    critical_result = await db.execute(
        select(func.count()).select_from(Hazard).where(
            Hazard.city_id == city.id, Hazard.status.in_(ACTIVE_HAZARD_STATUSES), Hazard.severity == Severity.CRITICAL
        )
    )
    critical_hazards = critical_result.scalar_one()

    under_repair_result = await db.execute(
        select(func.count()).select_from(Repair).where(Repair.city_id == city.id, Repair.status.in_(OPEN_REPAIR_STATUSES))
    )
    under_repair = under_repair_result.scalar_one()

    resolved_today_result = await db.execute(
        select(func.count()).select_from(Hazard).where(
            Hazard.city_id == city.id, Hazard.status == HazardStatus.RESOLVED, Hazard.resolved_at >= today_start
        )
    )
    resolved_today = resolved_today_result.scalar_one()

    priority_roads = await _priority_roads(db, city.id)
    recent_activity = await _recent_activity(db, city.id)
    fleet_coverage = await _fleet_coverage(db, city.id)

    return DashboardOut(
        city_id=city.id,
        city_name=city.name,
        active_hazards=active_hazards,
        critical_hazards=critical_hazards,
        under_repair=under_repair,
        resolved_today=resolved_today,
        priority_roads=priority_roads,
        recent_activity=recent_activity,
        fleet_coverage=fleet_coverage,
        generated_at=now,
    )


async def _priority_roads(db: AsyncSession, city_id) -> list[PriorityRoadOut]:
    result = await db.execute(
        select(
            Hazard.road_name,
            func.count().label("active_count"),
            func.count().filter(Hazard.severity == Severity.CRITICAL).label("critical_count"),
        )
        .where(Hazard.city_id == city_id, Hazard.status.in_(ACTIVE_HAZARD_STATUSES), Hazard.road_name.is_not(None))
        .group_by(Hazard.road_name)
        .order_by(func.count().filter(Hazard.severity == Severity.CRITICAL).desc(), func.count().desc())
        .limit(5)
    )
    roads: list[PriorityRoadOut] = []
    for road_name, active_count, critical_count in result.all():
        if critical_count >= 2:
            priority = Severity.CRITICAL
        elif critical_count >= 1 or active_count >= 3:
            priority = Severity.HIGH
        elif active_count >= 1:
            priority = Severity.MEDIUM
        else:
            priority = Severity.LOW
        reason_parts = []
        if critical_count:
            reason_parts.append(f"{critical_count} critical hazard{'s' if critical_count != 1 else ''}")
        reason_parts.append(f"{active_count} active hazard{'s' if active_count != 1 else ''}")
        roads.append(
            PriorityRoadOut(
                road_name=road_name,
                priority=priority,
                active_hazard_count=active_count,
                critical_hazard_count=critical_count,
                reason=", ".join(reason_parts),
            )
        )
    return roads


async def _recent_activity(db: AsyncSession, city_id) -> list[RecentActivityItemOut]:
    result = await db.execute(
        select(MunicipalityAction, Hazard.id)
        .join(Hazard, Hazard.id == MunicipalityAction.hazard_id)
        .where(Hazard.city_id == city_id)
        .order_by(MunicipalityAction.created_at.desc())
        .limit(10)
    )
    items: list[RecentActivityItemOut] = []
    for action, hazard_id in result.all():
        items.append(
            RecentActivityItemOut(
                id=action.id,
                label=label_for(action.action_type),
                detail=action.notes,
                hazard_id=hazard_id,
                created_at=action.created_at,
            )
        )
    return items


async def _fleet_coverage(db: AsyncSession, city_id) -> FleetCoverageSummaryOut:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # A fleet observation isn't directly city-scoped (the Fleet app doesn't
    # exist yet to assign one at ingest time), so scope through the hazard
    # or road it's linked to, same as everywhere else in this module.
    distinct_roads_result = await db.execute(
        select(func.count(func.distinct(FleetObservation.road_id))).select_from(FleetObservation).join(
            Hazard, Hazard.id == FleetObservation.hazard_id, isouter=True
        ).where(Hazard.city_id == city_id, FleetObservation.observed_at >= today_start, FleetObservation.road_id.is_not(None))
    )
    roads_observed_today = distinct_roads_result.scalar_one() or 0

    total_roads_result = await db.execute(
        select(func.count(func.distinct(Hazard.road_id))).select_from(Hazard).where(Hazard.city_id == city_id, Hazard.road_id.is_not(None))
    )
    total_roads_tracked = max(total_roads_result.scalar_one() or 0, roads_observed_today, 1)

    coverage_percent = min(100, round((roads_observed_today / total_roads_tracked) * 100))
    data_gap_segments = max(total_roads_tracked - roads_observed_today, 0)

    return FleetCoverageSummaryOut(
        observed_today_km_estimate=round(roads_observed_today * ESTIMATED_KM_PER_OBSERVED_ROAD_SEGMENT, 1),
        coverage_percent=coverage_percent,
        data_gap_segments=data_gap_segments,
    )
