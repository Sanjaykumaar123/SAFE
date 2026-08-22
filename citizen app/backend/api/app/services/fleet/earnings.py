"""
§40/41/85 — the ONLY place a fleet payout is computed. The mobile app only
ever displays an `EarningRecord` this module produced; it never calculates
its own total (§85: "Do NOT let the phone calculate authoritative earnings").

Rates are documented placeholder constants (same rule `app/services/
municipality/dashboard.py` follows for its own placeholder numbers) — a real
deployment would make these backend-configurable, not hardcoded, but the
important architectural property for now is that they live in exactly one
place and are never guessed client-side.
"""
from dataclasses import dataclass
from datetime import datetime, timezone

from app.models.collection_session import CollectionSession
from app.models.enums import CollectionSessionStatus

RATE_PER_VALIDATED_KM = 10.0  # INR per validated km
RATE_PER_VALID_OBSERVATION = 5.0  # INR per accepted, valid observation
QUALITY_BONUS_THRESHOLD = 90.0  # data_quality_score percent
QUALITY_BONUS_AMOUNT = 20.0

# A validated-distance/duration ratio above this is treated as implausible
# (e.g. GPS drift, spoofing, or a client bug) and caps how much of the
# client-reported distance is accepted, rather than trusting it outright —
# see `validate_session_distance` (§39: "backend validates ... GPS quality").
MAX_PLAUSIBLE_KMH = 120.0


@dataclass
class EarningsBreakdown:
    coverage_amount: float
    observation_amount: float
    quality_bonus_amount: float
    total_amount: float


def validate_session_distance(reported_distance_km: float, duration_minutes: float) -> float:
    """Clamps an implausible client-reported distance down to the maximum
    plausible distance for the elapsed duration. Never raises — an
    over-claim just doesn't get paid for the excess; it's still recorded as
    "reported" for review."""
    if duration_minutes <= 0:
        return 0.0
    max_plausible_km = (duration_minutes / 60.0) * MAX_PLAUSIBLE_KMH
    return min(reported_distance_km, max_plausible_km)


def compute_data_quality_score(*, gps_ok_ratio: float, valid_observation_ratio: float, sync_complete_ratio: float) -> float:
    """0..100 composite — see §44's own breakdown (GPS accuracy / upload
    completeness / AI confidence quality) collapsed to the inputs this MVP
    actually tracks server-side."""
    score = (gps_ok_ratio * 0.4 + valid_observation_ratio * 0.35 + sync_complete_ratio * 0.25) * 100
    return max(0.0, min(100.0, score))


def compute_session_status(validated_distance_km: float, reported_distance_km: float, data_quality_score: float | None) -> str:
    if reported_distance_km <= 0:
        return CollectionSessionStatus.PARTIALLY_VALIDATED.value
    coverage_ratio = validated_distance_km / reported_distance_km
    if coverage_ratio >= 0.95 and (data_quality_score or 0) >= 60:
        return CollectionSessionStatus.VALIDATED.value
    return CollectionSessionStatus.PARTIALLY_VALIDATED.value


def compute_earnings(session: CollectionSession) -> EarningsBreakdown:
    validated_km = session.validated_distance_km or 0.0
    coverage_amount = round(validated_km * RATE_PER_VALIDATED_KM, 2)
    observation_amount = round(session.valid_observation_count * RATE_PER_VALID_OBSERVATION, 2)
    quality_bonus_amount = QUALITY_BONUS_AMOUNT if (session.data_quality_score or 0) >= QUALITY_BONUS_THRESHOLD else 0.0
    total_amount = round(coverage_amount + observation_amount + quality_bonus_amount, 2)
    return EarningsBreakdown(
        coverage_amount=coverage_amount,
        observation_amount=observation_amount,
        quality_bonus_amount=quality_bonus_amount,
        total_amount=total_amount,
    )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
