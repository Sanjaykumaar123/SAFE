"""
The AI result contract — section 18/51. This shape is what the mock service
returns today AND what a future YOLOv8 service MUST return; the mobile app
and this schema are the only two places that encode the contract.
"""
from pydantic import BaseModel

from app.models.enums import HazardType, Severity
from app.schemas.common import BoundingBox


class BoundingBoxXYXY(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class AIDetectionItem(BaseModel):
    class_id: int = 0
    class_name: str = "pothole"
    confidence: float
    bbox: BoundingBoxXYXY
    normalized_bbox: BoundingBox


class AIAnalysisResult(BaseModel):
    success: bool = True
    detected: bool
    hazard_type: HazardType | None = None
    confidence: float
    severity: Severity | None = None
    bounding_box: BoundingBox | None = None
    processing_time_ms: int
    model_version: str
    message: str | None = None
    image_width: int | None = None
    image_height: int | None = None
    detections: list[AIDetectionItem] = []

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "detected": True,
                "hazard_type": "POTHOLE",
                "confidence": 0.94,
                "severity": "HIGH",
                "bounding_box": {"x": 0.32, "y": 0.48, "width": 0.28, "height": 0.22},
                "processing_time_ms": 1850,
                "model_version": "pothole_v2_final.pt",
                "message": None,
                "image_width": 1920,
                "image_height": 1080,
                "detections": [
                    {
                        "class_id": 0,
                        "class_name": "pothole",
                        "confidence": 0.94,
                        "bbox": {"x1": 614.4, "y1": 518.4, "x2": 1152.0, "y2": 756.0},
                        "normalized_bbox": {"x": 0.32, "y": 0.48, "width": 0.28, "height": 0.22},
                    }
                ],
            }
        }
    }

