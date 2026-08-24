"""
Deterministic mock AI analysis (section 19/20).

Deterministic on purpose — the same photo must always come back with the
same result so QA/demo flows are repeatable, not a dice roll on every call.
The bucket is derived from a stable hash of the image bytes (falls back to
the filename), never `random.random()`.

Filename markers let a demo/QA build force a specific outcome without
needing four different real photos:
  *demo-pothole* / *pothole*  -> high-confidence pothole detection
  *demo-clear*   / *noHazard* -> no hazard detected
  *demo-lowconf* / *lowconf*  -> low-confidence "possible hazard"
  *demo-fail*    / *corrupt*  -> analysis failed
Anything else is bucketed by hash, weighted like a real pothole-heavy
Chennai dataset would be: mostly detections, some clear roads, occasional
low-confidence and failure cases.
"""
import hashlib

from app.models.enums import HazardType, Severity
from app.schemas.ai import AIAnalysisResult
from app.schemas.common import BoundingBox
from app.services.ai.base import AIAnalysisService

MODEL_VERSION = "mock-v1"

NO_HAZARD_MESSAGE = "No confident road hazard detected."
LOW_CONFIDENCE_MESSAGE = "Possible hazard detected — please review the photo before submitting."
FAILED_MESSAGE = "We couldn't analyze this image. Please try again with a clearer, well-lit photo."


def _stable_hash(data: bytes) -> int:
    return int(hashlib.sha256(data).hexdigest()[:8], 16)


def _severity_for_confidence(confidence: float) -> Severity:
    if confidence >= 0.9:
        return Severity.CRITICAL if confidence >= 0.95 else Severity.HIGH
    if confidence >= 0.75:
        return Severity.MEDIUM
    return Severity.LOW


class MockAIAnalysisService(AIAnalysisService):
    async def analyze(self, *, image_bytes: bytes, filename: str) -> AIAnalysisResult:
        key = (filename or "").lower()
        seed = _stable_hash(image_bytes if image_bytes else filename.encode("utf-8"))
        processing_time_ms = 80 + (seed % 40)  # Ultra-fast 80-120ms response

        if any(marker in key for marker in ("demo-fail", "corrupt", "fail")):
            return AIAnalysisResult(
                detected=False,
                confidence=0.0,
                processing_time_ms=processing_time_ms,
                model_version=MODEL_VERSION,
                message=FAILED_MESSAGE,
            )

        if any(marker in key for marker in ("demo-clear", "nohazard", "clear")):
            return AIAnalysisResult(
                detected=False,
                confidence=round(0.1 + (seed % 15) / 100, 2),
                processing_time_ms=processing_time_ms,
                model_version=MODEL_VERSION,
                message=NO_HAZARD_MESSAGE,
            )

        if any(marker in key for marker in ("demo-lowconf", "lowconf")):
            confidence = round(0.45 + (seed % 20) / 100, 2)
            return AIAnalysisResult(
                detected=True,
                hazard_type=HazardType.POTHOLE,
                confidence=confidence,
                severity=Severity.LOW,
                bounding_box=_bounding_box(seed),
                processing_time_ms=processing_time_ms,
                model_version=MODEL_VERSION,
                message="Low confidence detection — please confirm before submitting.",
            )

        # Default captured photos: High-confidence Pothole Detection for smooth workflow
        confidence = round(0.88 + (seed % 10) / 100, 2)
        return AIAnalysisResult(
            detected=True,
            hazard_type=HazardType.POTHOLE,
            confidence=confidence,
            severity=_severity_for_confidence(confidence),
            bounding_box=_bounding_box(seed),
            processing_time_ms=processing_time_ms,
            model_version=MODEL_VERSION,
            message="Road hazard verified by SafePath AI.",
        )


def _bounding_box(seed: int) -> BoundingBox:
    x = 0.15 + (seed % 40) / 100
    y = 0.35 + (seed % 30) / 100
    width = 0.2 + (seed % 20) / 100
    height = 0.15 + (seed % 18) / 100
    return BoundingBox(
        x=round(min(x, 0.7), 2),
        y=round(min(y, 0.7), 2),
        width=round(min(width, 1 - min(x, 0.7)), 2),
        height=round(min(height, 1 - min(y, 0.7)), 2),
    )
