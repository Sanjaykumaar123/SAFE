import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DEFAULT_PERMISSIONS_BY_ROLE, MunicipalityOfficerRole


class MunicipalityProfile(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    The municipality-side counterpart to `CitizenProfile` — `users.role ==
    UserRole.MUNICIPALITY` points here for its operational context
    (section 08/13/14): which municipality the officer belongs to, their
    role, and (for MVP) a flat permission list issued at login/`/me` rather
    than hardcoded in the mobile app.
    """

    __tablename__ = "municipality_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    municipality_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("municipalities.id", ondelete="CASCADE"), nullable=False, index=True)
    officer_role: Mapped[str] = mapped_column(String(32), default=MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value, nullable=False)
    default_city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)
    ward_ids: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)  # null/empty = all wards in authorized cities
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship()

    @property
    def permissions(self) -> list[str]:
        return DEFAULT_PERMISSIONS_BY_ROLE.get(self.officer_role, DEFAULT_PERMISSIONS_BY_ROLE[MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value])


from app.models.user import User  # noqa: E402
