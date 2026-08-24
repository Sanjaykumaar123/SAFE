import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import RepairPriority, RepairStatus


class Repair(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    A municipal repair job against one `Hazard` (sections 33/34/54 — "one
    hazard can have one active repair at a time"). `repair_code` is the
    human-facing id (`R-1029`) shown throughout the app.
    """

    __tablename__ = "repairs"

    repair_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)
    city_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=False, index=True)
    municipality_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("municipalities.id"), nullable=False, index=True)

    department: Mapped[str] = mapped_column(String(120), nullable=False)
    zone: Mapped[str | None] = mapped_column(String(120), nullable=True)
    team: Mapped[str | None] = mapped_column(String(120), nullable=True)
    assigned_officer_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    assigned_officer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    priority: Mapped[RepairPriority] = mapped_column(String(16), default=RepairPriority.MEDIUM, nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[RepairStatus] = mapped_column(String(24), default=RepairStatus.ASSIGNED, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    progress_entries: Mapped[list["RepairProgress"]] = relationship(back_populates="repair", cascade="all, delete-orphan", order_by="RepairProgress.created_at")
