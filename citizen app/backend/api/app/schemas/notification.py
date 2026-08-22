import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import NotificationType


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: NotificationType
    title: str
    body: str
    is_read: bool
    related_hazard_id: uuid.UUID | None
    related_report_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    unread_count: int


class DeviceTokenRegisterRequest(BaseModel):
    expo_push_token: str
    platform: str
