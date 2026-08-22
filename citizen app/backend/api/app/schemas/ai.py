"""
The AI result contract — section 18/51. This shape is what the mock service
returns today AND what a future YOLOv8 service MUST return; the mobile app
and this schema are the only two places that encode the contract.
"""
from pydantic import BaseModel

from app.models.enums import HazardType, Severity
from app.schemas.common import BoundingBox


class AIAnalysisResult(BaseModel):
    detected: bool
    hazard_type: HazardType | None = None
    confidence: float
    severity: Severity | None = None
    bounding_box: BoundingBox | None = None
    processing_time_ms: int
    model_version: str
    message: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "detected": True,
                "hazard_type": "POTHOLE",
                "confidence": 0.94,
                "severity": "HIGH",
                "bounding_box": {"x": 0.32, "y": 0.48, "width": 0.28, "height": 0.22},
                "processing_time_ms": 1850,
                "model_version": "mock-v1",
                "message": None,
            }
        }
    }
