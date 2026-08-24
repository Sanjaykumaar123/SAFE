"""
Section 26/27 — the "last 5 vehicle observations" + computed road-condition
state. This is the one place `VerificationState` is decided; the mobile app
only ever displays what this function returns (section 76: "UI does not own
business logic").

Deliberately NOT "5 clear = auto-resolve" (section 27 explicitly rules that
out). Each observation is weighted by recency (most recent counts most),
data quality, and reported confidence; an open, not-yet-inspection-ready
repair caps how confident the system will claim a road is clear, because a
"clear" pass from a vehicle while a repair crew hasn't finished yet is more
likely a wrong-location match than a genuinely fixed road.
"""
import uuid
from dataclasses import dataclass

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import HazardStatus, ObservationState, OPEN_REPAIR_STATUSES, RepairStatus, VerificationState
from app.models.fleet_observation import FleetObservation
from app.models.hazard import Hazard
from app.models.repair import Repair
from app.services.geo import geography_origin

# Same-road-segment radius used when a fleet observation wasn't linked to
# this exact hazard_id but passed close enough to be relevant (section 26:
# "spatial relevance ... road/segment relevance").
RELEVANCE_RADIUS_METERS = 150

# Rank-based recency weights for up to 5 observations, most-recent first.
RECENCY_WEIGHTS = [1.0, 0.85, 0.7, 0.55, 0.4]

QUALITY_WEIGHTS = {"HIGH": 1.0, "MEDIUM": 0.75, "LOW": 0.5}
DEFAULT_QUALITY_WEIGHT = 0.65


@dataclass
class VerificationResult:
    state: VerificationState
    confidence: int
    detected_count: int
    clear_count: int
    observations: list[FleetObservation]  # oldest-first, matching the product spec's display order
    summary: str
    previously_resolved: bool
    reopen_suggested: bool


async def get_relevant_observations(db: AsyncSession, hazard: Hazard, limit: int = 5) -> list[FleetObservation]:
    origin = geography_origin(hazard.latitude, hazard.longitude)
    stmt = (
        select(FleetObservation)
        .where(
            or_(
                FleetObservation.hazard_id == hazard.id,
                func.ST_DWithin(FleetObservation.location, origin, RELEVANCE_RADIUS_METERS),
            )
        )
        .order_by(FleetObservation.observed_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    newest_first = list(result.scalars().all())
    return list(reversed(newest_first))  # oldest-first for display (section 26's own example is chronological)


async def compute_verification(db: AsyncSession, hazard: Hazard) -> VerificationResult:
    observations = await get_relevant_observations(db, hazard, limit=5)

    detected_count = sum(1 for o in observations if o.observation_state == ObservationState.DETECTED.value)
    clear_count = sum(1 for o in observations if o.observation_state == ObservationState.CLEAR.value)

    if len(observations) < 2:
        return VerificationResult(
            state=VerificationState.INSUFFICIENT_EVIDENCE,
            confidence=0,
            detected_count=detected_count,
            clear_count=clear_count,
            observations=observations,
            summary="Not enough recent fleet observations to assess this road segment yet.",
            previously_resolved=False,
            reopen_suggested=False,
        )

    # Repair progress caps the claim (see module docstring): while a repair
    # is open and not yet marked ready for inspection, evidence can move the
    # needle only as far as UNDER_VERIFICATION.
    open_repair = await _open_repair(db, hazard.id)
    repair_caps_confidence = open_repair is not None and open_repair.status in (RepairStatus.ASSIGNED, RepairStatus.IN_PROGRESS, RepairStatus.REWORK_REQUIRED)

    # Newest-first for weighting (index 0 = most recent = highest weight).
    newest_first = list(reversed(observations))
    weighted_sum = 0.0
    total_weight = 0.0
    for rank, obs in enumerate(newest_first[:5]):
        recency = RECENCY_WEIGHTS[rank] if rank < len(RECENCY_WEIGHTS) else 0.3
        quality = QUALITY_WEIGHTS.get(obs.data_quality or "", DEFAULT_QUALITY_WEIGHT)
        confidence_factor = obs.confidence if obs.confidence is not None else 0.75
        weight = recency * quality * confidence_factor
        direction = 1.0 if obs.observation_state == ObservationState.CLEAR.value else -1.0
        weighted_sum += direction * weight
        total_weight += weight

    score = weighted_sum / total_weight if total_weight > 0 else 0.0  # -1 (still active) .. +1 (confirmed clear)
    agreement_weight = sum(
        (RECENCY_WEIGHTS[r] if r < len(RECENCY_WEIGHTS) else 0.3) * QUALITY_WEIGHTS.get(o.data_quality or "", DEFAULT_QUALITY_WEIGHT)
        for r, o in enumerate(newest_first[:5])
    )
    confidence = int(round(min(100, abs(score) * 100 * (0.6 + 0.4 * min(1.0, agreement_weight / max(len(newest_first), 1))))))

    if score >= 0.55 and not repair_caps_confidence:
        state = VerificationState.CONFIRMED_CLEAR
    elif score >= 0.2 and not repair_caps_confidence:
        state = VerificationState.PROBABLY_CLEAR
    elif score <= -0.3:
        state = VerificationState.STILL_ACTIVE
    else:
        state = VerificationState.UNDER_VERIFICATION

    previously_resolved = hazard.status == HazardStatus.RESOLVED
    reopen_suggested = previously_resolved and detected_count >= 2 and state in (VerificationState.STILL_ACTIVE, VerificationState.UNDER_VERIFICATION)

    summary = _summary_for(state, clear_count, detected_count, len(observations))

    return VerificationResult(
        state=state,
        confidence=confidence,
        detected_count=detected_count,
        clear_count=clear_count,
        observations=observations,
        summary=summary,
        previously_resolved=previously_resolved,
        reopen_suggested=reopen_suggested,
    )


async def _open_repair(db: AsyncSession, hazard_id: uuid.UUID) -> Repair | None:
    result = await db.execute(
        select(Repair).where(Repair.hazard_id == hazard_id, Repair.status.in_(OPEN_REPAIR_STATUSES)).order_by(Repair.created_at.desc()).limit(1)
    )
    return result.scalar_one_or_none()


def _summary_for(state: VerificationState, clear_count: int, detected_count: int, total: int) -> str:
    if state == VerificationState.CONFIRMED_CLEAR:
        return f"{clear_count} of {total} recent passes found the road clear — high confidence the hazard is gone."
    if state == VerificationState.PROBABLY_CLEAR:
        return f"{clear_count} of {total} recent passes found the road clear — recommend one more confirming pass before resolving."
    if state == VerificationState.STILL_ACTIVE:
        return f"{detected_count} of {total} recent passes still detected the hazard — treat as active."
    if state == VerificationState.UNDER_VERIFICATION:
        return f"{clear_count} clear, {detected_count} detected in the last {total} passes — evidence is mixed."
    return "Not enough recent fleet observations to assess this road segment yet."
