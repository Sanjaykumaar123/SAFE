import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MunicipalityAction(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    A municipal operational action against a hazard (section 05/54) — repair
    assignment, progress update, status change, inspection decision, etc.
    This is the backbone of `GET /municipality/hazards/{id}/timeline`:
    ordered by `created_at`, it *is* the hazard's history — never derived
    from overwriting a single "current status" column.

    `from_status`/`to_status`/`action_metadata`/`performed_by_user_id` were
    added additively for the Municipality app; `action_type`/`notes`/
    `performed_by` are the original placeholder fields and are unchanged.
    """

    __tablename__ = "municipality_actions"

    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # --- Municipality app additions ---
    performed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    from_status: Mapped[str | None] = mapped_column(String(24), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(24), nullable=True)
    action_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
