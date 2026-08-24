"""POST/GET /municipality/repairs, /{id}, /{id}/progress,
/{id}/ready-for-inspection — sections 33-37, 54."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.enums import HazardStatus, MunicipalityPermission, OPEN_REPAIR_STATUSES, RepairStatus
from app.models.hazard import Hazard
from app.models.municipality_action import MunicipalityAction
from app.models.repair import Repair
from app.models.repair_progress import RepairProgress
from app.schemas.municipality import (
    RepairCreateRequest,
    RepairDetailOut,
    RepairListResponse,
    RepairOut,
    RepairProgressCreateRequest,
    RepairProgressOut,
)
from app.services.municipality.audit import log_action
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context, require_city_access, require_permission
from app.services.municipality.codes import generate_repair_code
from app.services.municipality.labels import label_for

router = APIRouter(prefix="/repairs", tags=["municipality"])


def _repair_out(repair: Repair, hazard: Hazard | None = None) -> RepairOut:
    return RepairOut(
        id=repair.id,
        repair_code=repair.repair_code,
        hazard_id=repair.hazard_id,
        hazard_road_name=hazard.road_name if hazard else None,
        hazard_location_text=hazard.location_text if hazard else None,
        city_id=repair.city_id,
        department=repair.department,
        zone=repair.zone,
        team=repair.team,
        assigned_officer_name=repair.assigned_officer_name,
        priority=repair.priority,
        target_date=repair.target_date,
        status=repair.status,
        notes=repair.notes,
        started_at=repair.started_at,
        completed_at=repair.completed_at,
        created_at=repair.created_at,
        updated_at=repair.updated_at,
    )


async def _get_authorized_hazard(db: AsyncSession, ctx: MunicipalityContext, hazard_id: uuid.UUID) -> Hazard:
    result = await db.execute(select(Hazard).where(Hazard.id == hazard_id))
    hazard = result.scalar_one_or_none()
    if hazard is None or hazard.city_id is None or hazard.city_id not in ctx.allowed_city_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hazard not found.")
    return hazard


async def _get_authorized_repair(db: AsyncSession, ctx: MunicipalityContext, repair_id: uuid.UUID) -> Repair:
    result = await db.execute(select(Repair).where(Repair.id == repair_id))
    repair = result.scalar_one_or_none()
    if repair is None or repair.city_id not in ctx.allowed_city_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Repair not found.")
    return repair


@router.post("/", response_model=RepairOut, status_code=status.HTTP_201_CREATED)
async def assign_repair(
    payload: RepairCreateRequest,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> RepairOut:
    require_permission(ctx, MunicipalityPermission.ASSIGN_REPAIR.value)
    hazard = await _get_authorized_hazard(db, ctx, payload.hazard_id)

    if hazard.status in (HazardStatus.RESOLVED, HazardStatus.REJECTED, HazardStatus.DUPLICATE):
        raise HTTPException(status.HTTP_409_CONFLICT, "This hazard is not in a state that can be assigned for repair.")

    existing_open = await db.execute(
        select(Repair.id).where(Repair.hazard_id == hazard.id, Repair.status.in_(OPEN_REPAIR_STATUSES))
    )
    if existing_open.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This hazard already has an active repair in progress.")

    repair_code = await generate_repair_code(db)
    from_status = hazard.status
    repair = Repair(
        repair_code=repair_code,
        hazard_id=hazard.id,
        city_id=hazard.city_id,
        municipality_id=ctx.municipality.id,
        department=payload.department,
        zone=payload.zone,
        team=payload.team,
        assigned_officer_name=payload.assigned_officer_name,
        priority=payload.priority,
        target_date=payload.target_date,
        status=RepairStatus.ASSIGNED,
        notes=payload.notes,
        created_by=ctx.user.id,
    )
    db.add(repair)

    # Section 32/43 — coarse citizen-facing status only; UNDER_REPAIR is the
    # existing citizen-app-recognized status, so an assigned repair keeps
    # showing correctly on the citizen map/report timeline unchanged. Repair
    # workflow detail (assigned/in-progress/ready-for-inspection) lives on
    # `repairs.status`, never overloaded onto `hazards.status` — see the
    # comment on `HazardStatus.REOPENED`.
    hazard.status = HazardStatus.UNDER_REPAIR
    hazard.municipality_status = "REPAIR_ASSIGNED"

    await db.flush()
    db.add(
        MunicipalityAction(
            hazard_id=hazard.id, action_type="REPAIR_ASSIGNED", notes=payload.notes,
            performed_by=ctx.user.full_name, performed_by_user_id=ctx.user.id,
            from_status=from_status, to_status=HazardStatus.UNDER_REPAIR.value,
            action_metadata={"repair_id": str(repair.id), "repair_code": repair.repair_code, "team": payload.team},
        )
    )
    await log_action(
        db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=hazard.city_id,
        action="ASSIGN_REPAIR", entity_type="repair", entity_id=repair.id,
    )
    await db.commit()
    await db.refresh(repair)
    return _repair_out(repair, hazard)


@router.get("/", response_model=RepairListResponse)
async def list_repairs(
    city_id: uuid.UUID = Query(...),
    status_filter: str | None = Query(None, alias="status", description="Comma-separated RepairStatus values"),
    hazard_id: uuid.UUID | None = Query(None),
    limit: int = Query(100, gt=0, le=500),
    offset: int = Query(0, ge=0),
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> RepairListResponse:
    require_city_access(ctx, city_id)

    stmt = select(Repair, Hazard).join(Hazard, Hazard.id == Repair.hazard_id).where(Repair.city_id == city_id)
    if status_filter:
        statuses = [s.strip().upper() for s in status_filter.split(",") if s.strip()]
        stmt = stmt.where(Repair.status.in_(statuses))
    if hazard_id is not None:
        stmt = stmt.where(Repair.hazard_id == hazard_id)
    stmt = stmt.order_by(Repair.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()
    items = [_repair_out(repair, hazard) for repair, hazard in rows]
    return RepairListResponse(items=items, total=len(items))


@router.get("/{repair_id}", response_model=RepairDetailOut)
async def get_repair_detail(
    repair_id: uuid.UUID,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> RepairDetailOut:
    repair = await _get_authorized_repair(db, ctx, repair_id)
    hazard_result = await db.execute(select(Hazard).where(Hazard.id == repair.hazard_id))
    hazard = hazard_result.scalar_one_or_none()

    progress_result = await db.execute(select(RepairProgress).where(RepairProgress.repair_id == repair.id).order_by(RepairProgress.created_at.asc()))
    progress_entries = [
        RepairProgressOut(
            id=p.id, note=p.note, photo_url=p.photo_url, latitude=p.latitude, longitude=p.longitude,
            created_by_name=p.created_by_name, created_at=p.created_at,
        )
        for p in progress_result.scalars().all()
    ]

    timeline_events = []
    if hazard is not None:
        actions_result = await db.execute(select(MunicipalityAction).where(MunicipalityAction.hazard_id == hazard.id).order_by(MunicipalityAction.created_at.asc()))
        from app.schemas.municipality import TimelineEventOut

        timeline_events = [
            TimelineEventOut(id=a.id, label=label_for(a.action_type), detail=a.notes, from_status=a.from_status, to_status=a.to_status, actor=a.performed_by, created_at=a.created_at)
            for a in actions_result.scalars().all()
        ]

    base = _repair_out(repair, hazard)
    return RepairDetailOut(**base.model_dump(), progress_entries=progress_entries, timeline=timeline_events)


@router.post("/{repair_id}/progress", response_model=RepairProgressOut, status_code=status.HTTP_201_CREATED)
async def add_repair_progress(
    repair_id: uuid.UUID,
    payload: RepairProgressCreateRequest,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> RepairProgressOut:
    """Section 37 — additive only; never overwrites the original hazard
    evidence or a prior progress entry."""
    require_permission(ctx, MunicipalityPermission.UPDATE_REPAIR.value)
    repair = await _get_authorized_repair(db, ctx, repair_id)
    if repair.status == RepairStatus.RESOLVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "This repair is already resolved.")

    progress = RepairProgress(
        repair_id=repair.id, note=payload.note, photo_url=payload.photo_url,
        latitude=payload.latitude, longitude=payload.longitude,
        created_by=ctx.user.id, created_by_name=ctx.user.full_name,
    )
    db.add(progress)

    if repair.status in (RepairStatus.ASSIGNED, RepairStatus.REWORK_REQUIRED):
        repair.status = RepairStatus.IN_PROGRESS
    if repair.started_at is None:
        repair.started_at = datetime.now(timezone.utc)

    db.add(
        MunicipalityAction(
            hazard_id=repair.hazard_id, action_type="REPAIR_PROGRESS", notes=payload.note,
            performed_by=ctx.user.full_name, performed_by_user_id=ctx.user.id,
            action_metadata={"repair_id": str(repair.id), "photo_url": payload.photo_url},
        )
    )
    await log_action(db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=repair.city_id, action="REPAIR_PROGRESS", entity_type="repair", entity_id=repair.id)
    await db.commit()
    await db.refresh(progress)
    return RepairProgressOut(
        id=progress.id, note=progress.note, photo_url=progress.photo_url, latitude=progress.latitude,
        longitude=progress.longitude, created_by_name=progress.created_by_name, created_at=progress.created_at,
    )


@router.post("/{repair_id}/ready-for-inspection", response_model=RepairOut)
async def mark_ready_for_inspection(
    repair_id: uuid.UUID,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> RepairOut:
    require_permission(ctx, MunicipalityPermission.UPDATE_REPAIR.value)
    repair = await _get_authorized_repair(db, ctx, repair_id)
    if repair.status not in (RepairStatus.ASSIGNED, RepairStatus.IN_PROGRESS, RepairStatus.REWORK_REQUIRED):
        raise HTTPException(status.HTTP_409_CONFLICT, "This repair cannot be marked ready for inspection from its current status.")

    from_status = repair.status
    repair.status = RepairStatus.READY_FOR_INSPECTION

    db.add(
        MunicipalityAction(
            hazard_id=repair.hazard_id, action_type="READY_FOR_INSPECTION", notes=None,
            performed_by=ctx.user.full_name, performed_by_user_id=ctx.user.id,
            action_metadata={"repair_id": str(repair.id), "from_repair_status": from_status.value if hasattr(from_status, "value") else from_status},
        )
    )
    await log_action(db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=repair.city_id, action="READY_FOR_INSPECTION", entity_type="repair", entity_id=repair.id)
    await db.commit()
    await db.refresh(repair)

    hazard_result = await db.execute(select(Hazard).where(Hazard.id == repair.hazard_id))
    return _repair_out(repair, hazard_result.scalar_one_or_none())
