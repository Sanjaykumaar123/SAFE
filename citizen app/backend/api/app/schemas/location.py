import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import SavedLocationLabel


class SavedLocationCreateRequest(BaseModel):
    label: SavedLocationLabel
    custom_label: str | None = Field(default=None, max_length=64)
    address: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class SavedLocationOut(BaseModel):
    id: uuid.UUID
    label: SavedLocationLabel
    custom_label: str | None
    address: str
    latitude: float
    longitude: float
    created_at: datetime

    model_config = {"from_attributes": True}


class LocationSearchResult(BaseModel):
    label: str
    subtitle: str | None
    latitude: float
    longitude: float
    kind: str  # ROAD | AREA | LANDMARK | CITY | HAZARD
