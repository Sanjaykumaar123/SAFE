import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import HazardStatus, HazardType, Severity
from app.models.geo import LatLngMixin, geography_point_column


class CitizenReport(TimestampMixin, UUIDPrimaryKeyMixin, LatLngMixin, Base):
    """
    What a citizen submitted. Always attached to exactly one `Hazard` (the
    report either creates a new hazard or, later, an admin may mark it a
    DUPLICATE of an existing one — the hazard_id then gets repointed).
    `status` mirrors the parent hazard's status at submit time and moves
    independently only in edge cases (e.g. REJECTED/DUPLICATE); the mobile
    "My Reports" timeline reads `report_status_history`, not this column
    alone.
    """

    __tablename__ = "citizen_reports"

    report_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)

    hazard_type: Mapped[HazardType] = mapped_column(String(32), nullable=False)
    severity: Mapped[Severity] = mapped_column(String(16), nullable=False)
    status: Mapped[HazardStatus] = mapped_column(String(24), default=HazardStatus.REPORTED, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    location = geography_point_column()
    location_text: Mapped[str] = mapped_column(String(255), nullable=False)
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)

    ai_analysis_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_analyses.id", ondelete="SET NULL"), nullable=True)
    client_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    hazard: Mapped["Hazard"] = relationship(back_populates="reports")
    media: Mapped[list["ReportMedia"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    status_history: Mapped[list["ReportStatusHistory"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="ReportStatusHistory.created_at"
    )


from app.models.hazard import Hazard  # noqa: E402
