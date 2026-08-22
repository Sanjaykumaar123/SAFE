"""§11/25-29/50/60/95 — road observation ingestion. This is the one place a
fleet detection becomes a database row: validates ownership of the session
it claims to belong to, enforces idempotency on `client_observation_id`
(§60), and hands off to `app/services/fleet/hazard_association.py` for the
hazard-matching decision the mobile app never makes itself (§77)."""
import uuid
from dataclasses import dataclass

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.collection_session import CollectionSession
from app.models.enums import CollectionSessionStatus, ObservationState
from app.models.fleet_observation import FleetObservation
from app.schemas.fleet import (
    ObservationBatchRequest,
    ObservationBatchResponse,
    ObservationBatchResultItem,
    ObservationCreateRequest,
    ObservationListResponse,
    ObservationOut,
)
from app.services.fleet.authorization import FleetContext, get_fleet_context
from app.services.fleet.hazard_association import associate_or_create_hazard
from app.services.storage import get_storage_service

router = APIRouter(prefix="/observations", tags=["fleet"])

# §82 — configuration value, not hardcoded across the app logic beyond this
# one constant; a production deployment would source this from settings.
AI_CONFIDENCE_THRESHOLD = 0.50


@dataclass
class _SubmitResult:
    status: str  # ACCEPTED | DUPLICATE | FAILED
    observation: FleetObservation | None
    hazard_id: uuid.UUID | None
    message: str | None
    # §grayscale-and-delete — set on ACCEPTED-but-sub-threshold results so
    # the route handler can schedule storage demotion *after* the DB
    # transaction commits (never demote evidence for a row that might still
    # roll back).
    demote_image_url: str | None = None


async def _submit_one(db: AsyncSession, ctx: FleetContext, payload: ObservationCreateRequest) -> _SubmitResult:
    existing_result = await db.execute(select(FleetObservation).where(FleetObservation.client_observation_id == payload.client_observation_id))
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        return _SubmitResult("DUPLICATE", existing, existing.hazard_id, "Already processed.")

    session_result = await db.execute(
        select(CollectionSession).where(CollectionSession.id == payload.session_id, CollectionSession.operator_id == ctx.profile.id)
    )
    session = session_result.scalar_one_or_none()
    if session is None:
        return _SubmitResult("FAILED", None, None, "Session not found or not owned by this operator.")
    if session.status != CollectionSessionStatus.ACTIVE.value:
        return _SubmitResult("FAILED", None, None, "Session is not active.")

    is_valid = payload.confidence >= AI_CONFIDENCE_THRESHOLD

    hazard = await associate_or_create_hazard(
        db,
        latitude=payload.latitude,
        longitude=payload.longitude,
        city_id=session.city_id,
        hazard_type=payload.hazard_type,
        severity=payload.severity,
        confidence=payload.confidence,
        image_url=payload.image_url,
        observed_at=payload.observed_at,
    )

    observation = FleetObservation(
        hazard_id=hazard.id,
        vehicle_id=str(session.vehicle_id),
        operator_id=ctx.profile.operator_code,
        observed_at=payload.observed_at,
        confidence=payload.confidence,
        location=f"SRID=4326;POINT({payload.longitude} {payload.latitude})",
        latitude=payload.latitude,
        longitude=payload.longitude,
        road_id=None,
        observation_state=ObservationState.DETECTED.value,
        severity=payload.severity.value if payload.severity else None,
        image_url=payload.image_url,
        bounding_box=payload.bounding_box.model_dump() if payload.bounding_box else None,
        data_quality=payload.data_quality,
        session_id=session.id,
        vehicle_ref_id=session.vehicle_id,
        operator_ref_id=ctx.profile.id,
        client_observation_id=payload.client_observation_id,
        hazard_type=payload.hazard_type.value,
        model_name=payload.model_name,
        model_version=payload.model_version,
        gps_accuracy=payload.gps_accuracy,
    )
    db.add(observation)

    session.observation_count += 1
    if is_valid:
        session.valid_observation_count += 1

    await db.flush()
    # is_valid=False means this submission didn't clear the hazard-worthy
    # confidence bar (§AI_CONFIDENCE_THRESHOLD above) — under normal
    # operation the client already filters these out before uploading (see
    # fleetoperator's DetectionTracker), so anything landing here is an
    # edge case not worth keeping full-resolution color evidence for.
    demote_url = payload.image_url if (not is_valid and payload.image_url) else None
    return _SubmitResult("ACCEPTED", observation, hazard.id, None, demote_image_url=demote_url)


@router.post("", response_model=ObservationOut, status_code=status.HTTP_201_CREATED)
async def create_observation(
    payload: ObservationCreateRequest,
    background_tasks: BackgroundTasks,
    ctx: FleetContext = Depends(get_fleet_context),
    db: AsyncSession = Depends(get_db),
) -> ObservationOut:
    result = await _submit_one(db, ctx, payload)
    if result.status == "FAILED":
        raise HTTPException(status.HTTP_404_NOT_FOUND, result.message or "Could not create observation.")
    await db.commit()
    await db.refresh(result.observation)
    # §grayscale-and-delete — only scheduled after a successful commit, and
    # only for the sub-threshold edge case (see _submit_one).
    if result.demote_image_url:
        background_tasks.add_task(get_storage_service().demote, result.demote_image_url)
    return ObservationOut.model_validate(result.observation)


@router.post("/batch", response_model=ObservationBatchResponse)
async def create_observations_batch(
    payload: ObservationBatchRequest,
    background_tasks: BackgroundTasks,
    ctx: FleetContext = Depends(get_fleet_context),
    db: AsyncSession = Depends(get_db),
) -> ObservationBatchResponse:
    results: list[ObservationBatchResultItem] = []
    demote_urls: list[str] = []
    for item in payload.items:
        outcome = await _submit_one(db, ctx, item)
        if outcome.demote_image_url:
            demote_urls.append(outcome.demote_image_url)
        results.append(
            ObservationBatchResultItem(
                client_observation_id=item.client_observation_id,
                status=outcome.status,
                observation_id=outcome.observation.id if outcome.observation else None,
                hazard_id=outcome.hazard_id,
                message=outcome.message,
            )
        )
    await db.commit()
    storage = get_storage_service()
    for url in demote_urls:
        background_tasks.add_task(storage.demote, url)
    return ObservationBatchResponse(results=results)


@router.get("/me", response_model=ObservationListResponse)
async def my_observations(ctx: FleetContext = Depends(get_fleet_context), db: AsyncSession = Depends(get_db), limit: int = 50, offset: int = 0) -> ObservationListResponse:
    result = await db.execute(
        select(FleetObservation)
        .where(FleetObservation.operator_ref_id == ctx.profile.id)
        .order_by(FleetObservation.observed_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = list(result.scalars().all())
    total_result = await db.execute(select(FleetObservation.id).where(FleetObservation.operator_ref_id == ctx.profile.id))
    total = len(total_result.all())
    return ObservationListResponse(items=[ObservationOut.model_validate(o) for o in items], total=total)


@router.get("/{observation_id}", response_model=ObservationOut)
async def get_observation(observation_id: uuid.UUID, ctx: FleetContext = Depends(get_fleet_context), db: AsyncSession = Depends(get_db)) -> ObservationOut:
    result = await db.execute(select(FleetObservation).where(FleetObservation.id == observation_id, FleetObservation.operator_ref_id == ctx.profile.id))
    observation = result.scalar_one_or_none()
    if observation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Observation not found.")
    return ObservationOut.model_validate(observation)
