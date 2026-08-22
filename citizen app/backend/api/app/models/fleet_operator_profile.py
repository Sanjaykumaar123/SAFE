import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DEFAULT_FLEET_PERMISSIONS_BY_ROLE, FleetOperatorRole


class FleetOperatorProfile(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    The fleet-operator counterpart to `CitizenProfile`/`MunicipalityProfile`
    — `users.role == UserRole.FLEET_OPERATOR` points here for its
    operational context: which city/zone the operator collects in, which
    vehicle they're currently assigned, and a flat permission list issued at
    login/`/fleet/me` (same MVP pattern as municipality officers).
    """

    __tablename__ = "fleet_operator_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    operator_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)  # e.g. "OP-0042"
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True)
    zone_name: Mapped[str | None] = mapped_column(String(120), nullable=True)  # e.g. "Chennai South" — no Zone model yet, mirrors Road's minimal-placeholder approach
    assigned_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    operator_role: Mapped[str] = mapped_column(String(32), default=FleetOperatorRole.DRIVER.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship()

    @property
    def permissions(self) -> list[str]:
        return DEFAULT_FLEET_PERMISSIONS_BY_ROLE.get(self.operator_role, DEFAULT_FLEET_PERMISSIONS_BY_ROLE[FleetOperatorRole.DRIVER.value])


from app.models.user import User  # noqa: E402
