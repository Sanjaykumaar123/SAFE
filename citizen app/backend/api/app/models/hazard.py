import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utcnow
from app.models.enums import HazardSource, HazardStatus, HazardType, Severity
from app.models.geo import LatLngMixin, geography_point_column


class Hazard(TimestampMixin, UUIDPrimaryKeyMixin, LatLngMixin, Base):
    """
    The single hazard entity every app in the SafePath ecosystem reads from.
    Citizen reports create/attach to a Hazard; later, fleet observations and
    municipality/admin actions update the *same* row — this table is never
    citizen-scoped.
    """

    __tablename__ = "hazards"

    # Added for the Municipality app (sections 28-30/65/67/86 all reference
    # a human-facing "PTH-1029" hazard id in search/URLs/demo copy).
    # Nullable: the citizen report-creation path this backend already ships
    # is untouched by this change and doesn't set it, so older/citizen-only
    # rows can be null — `app/services/municipality/serializers.py` falls
    # back to a short id-derived label for display when it is. Not the same
    # thing as `citizen_reports.report_code` (that's the *report's* code;
    # this is the *hazard's* — usually equal in the common "first report
    # creates the hazard" case, but a hazard can outlive/outnumber any one
    # report).
    hazard_code: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    type: Mapped[HazardType] = mapped_column(String(32), nullable=False)
    location = geography_point_column()
    location_text: Mapped[str] = mapped_column(String(255), nullable=False)
    road_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    road_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("roads.id"), nullable=True)
    severity: Mapped[Severity] = mapped_column(String(16), nullable=False)
    status: Mapped[HazardStatus] = mapped_column(String(24), default=HazardStatus.REPORTED, nullable=False, index=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[HazardSource] = mapped_column(String(24), default=HazardSource.CITIZEN_REPORT, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True)
    # Added for the Municipality app (section 04/14/22) — Admin/Citizen never
    # set this; the municipality hazard-list/map filters and analytics
    # aggregate by it. Nullable so no backfill migration is required for
    # rows created before wards existed.
    ward_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("wards.id"), nullable=True, index=True)

    last_observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    # --- Privileged fields: only ever written by backend logic (admin/
    # municipality workflows land here later), never accepted from a citizen
    # request body. See app/schemas/hazard.py — no schema exposes these as
    # client-writable. ---
    verified_by_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    municipality_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    media: Mapped[list["HazardMedia"]] = relationship(back_populates="hazard", cascade="all, delete-orphan")
    reports: Mapped[list["CitizenReport"]] = relationship(back_populates="hazard")
