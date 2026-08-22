import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import MediaKind


class HazardMedia(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "hazard_media"

    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="CASCADE"), nullable=False, index=True)
    kind: Mapped[MediaKind] = mapped_column(String(16), default=MediaKind.IMAGE, nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)

    hazard: Mapped["Hazard"] = relationship(back_populates="media")


from app.models.hazard import Hazard  # noqa: E402
