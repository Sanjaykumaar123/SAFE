import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Road(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    Minimal placeholder today (name + city). Reserved for a future road-
    segment/geometry model once Municipality/Fleet apps need routing-level
    detail — kept here now so `hazards.road_id` has somewhere to point
    without a later migration reshaping the schema.
    """

    __tablename__ = "roads"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
