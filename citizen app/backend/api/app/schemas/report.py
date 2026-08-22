import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import HazardStatus, HazardType, Severity
from app.schemas.ai import AIAnalysisResult


class ReportCreateRequest(BaseModel):
    """
    Body of `POST /api/reports`. Only what a citizen may set — server-
    computed/privileged fields (verified_by_admin, municipality_status,
    resolved_at, report_code, status transitions beyond REPORTED) are never
    accepted here (section 23).
    """

    hazard_type: HazardType
    severity: Severity
    description: str | None = Field(default=None, max_length=1000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_text: str
    city_id: uuid.UUID | None = None
    media_urls: list[str] = Field(default_factory=list, description="URLs returned by POST /api/media/upload")
    ai_analysis: AIAnalysisResult | None = None
    client_timestamp: datetime


class ReportStatusHistoryOut(BaseModel):
    status: HazardStatus
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportOut(BaseModel):
    id: uuid.UUID
    report_code: str
    hazard_id: uuid.UUID
    hazard_type: HazardType
    severity: Severity
    status: HazardStatus
    description: str | None
    latitude: float
    longitude: float
    location_text: str
    media: list[str] = []
    ai_analysis: AIAnalysisResult | None = None
    status_history: list[ReportStatusHistoryOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportListItem(BaseModel):
    id: uuid.UUID
    report_code: str
    hazard_type: HazardType
    severity: Severity
    status: HazardStatus
    location_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    items: list[ReportListItem]
    total: int
