import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import SavedLocationLabel
from app.models.geo import LatLngMixin, geography_point_column


class SavedLocation(TimestampMixin, UUIDPrimaryKeyMixin, LatLngMixin, Base):
    __tablename__ = "saved_locations"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[SavedLocationLabel] = mapped_column(String(16), nullable=False)
    custom_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    location = geography_point_column()
