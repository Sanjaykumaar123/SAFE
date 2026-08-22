"""AI provider factory — the ONLY place code branches on `AI_PROVIDER`."""
from functools import lru_cache

from app.core.config import settings
from app.services.ai.base import AIAnalysisService
from app.services.ai.mock import MockAIAnalysisService


@lru_cache
def get_ai_service() -> AIAnalysisService:
    if settings.AI_PROVIDER == "yolov8":
        # Imported lazily so `ultralytics`/`torch` (heavy, GPU-toolchain
        # dependencies) are only ever imported in processes that actually
        # run real inference — `AI_PROVIDER=mock` deployments/tests never
        # need them installed at all.
        from app.services.ai.yolo_service import YOLOAIAnalysisService

        return YOLOAIAnalysisService()
    return MockAIAnalysisService()
