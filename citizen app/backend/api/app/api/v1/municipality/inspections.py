"""POST/GET /municipality/inspections — section 38/51."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.enums import InspectionDecision, MunicipalityPermission, RepairStatus
from app.models.hazard import Hazard
from app.models.inspection import Inspection
from app.models.municipality_action import MunicipalityAction
from app.models.repair import Repair
from app.schemas.municipality import InspectionDecisionRequest, InspectionOut
from app.services.municipality.audit import log_action
from app.services.municipality.authorization import MunicipalityContext, get_municipality_context, require_permission

router = APIRouter(prefix="/inspections", tags=["municipality"])


class InspectionCreateRequest(InspectionDecisionRequest):
    repair_id: uuid.UUID


@router.post("/", response_model=InspectionOut, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreateRequest,
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> InspectionOut:
    """Section 38 — approve closes out the repair (the separate `POST
    /municipality/hazards/{id}/resolve` call, section 39, is what then
    flips the hazard itself to RESOLVED with its own required evidence);
    reject sends the repair back for rework."""
    require_permission(ctx, MunicipalityPermission.INSPECT_HAZARD.value)

    result = await db.execute(select(Repair).where(Repair.id == payload.repair_id))
    repair = result.scalar_one_or_none()
    if repair is None or repair.city_id not in ctx.allowed_city_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Repair not found.")
    if repair.status != RepairStatus.READY_FOR_INSPECTION:
        raise HTTPException(status.HTTP_409_CONFLICT, "This repair is not marked ready for inspection.")

    inspection = Inspection(
        repair_id=repair.id, hazard_id=repair.hazard_id, inspector_id=ctx.user.id,
        decision=payload.decision, notes=payload.notes,
    )
    db.add(inspection)

    from_status = repair.status
    if payload.decision == InspectionDecision.APPROVED:
        repair.status = RepairStatus.RESOLVED
        repair.completed_at = datetime.now(timezone.utc)
        action_type = "INSPECTION_APPROVED"
    else:
        repair.status = RepairStatus.REWORK_REQUIRED
        action_type = "INSPECTION_REWORK"

    db.add(
        MunicipalityAction(
            hazard_id=repair.hazard_id, action_type=action_type, notes=payload.notes,
            performed_by=ctx.user.full_name, performed_by_user_id=ctx.user.id,
            action_metadata={"repair_id": str(repair.id), "from_repair_status": from_status.value if hasattr(from_status, "value") else from_status},
        )
    )
    await log_action(
        db, user_id=ctx.user.id, municipality_id=ctx.municipality.id, city_id=repair.city_id,
        action=action_type, entity_type="repair", entity_id=repair.id,
    )
    await db.commit()
    await db.refresh(inspection)
    return InspectionOut.model_validate(inspection)


@router.get("/", response_model=list[InspectionOut])
async def list_inspections(
    repair_id: uuid.UUID | None = Query(None),
    hazard_id: uuid.UUID | None = Query(None),
    ctx: MunicipalityContext = Depends(get_municipality_context),
    db: AsyncSession = Depends(get_db),
) -> list[InspectionOut]:
    """Requires `repair_id` or `hazard_id` and re-verifies its city against
    the officer's authorized cities — never trust the caller-supplied id
    alone (section 52), same rule as every other municipality route."""
    if repair_id is None and hazard_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide repair_id or hazard_id.")

    if repair_id is not None:
        repair_result = await db.execute(select(Repair.city_id).where(Repair.id == repair_id))
        city_id = repair_result.scalar_one_or_none()
    else:
        hazard_result = await db.execute(select(Hazard.city_id).where(Hazard.id == hazard_id))
        city_id = hazard_result.scalar_one_or_none()
    if city_id is None or city_id not in ctx.allowed_city_ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found.")

    stmt = select(Inspection)
    if repair_id is not None:
        stmt = stmt.where(Inspection.repair_id == repair_id)
    if hazard_id is not None:
        stmt = stmt.where(Inspection.hazard_id == hazard_id)
    stmt = stmt.order_by(Inspection.created_at.desc())
    result = await db.execute(stmt)
    return [InspectionOut.model_validate(i) for i in result.scalars().all()]
