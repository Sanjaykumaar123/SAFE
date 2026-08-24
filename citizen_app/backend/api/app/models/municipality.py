import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Municipality(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    A municipal authority (section 04) — e.g. "Greater Chennai Corporation".
    `code` is the human-facing municipality ID officers type at login
    (e.g. `MUN-CHN`, matching the product spec's login field). City access is
    NOT a single `city_id` column here on purpose: section 04/66 requires a
    municipality to be authorized for a *set* of cities, enforced server-side
    — see `MunicipalityCityAccess`.
    """

    __tablename__ = "municipalities"

    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True)

    city_access: Mapped[list["MunicipalityCityAccess"]] = relationship(back_populates="municipality", cascade="all, delete-orphan")


class MunicipalityCityAccess(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    The server-enforced tenancy join (section 04/52): which `city_id`s a
    `municipality_id` may ever query. Every `/api/municipality/*` route that
    accepts a `city_id` filter must check the requested id against this
    table for the authenticated officer's municipality — never trust the
    mobile client to only ask for cities it's allowed to see.
    """

    __tablename__ = "municipality_city_access"

    municipality_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("municipalities.id", ondelete="CASCADE"), nullable=False, index=True)
    city_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), nullable=False, index=True)

    municipality: Mapped["Municipality"] = relationship(back_populates="city_access")
