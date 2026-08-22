"""
Pydantic response/request shapes for the Municipality app
(`app/api/v1/municipality/*`). Kept in one file, unlike the citizen
schemas' one-file-per-resource split, because the Municipality API surface
is one bounded module added on top of an existing app (see
`docs/architecture.md`) — this mirrors how `app/api/v1/municipality/` is
laid out as a subpackage rather than flat files.
"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import (
    HazardStatus,
    HazardType,
    InspectionDecision,
    RepairPriority,
    RepairStatus,
    Severity,
    VerificationMethod,
    VerificationState,
)

# --------------------------------------------------------------------------
# Auth / profile / city context (sections 08/13/14)
# --------------------------------------------------------------------------


class MunicipalityLoginRequest(BaseModel):
    municipality_code: str = Field(min_length=2, max_length=32, description='e.g. "MUN-CHN"')
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class CityOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    state: str | None
    center_latitude: float | None
    center_longitude: float | None
    ward_count: int = 0

    model_config = {"from_attributes": True}


class WardOut(BaseModel):
    id: uuid.UUID
    city_id: uuid.UUID
    code: str
    name: str

    model_config = {"from_attributes": True}


class MunicipalityOfficerOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr
    role: str = "MUNICIPALITY_OFFICER"
    officer_role: str
    municipality_id: uuid.UUID
    municipality_code: str
    municipality_name: str
    allowed_city_ids: list[uuid.UUID]
    default_city_id: uuid.UUID | None
    ward_ids: list[str] | None
    permissions: list[str]


class MunicipalityAuthResponse(BaseModel):
    officer: MunicipalityOfficerOut
    tokens: TokenPair


class MunicipalityMeResponse(BaseModel):
    officer: MunicipalityOfficerOut
    authorized_cities: list[CityOut]


# --------------------------------------------------------------------------
# Hazards (sections 17-32, 74)
# --------------------------------------------------------------------------


class PriorityOut(BaseModel):
    """Decision-support output only — never the raw formula (section 31/76)."""

    label: Severity
    score: int = Field(ge=0, le=100)
    reasons: list[str]
    recommendation: str


class MunicipalityHazardOut(BaseModel):
    id: uuid.UUID
    hazard_code: str
    type: HazardType
    latitude: float
    longitude: float
    location_text: str
    road_name: str | None
    city_id: uuid.UUID | None
    ward_id: uuid.UUID | None
    ward_name: str | None = None
    severity: Severity
    status: HazardStatus
    ai_confidence: float | None
    image_url: str | None
    description: str | None
    source_summary: str
    repair_status: RepairStatus | None = None
    repair_code: str | None = None
    created_at: datetime
    updated_at: datetime
    last_observed_at: datetime

    model_config = {"from_attributes": True}


class MunicipalityHazardListResponse(BaseModel):
    items: list[MunicipalityHazardOut]
    total: int
    page: int
    page_size: int


class CitizenReportEvidenceOut(BaseModel):
    id: uuid.UUID
    report_code: str
    hazard_type: HazardType
    severity: Severity
    description: str | None
    media: list[str]
    created_at: datetime


class AIAnalysisEvidenceOut(BaseModel):
    id: uuid.UUID
    detected: bool
    confidence: float
    severity: Severity | None
    model_version: str
    image_url: str
    created_at: datetime


class FleetObservationOut(BaseModel):
    id: uuid.UUID
    vehicle_id: str
    observed_at: datetime
    observation_state: str | None
    confidence: float | None
    severity: Severity | None
    image_url: str | None
    latitude: float
    longitude: float
    data_quality: str | None


class MunicipalityActionOut(BaseModel):
    id: uuid.UUID
    action_type: str
    notes: str | None
    performed_by: str | None
    from_status: str | None
    to_status: str | None
    created_at: datetime


class CurrentRepairSummaryOut(BaseModel):
    id: uuid.UUID
    repair_code: str
    status: RepairStatus
    priority: RepairPriority
    team: str | None
    target_date: date | None


class MunicipalityHazardDetailOut(MunicipalityHazardOut):
    citizen_reports: list[CitizenReportEvidenceOut]
    latest_ai_analysis: AIAnalysisEvidenceOut | None
    latest_fleet_observations: list[FleetObservationOut]
    municipality_actions: list[MunicipalityActionOut]
    current_repair: CurrentRepairSummaryOut | None
    priority: PriorityOut
    resolution_state: str  # "ACTIVE" | "RESOLVED" | "REOPENED"
    reopened_from_hazard_id: uuid.UUID | None = None


class VerificationOut(BaseModel):
    hazard_id: uuid.UUID
    state: VerificationState
    confidence: int = Field(ge=0, le=100)
    detected_count: int
    clear_count: int
    observations: list[FleetObservationOut]
    summary: str
    previously_resolved: bool = False
    reopen_suggested: bool = False


class TimelineEventOut(BaseModel):
    id: uuid.UUID
    label: str
    detail: str | None
    from_status: str | None
    to_status: str | None
    actor: str | None
    created_at: datetime


class TimelineResponse(BaseModel):
    hazard_id: uuid.UUID
    events: list[TimelineEventOut]


class ResolveHazardRequest(BaseModel):
    resolution_notes: str = Field(min_length=1, max_length=2000)
    repair_id: uuid.UUID | None = None
    verification_method: VerificationMethod = VerificationMethod.MUNICIPAL_INSPECTION
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    evidence_media_ids: list[str] = Field(default_factory=list)


class ResolutionOut(BaseModel):
    id: uuid.UUID
    hazard_id: uuid.UUID
    repair_id: uuid.UUID | None
    verified_by: uuid.UUID
    verified_at: datetime
    resolution_notes: str | None
    verification_method: VerificationMethod
    status: str

    model_config = {"from_attributes": True}


class ReopenHazardRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)


# --------------------------------------------------------------------------
# Repairs / progress / inspections (sections 33-40)
# --------------------------------------------------------------------------


class RepairCreateRequest(BaseModel):
    hazard_id: uuid.UUID
    department: str = Field(min_length=1, max_length=120)
    zone: str | None = Field(default=None, max_length=120)
    team: str | None = Field(default=None, max_length=120)
    assigned_officer_name: str | None = Field(default=None, max_length=120)
    priority: RepairPriority = RepairPriority.MEDIUM
    target_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class RepairOut(BaseModel):
    id: uuid.UUID
    repair_code: str
    hazard_id: uuid.UUID
    hazard_road_name: str | None = None
    hazard_location_text: str | None = None
    city_id: uuid.UUID
    department: str
    zone: str | None
    team: str | None
    assigned_officer_name: str | None
    priority: RepairPriority
    target_date: date | None
    status: RepairStatus
    notes: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RepairListResponse(BaseModel):
    items: list[RepairOut]
    total: int


class RepairProgressCreateRequest(BaseModel):
    note: str | None = Field(default=None, max_length=2000)
    photo_url: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class RepairProgressOut(BaseModel):
    id: uuid.UUID
    note: str | None
    photo_url: str | None
    latitude: float | None
    longitude: float | None
    created_by_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RepairDetailOut(RepairOut):
    progress_entries: list[RepairProgressOut]
    timeline: list[TimelineEventOut]


class InspectionDecisionRequest(BaseModel):
    decision: InspectionDecision
    notes: str | None = Field(default=None, max_length=2000)


class InspectionOut(BaseModel):
    id: uuid.UUID
    repair_id: uuid.UUID
    hazard_id: uuid.UUID
    inspector_id: uuid.UUID
    decision: InspectionDecision
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------
# Dashboard (sections 15/16)
# --------------------------------------------------------------------------


class PriorityRoadOut(BaseModel):
    road_name: str
    priority: Severity
    active_hazard_count: int
    critical_hazard_count: int
    reason: str


class RecentActivityItemOut(BaseModel):
    id: uuid.UUID
    label: str
    detail: str | None
    hazard_id: uuid.UUID | None
    created_at: datetime


class FleetCoverageSummaryOut(BaseModel):
    observed_today_km_estimate: float
    coverage_percent: int
    data_gap_segments: int


class DashboardOut(BaseModel):
    city_id: uuid.UUID
    city_name: str
    active_hazards: int
    critical_hazards: int
    under_repair: int
    resolved_today: int
    priority_roads: list[PriorityRoadOut]
    recent_activity: list[RecentActivityItemOut]
    fleet_coverage: FleetCoverageSummaryOut
    generated_at: datetime


# --------------------------------------------------------------------------
# Analytics (sections 44-47, 68)
# --------------------------------------------------------------------------


class AnalyticsSummaryOut(BaseModel):
    active_hazards: int
    critical_hazards: int
    resolved_this_week: int
    avg_resolution_time_hours: float | None
    recurring_hazard_roads: int
    citizen_reports_count: int
    fleet_observation_count: int
    avg_repair_turnaround_hours: float | None


class WardAnalyticsItemOut(BaseModel):
    ward_id: uuid.UUID | None
    ward_name: str
    active_hazards: int
    critical_hazards: int
    resolved_hazards: int


class SeverityAnalyticsItemOut(BaseModel):
    severity: Severity
    count: int


class ResolutionTrendPointOut(BaseModel):
    date: date
    resolved_count: int


class RecurringHazardItemOut(BaseModel):
    road_name: str
    report_count: int
    recurring_event_count: int
    recommendation: str


class FleetCoverageOut(BaseModel):
    observed_today_km_estimate: float
    coverage_percent: int
    data_gap_segments: int
    roads_observed_today: int
    total_roads_tracked: int
    stale_roads: list[str]


# --------------------------------------------------------------------------
# Notifications — municipality reuses `GET /api/notifications` (same table,
# scoped by JWT `user_id`, already secure). No municipality-specific
# notification schema is needed; see docs/architecture.md.
# --------------------------------------------------------------------------
