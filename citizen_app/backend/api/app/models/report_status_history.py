import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import HazardStatus


class ReportStatusHistory(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """Append-only audit trail — this is what powers the "Submitted / Under
    Review / Verified / Resolved" timeline on the report detail screen."""

    __tablename__ = "report_status_history"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("citizen_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[HazardStatus] = mapped_column(String(24), nullable=False)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changed_by: Mapped[str] = mapped_column(String(64), default="SYSTEM", nullable=False)

    report: Mapped["CitizenReport"] = relationship(back_populates="status_history")


from app.models.citizen_report import CitizenReport  # noqa: E402
