from sqlalchemy import Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AIProvider, HazardType, Severity


class AIAnalysis(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    One row per AI analysis run (mock today, YOLOv8 later — see
    app/services/ai/). Deliberately has NO foreign key back to
    `citizen_reports` — analysis happens *before* the report is submitted,
    in the preview -> analyze -> result step of the report flow, so the
    reference is one-directional: `citizen_reports.ai_analysis_id` points
    here once the report is created. (A back-reference would create a
    circular FK between the two tables.)
    """

    __tablename__ = "ai_analyses"

    provider: Mapped[AIProvider] = mapped_column(String(16), default=AIProvider.MOCK, nullable=False)
    image_url: Mapped[str] = mapped_column(String(1024), nullable=False)

    detected: Mapped[bool] = mapped_column(nullable=False)
    hazard_type: Mapped[HazardType | None] = mapped_column(String(32), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[Severity | None] = mapped_column(String(16), nullable=True)
    bounding_box: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    processing_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str | None] = mapped_column(String(500), nullable=True)
