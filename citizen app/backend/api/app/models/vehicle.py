import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import VehicleStatus


class Vehicle(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    A fleet vehicle (Fleet Operator app). One `FleetOperatorProfile` is
    assigned a vehicle via `FleetOperatorProfile.assigned_vehicle_id` — the
    FK lives on the profile (mirrors `MunicipalityProfile.default_city_id`
    pointing outward) rather than here, since a vehicle can be reassigned
    across operators over time without touching this row.
    """

    __tablename__ = "vehicles"

    registration_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(16), default=VehicleStatus.ACTIVE.value, nullable=False)
    vehicle_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
