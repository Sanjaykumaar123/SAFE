"""Small shared response envelopes / value objects reused across schemas."""
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Normalized (0..1) box relative to image width/height — matches the
    mobile `AIAnalysisResult.boundingBox` contract exactly (section 18)."""

    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(ge=0, le=1)
    height: float = Field(ge=0, le=1)


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ErrorResponse(BaseModel):
    detail: str
