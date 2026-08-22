"""
Section 31 — the municipal priority recommendation. Real, queried inputs
only (nearby active/critical hazard density, recent citizen reports, recent
fleet confirmations); no fabricated "traffic index". `HIGH_TRAFFIC_ROADS` is
an explicit, documented placeholder for a real traffic-data integration —
never presented as measured data.

Only `label` / `score` (0-100, for a progress indicator) / `reasons` /
`recommendation` are returned to the client — never the weights themselves
(section 31/76: the backend decides, the UI displays the decision).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.citizen_report import CitizenReport
from app.models.enums import ACTIVE_HAZARD_STATUSES, ObservationState, Severity
from app.models.fleet_observation import FleetObservation
from app.models.hazard import Hazard
from app.schemas.municipality import PriorityOut
from app.services.geo import geography_origin

# Chennai demo arterials — a documented placeholder for a real traffic-data
# feed (section 05 explicitly allows starting simple and swapping the data
# source later without a client change).
HIGH_TRAFFIC_ROAD_KEYWORDS = ("GST Road", "Anna Salai", "OMR", "ECR", "Mount Road", "Velachery Main Road", "Poonamallee High Road")

NEARBY_RADIUS_METERS = 1000
RECENT_REPORT_WINDOW_DAYS = 7
RECENT_FLEET_WINDOW_HOURS = 48

_SEVERITY_BASE = {Severity.CRITICAL: 40, Severity.HIGH: 30, Severity.MEDIUM: 15, Severity.LOW: 5}
_LABEL_THRESHOLDS = (
    (70, Severity.CRITICAL, "Immediate inspection required — dispatch within 4 hours."),
    (45, Severity.HIGH, "Inspection required within 24 hours."),
    (25, Severity.MEDIUM, "Inspection recommended within 72 hours."),
    (0, Severity.LOW, "Monitor — no immediate action required."),
)


async def compute_priority(db: AsyncSession, hazard: Hazard) -> PriorityOut:
    now = datetime.now(timezone.utc)

    origin = geography_origin(hazard.latitude, hazard.longitude)
    nearby_result = await db.execute(
        select(Hazard.severity, func.count())
        .where(
            Hazard.id != hazard.id,
            Hazard.status.in_(ACTIVE_HAZARD_STATUSES),
            func.ST_DWithin(Hazard.location, origin, NEARBY_RADIUS_METERS),
        )
        .group_by(Hazard.severity)
    )
    # `Severity` mixes in `str`, so a plain "CRITICAL" string key (what the
    # DB column actually holds) and `Severity.CRITICAL` hash/compare equal —
    # this dict is safe to key either way.
    nearby_by_severity = {row[0]: row[1] for row in nearby_result.all()}
    nearby_active = sum(nearby_by_severity.values())
    nearby_critical = nearby_by_severity.get(Severity.CRITICAL, 0)

    since_reports = now - timedelta(days=RECENT_REPORT_WINDOW_DAYS)
    report_count_result = await db.execute(
        select(func.count()).select_from(CitizenReport).where(CitizenReport.hazard_id == hazard.id, CitizenReport.created_at >= since_reports)
    )
    recent_reports = report_count_result.scalar_one()

    since_fleet = now - timedelta(hours=RECENT_FLEET_WINDOW_HOURS)
    fleet_count_result = await db.execute(
        select(func.count()).select_from(FleetObservation).where(
            FleetObservation.hazard_id == hazard.id,
            FleetObservation.observation_state == ObservationState.DETECTED.value,
            FleetObservation.observed_at >= since_fleet,
        )
    )
    recent_fleet_confirmations = fleet_count_result.scalar_one()

    is_high_traffic = bool(hazard.road_name) and any(keyword.lower() in hazard.road_name.lower() for keyword in HIGH_TRAFFIC_ROAD_KEYWORDS)

    severity_score = _SEVERITY_BASE.get(hazard.severity, 15)
    nearby_score = min(30, nearby_active * 3) + min(10, nearby_critical * 5)
    confirmation_score = min(15, recent_fleet_confirmations * 3)
    report_score = min(15, recent_reports * 5)
    traffic_bonus = 10 if is_high_traffic else 0

    total = min(100, severity_score + nearby_score + confirmation_score + report_score + traffic_bonus)

    label, recommendation = Severity.LOW, _LABEL_THRESHOLDS[-1][2]
    for threshold, tier_label, tier_recommendation in _LABEL_THRESHOLDS:
        if total >= threshold:
            label, recommendation = tier_label, tier_recommendation
            break

    reasons: list[str] = []
    if nearby_critical:
        reasons.append(f"{nearby_critical} critical hazard{'s' if nearby_critical != 1 else ''} nearby")
    if nearby_active:
        reasons.append(f"{nearby_active} active hazard{'s' if nearby_active != 1 else ''} within {NEARBY_RADIUS_METERS}m")
    if is_high_traffic:
        reasons.append("High-traffic arterial road")
    if recent_fleet_confirmations:
        reasons.append(f"{recent_fleet_confirmations} recent fleet confirmation{'s' if recent_fleet_confirmations != 1 else ''}")
    if recent_reports:
        reasons.append(f"{recent_reports} recent citizen report{'s' if recent_reports != 1 else ''}")
    if not reasons:
        reasons.append(f"{hazard.severity} severity hazard")

    return PriorityOut(label=label, score=total, reasons=reasons, recommendation=recommendation)
