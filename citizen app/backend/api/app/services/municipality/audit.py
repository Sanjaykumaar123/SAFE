"""Section 71 — the single place an `AuditLog` row is written. Called from
route handlers after a state change succeeds; never read back from a route
handler (audit logs are write-mostly)."""
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    municipality_id: uuid.UUID | None,
    city_id: uuid.UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            municipality_id=municipality_id,
            city_id=city_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            action_metadata=metadata,
        )
    )
    # Deliberately no commit here — the caller's route handler commits once,
    # atomically, alongside the actual state change this log entry records.
