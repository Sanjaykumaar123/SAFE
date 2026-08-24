import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utcnow
from app.models.enums import VerificationMethod


class Resolution(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    A permanent resolution record (sections 39/40/87) — created when a
    hazard is approved as resolved. The hazard row itself is never
    deleted; this table (plus `hazard_status_history` entries recorded as
    `MunicipalityAction` rows) is what preserves the full lifecycle for
    analytics/road-history/accountability.
    """

    __tablename__ = "resolutions"

    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)
    repair_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id"), nullable=True)
    verified_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_media: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    verification_method: Mapped[VerificationMethod] = mapped_column(String(32), default=VerificationMethod.MUNICIPAL_INSPECTION, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="CONFIRMED", nullable=False)
