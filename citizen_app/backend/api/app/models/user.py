import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserRole:
    """
    Not a DB enum on purpose — this backend already serves more than the
    citizen persona at the schema level so Admin/Municipality/Fleet apps can
    reuse the same `users` table later without a migration. Only CITIZEN is
    actually exercised by this app.
    """

    CITIZEN = "CITIZEN"
    ADMIN = "ADMIN"
    MUNICIPALITY = "MUNICIPALITY"
    FLEET_OPERATOR = "FLEET_OPERATOR"


class User(TimestampMixin, UUIDPrimaryKeyMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default=UserRole.CITIZEN, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    profile: Mapped["CitizenProfile"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")


from app.models.citizen_profile import CitizenProfile  # noqa: E402
