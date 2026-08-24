"""GET /, PATCH /{id}/read, POST /device-tokens."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.device_token import DeviceToken
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import DeviceTokenRegisterRequest, NotificationListResponse, NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(50, gt=0, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = [NotificationOut.model_validate(n) for n in result.scalars().all()]

    unread_result = await db.execute(
        select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
    )
    unread_count = unread_result.scalar_one()

    return NotificationListResponse(items=items, unread_count=unread_count)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationOut:
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    notification = result.scalar_one_or_none()
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return NotificationOut.model_validate(notification)


@router.post("/device-tokens", status_code=status.HTTP_204_NO_CONTENT)
async def register_device_token(
    payload: DeviceTokenRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Registration infrastructure only (section 33) — nothing here sends a
    real push. `expo-notifications` on the mobile app obtains the token and
    posts it here; a future job can read `device_tokens` to fan out via the
    Expo Push Service once that's wired up.
    """
    existing = await db.execute(select(DeviceToken).where(DeviceToken.expo_push_token == payload.expo_push_token))
    token_row = existing.scalar_one_or_none()
    if token_row is None:
        db.add(DeviceToken(user_id=current_user.id, expo_push_token=payload.expo_push_token, platform=payload.platform))
    else:
        token_row.user_id = current_user.id
        token_row.platform = payload.platform
        token_row.is_active = True
    await db.commit()
    return None
