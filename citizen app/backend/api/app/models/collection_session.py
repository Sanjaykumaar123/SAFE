import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utcnow
from app.models.enums import CollectionSessionStatus


class CollectionSession(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    """
    One drive/trip (§21/36) — groups every `FleetObservation` created while
    it's active via `FleetObservation.session_id`. Distance is
    client-reported (`reported_distance_km`, from the device's own GPS
    samples — this backend does not independently store a full GPS trail
    yet) and sanity-checked at stop time against elapsed duration
    (`app/services/fleet/earnings.py`) rather than trusted outright; the
    backend-accepted figure lands in `validated_distance_km`.
    """

    __tablename__ = "collection_sessions"

    operator_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("fleet_operator_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False, index=True)
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("cities.id"), nullable=True, index=True)
    zone_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default=CollectionSessionStatus.ACTIVE.value, nullable=False, index=True)

    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    start_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    start_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    end_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    end_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    reported_distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    validated_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    observation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_observation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    data_quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..100
    device_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Idempotency: a retried "start session" request (e.g. after a flaky
    # network response) must not create a second ACTIVE session for the
    # same drive — see app/api/v1/fleet/sessions.py.
    client_session_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
