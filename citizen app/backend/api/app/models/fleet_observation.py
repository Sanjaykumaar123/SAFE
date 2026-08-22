import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utcnow
from app.models.geo import LatLngMixin, geography_point_column


class FleetObservation(TimestampMixin, UUIDPrimaryKeyMixin, LatLngMixin, Base):
    """
    A vehicle passively observing a road segment (section 24/26) — the
    Fleet Operator app is not built yet, so this is populated by the
    municipality demo seed for now (`scripts/seed_municipality.py`). Fields
    beyond the original placeholder (`observation_state`, `image_url`,
    `severity`, `bounding_box`, `road_id`, `operator_id`, `data_quality`)
    were added additively for the Municipality app's "last 5 vehicle
    observations" / road-condition verification feature (section 26/27) —
    nothing here changes what already existed.
    """

    __tablename__ = "fleet_observations"

    hazard_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("hazards.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_id: Mapped[str] = mapped_column(String(64), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Municipality app additions ---
    location = geography_point_column()
    road_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("roads.id"), nullable=True, index=True)
    operator_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    observation_state: Mapped[str | None] = mapped_column(String(16), nullable=True)  # ObservationState: DETECTED | CLEAR
    severity: Mapped[str | None] = mapped_column(String(16), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    bounding_box: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    data_quality: Mapped[str | None] = mapped_column(String(16), nullable=True)  # HIGH | MEDIUM | LOW

    # --- Fleet Operator app additions ---
    # `vehicle_id`/`operator_id` above stay free-text and untouched (the
    # municipality demo seed still writes them that way) — these are the
    # real FKs the Fleet Operator app populates going forward. Nullable so
    # existing/seeded rows without them keep working unchanged.
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("collection_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True, index=True)
    operator_ref_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("fleet_operator_profiles.id"), nullable=True, index=True)
    # Idempotency key (§60/95) — a retried batch upload must not create a
    # second observation for the same on-device detection.
    client_observation_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    hazard_type: Mapped[str | None] = mapped_column(String(32), nullable=True)  # HazardType — defaults to POTHOLE client-side (§06)
    model_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gps_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
