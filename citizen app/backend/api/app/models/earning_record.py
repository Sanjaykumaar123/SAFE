import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import EarningStatus


class EarningRecord(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    One payout record per `CollectionSession` (§40/41/85) — computed only by
    `app/services/fleet/earnings.py` from validated session data, never by
    the mobile app. `PAID` is a manual/admin action this MVP does not
    implement; sessions that pass validation land at `APPROVED` and stay
    there.
    """

    __tablename__ = "earning_records"

    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fleet_operator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("collection_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default=EarningStatus.PENDING.value, nullable=False, index=True)

    coverage_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    observation_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    quality_bonus_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
