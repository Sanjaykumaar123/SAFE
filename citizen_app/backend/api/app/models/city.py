import uuid

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class City(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "cities"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str] = mapped_column(String(120), default="India", nullable=False)
    center_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    center_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Added for the Municipality app (section 04/66) — the short id used in
    # `municipalities.code`-style URLs/params ("CHN", "CBE", "MDU") and the
    # city switcher. Nullable + not-unique-enforced at the DB level so the
    # citizen app's ad-hoc `_get_or_create_city(name)` (backend/api/app/api/v1/auth.py)
    # keeps working untouched for cities that don't have one yet.
    code: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
