"""
Turns ORM rows into the Municipality API's response shapes. Kept separate
from the route handlers (same split as `app/schemas/hazard.py::build_hazard_out`
for the citizen app) so "how a hazard looks to a municipality officer" has
exactly one implementation, reused by the list, detail, dashboard, and
search endpoints.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.citizen_report import CitizenReport
from app.models.enums import OPEN_REPAIR_STATUSES
from app.models.fleet_observation import FleetObservation
from app.models.hazard import Hazard
from app.models.repair import Repair
from app.models.ward import Ward
from app.schemas.municipality import CurrentRepairSummaryOut, MunicipalityHazardOut


def display_hazard_code(hazard: Hazard) -> str:
    """Falls back to a short, stable, id-derived label when
    `hazard.hazard_code` wasn't set (see the field's docstring on
    `app/models/hazard.py`) — the municipality UI always has *something*
    citable, never a raw UUID."""
    return hazard.hazard_code or f"HZD-{str(hazard.id).split('-')[0].upper()}"


async def bulk_source_summaries(db: AsyncSession, hazard_ids: list[uuid.UUID]) -> dict[uuid.UUID, str]:
    """One query per evidence table instead of N+1 per hazard (section 57's
    "never fetch thousands then filter" principle applies to N+1 queries
    too)."""
    if not hazard_ids:
        return {}
    citizen_rows = await db.execute(select(CitizenReport.hazard_id.distinct()).where(CitizenReport.hazard_id.in_(hazard_ids)))
    has_citizen = {row[0] for row in citizen_rows.all()}
    fleet_rows = await db.execute(select(FleetObservation.hazard_id.distinct()).where(FleetObservation.hazard_id.in_(hazard_ids)))
    has_fleet = {row[0] for row in fleet_rows.all()}

    summaries: dict[uuid.UUID, str] = {}
    for hazard_id in hazard_ids:
        c, f = hazard_id in has_citizen, hazard_id in has_fleet
        if c and f:
            summaries[hazard_id] = "CITIZEN_AND_FLEET"
        elif c:
            summaries[hazard_id] = "CITIZEN"
        elif f:
            summaries[hazard_id] = "FLEET"
        else:
            summaries[hazard_id] = "MUNICIPALITY"
    return summaries


async def source_summary_for(db: AsyncSession, hazard_id: uuid.UUID) -> str:
    result = await bulk_source_summaries(db, [hazard_id])
    return result.get(hazard_id, "MUNICIPALITY")


async def bulk_current_repairs(db: AsyncSession, hazard_ids: list[uuid.UUID]) -> dict[uuid.UUID, Repair]:
    """The most recent repair per hazard, open one preferred (section 54:
    "one active repair at a time"). Returns at most one `Repair` per
    hazard_id even if history has several."""
    if not hazard_ids:
        return {}
    result = await db.execute(select(Repair).where(Repair.hazard_id.in_(hazard_ids)).order_by(Repair.created_at.desc()))
    rows = result.scalars().all()
    open_by_hazard: dict[uuid.UUID, Repair] = {}
    latest_by_hazard: dict[uuid.UUID, Repair] = {}
    for repair in rows:
        latest_by_hazard.setdefault(repair.hazard_id, repair)
        if repair.status in OPEN_REPAIR_STATUSES:
            open_by_hazard.setdefault(repair.hazard_id, repair)
    return {**latest_by_hazard, **open_by_hazard}


async def bulk_ward_names(db: AsyncSession, ward_ids: list[uuid.UUID]) -> dict[uuid.UUID, str]:
    ids = [w for w in ward_ids if w is not None]
    if not ids:
        return {}
    result = await db.execute(select(Ward.id, Ward.name).where(Ward.id.in_(ids)))
    return {row[0]: row[1] for row in result.all()}


async def build_hazard_list(db: AsyncSession, hazards: list[Hazard]) -> list[MunicipalityHazardOut]:
    hazard_ids = [h.id for h in hazards]
    ward_ids = [h.ward_id for h in hazards if h.ward_id]
    source_summaries, repairs, ward_names = (
        await bulk_source_summaries(db, hazard_ids),
        await bulk_current_repairs(db, hazard_ids),
        await bulk_ward_names(db, ward_ids),
    )
    items: list[MunicipalityHazardOut] = []
    for hazard in hazards:
        repair = repairs.get(hazard.id)
        items.append(
            MunicipalityHazardOut(
                id=hazard.id,
                hazard_code=display_hazard_code(hazard),
                type=hazard.type,
                latitude=hazard.latitude,
                longitude=hazard.longitude,
                location_text=hazard.location_text,
                road_name=hazard.road_name,
                city_id=hazard.city_id,
                ward_id=hazard.ward_id,
                ward_name=ward_names.get(hazard.ward_id) if hazard.ward_id else None,
                severity=hazard.severity,
                status=hazard.status,
                ai_confidence=hazard.ai_confidence,
                image_url=hazard.image_url,
                description=hazard.description,
                source_summary=source_summaries.get(hazard.id, "MUNICIPALITY"),
                repair_status=repair.status if repair else None,
                repair_code=repair.repair_code if repair else None,
                created_at=hazard.created_at,
                updated_at=hazard.updated_at,
                last_observed_at=hazard.last_observed_at,
            )
        )
    return items


def current_repair_summary(repair: Repair | None) -> CurrentRepairSummaryOut | None:
    if repair is None:
        return None
    return CurrentRepairSummaryOut(
        id=repair.id,
        repair_code=repair.repair_code,
        status=repair.status,
        priority=repair.priority,
        team=repair.team,
        target_date=repair.target_date,
    )
