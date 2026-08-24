"""
Pydantic request/response shapes for the Fleet Operator app
(`app/api/v1/fleet/*`). One flat file, same convention as
`app/schemas/municipality.py` — this is one bounded module added on top of
an existing app.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import CollectionSessionStatus, EarningStatus, HazardType, Severity
from app.schemas.common import BoundingBox

# --------------------------------------------------------------------------
# Auth / profile / vehicle context (sections 15/16/58)
# --------------------------------------------------------------------------


class FleetLoginRequest(BaseModel):
    operator_code: str = Field(min_length=2, max_length=32, description='e.g. "OP-0042"')
    password: str = Field(min_length=8, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class VehicleOut(BaseModel):
    id: uuid.UUID
    registration_number: str
    status: str
    vehicle_type: str | None

    model_config = {"from_attributes": True}


class FleetOperatorOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str = "FLEET_OPERATOR"
    operator_code: str
    operator_role: str
    city_id: uuid.UUID | None
    city_name: str | None
    zone_name: str | None
    vehicle: VehicleOut | None
    permissions: list[str]


class FleetAuthResponse(BaseModel):
    operator: FleetOperatorOut
    tokens: TokenPair


class TodayTargetOut(BaseModel):
    """Section 18/53 — daily collection brief. `target_km`/`priority roads`
    are demo-seeded constants per zone today (no routing engine yet), never
    client-supplied — see app/services/fleet/serializers.py."""

    target_km: float
    completed_km: float
    priority_zone: str | None
    recommended_roads: list[str]


class FleetMeResponse(BaseModel):
    operator: FleetOperatorOut
    today_target: TodayTargetOut


class TodayRouteOut(BaseModel):
    route_name: str
    zone_name: str | None
    target_km: float
    priority: Severity
    road_segments: list[str]


# --------------------------------------------------------------------------
# Collection sessions (sections 21/36/37/39)
# --------------------------------------------------------------------------


class SessionStartRequest(BaseModel):
    """`vehicle_id`/`city_id`/`zone_id` are accepted for the mobile client's
    convenience but are always re-validated against the authenticated
    operator's own assignment server-side (§14/59) — a mismatched value is
    rejected, never silently substituted."""

    vehicle_id: uuid.UUID | None = None
    city_id: uuid.UUID | None = None
    start_latitude: float | None = Field(default=None, ge=-90, le=90)
    start_longitude: float | None = Field(default=None, ge=-180, le=180)
    device_metadata: dict | None = None
    client_session_id: str | None = Field(default=None, max_length=64)


class SessionOut(BaseModel):
    id: uuid.UUID
    status: CollectionSessionStatus
    vehicle_id: uuid.UUID
    city_id: uuid.UUID | None
    zone_name: str | None
    start_time: datetime
    end_time: datetime | None
    reported_distance_km: float
    validated_distance_km: float | None
    observation_count: int
    valid_observation_count: int
    data_quality_score: float | None

    model_config = {"from_attributes": True}


class SessionStopRequest(BaseModel):
    end_latitude: float | None = Field(default=None, ge=-90, le=90)
    end_longitude: float | None = Field(default=None, ge=-180, le=180)
    reported_distance_km: float = Field(ge=0)


class SessionStopResponse(BaseModel):
    session: SessionOut
    duration_minutes: float
    estimated_earnings: float


class SessionListResponse(BaseModel):
    items: list[SessionOut]
    total: int


# --------------------------------------------------------------------------
# Road observations (sections 11/25-29/50/60/95)
# --------------------------------------------------------------------------


class ObservationCreateRequest(BaseModel):
    """Every field here is evidence the client is asserting — the backend
    still decides hazard association, data_quality validity, and whether it
    counts toward a session's `valid_observation_count` (§13/32/76)."""

    client_observation_id: str = Field(min_length=1, max_length=64)
    session_id: uuid.UUID
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    observed_at: datetime
    hazard_type: HazardType = HazardType.POTHOLE
    confidence: float = Field(ge=0, le=1)
    severity: Severity | None = None
    bounding_box: BoundingBox | None = None
    image_url: str | None = None
    model_name: str | None = None
    model_version: str | None = None
    gps_accuracy: float | None = None
    data_quality: str | None = None  # HIGH | MEDIUM | LOW


class ObservationBatchRequest(BaseModel):
    items: list[ObservationCreateRequest] = Field(min_length=1, max_length=50)


class ObservationOut(BaseModel):
    id: uuid.UUID
    client_observation_id: str | None
    session_id: uuid.UUID | None
    hazard_id: uuid.UUID | None
    latitude: float
    longitude: float
    observed_at: datetime
    hazard_type: str | None
    confidence: float | None
    severity: str | None
    image_url: str | None
    bounding_box: dict | None
    data_quality: str | None
    observation_state: str | None

    model_config = {"from_attributes": True}


class ObservationBatchResultItem(BaseModel):
    client_observation_id: str
    status: str  # ACCEPTED | DUPLICATE | FAILED
    observation_id: uuid.UUID | None = None
    hazard_id: uuid.UUID | None = None
    message: str | None = None


class ObservationBatchResponse(BaseModel):
    results: list[ObservationBatchResultItem]


class ObservationListResponse(BaseModel):
    items: list[ObservationOut]
    total: int


# --------------------------------------------------------------------------
# Earnings / payments (sections 40-42/85/86)
# --------------------------------------------------------------------------


class EarningsBreakdownOut(BaseModel):
    coverage_amount: float
    observation_amount: float
    quality_bonus_amount: float
    total_amount: float


class EarningsSummaryOut(BaseModel):
    today: float
    this_week: float
    this_month: float
    breakdown_today: EarningsBreakdownOut


class PaymentOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    status: EarningStatus
    total_amount: float
    computed_at: datetime | None
    paid_at: datetime | None

    model_config = {"from_attributes": True}


class PaymentListResponse(BaseModel):
    items: list[PaymentOut]
    total: int
