import uuid

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RepairProgress(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    One progress update against a `Repair` (section 37) — note + optional
    photo/location evidence. Additive history only: never overwrites the
    original hazard evidence or a prior progress entry.
    """

    __tablename__ = "repair_progress"

    repair_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    repair: Mapped["Repair"] = relationship(back_populates="progress_entries")


from app.models.repair import Repair  # noqa: E402
