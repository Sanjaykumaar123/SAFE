import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class HazardVerification(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """Future-ready placeholder for the Admin app (section 37/61) — records
    who/what corroborated a hazard (admin review, fleet consensus, repeat
    community reports). The citizen-facing "Recently verified by SafePath
    road observations" copy is derived from the presence of these rows,
    never from wording that leaks the source (see section 46)."""

    __tablename__ = "hazard_verifications"

    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)
    verified_by: Mapped[str] = mapped_column(String(64), nullable=False)
    verification_source: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
