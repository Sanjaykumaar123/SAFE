import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import InspectionDecision


class Inspection(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    An inspector's decision on a repair marked READY_FOR_INSPECTION
    (section 38): APPROVE_RESOLUTION -> hazard resolves; REQUEST_REWORK ->
    repair goes back to the maintenance team. One row per inspection visit
    — a repair can be inspected, sent back for rework, and inspected again.
    """

    __tablename__ = "inspections"

    repair_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False, index=True)
    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    decision: Mapped[InspectionDecision] = mapped_column(String(24), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
