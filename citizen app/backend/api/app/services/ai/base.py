"""
The AI integration boundary on the backend side — mirrors
`apps/citizen-mobile/services/ai/IAIAnalysisService.ts` exactly. Both the
mock (`mock.py`) and the real YOLO implementation (`yolo_service.py`)
implement the same `POST /api/ai/analyze` <-> `AIAnalysisResult` contract
(section 51); `AI_PROVIDER` in `.env` picks which one `get_ai_service()`
returns (`app/services/ai/__init__.py`) — no route/schema/mobile change
either way.
"""
from abc import ABC, abstractmethod

from app.schemas.ai import AIAnalysisResult


class AIAnalysisService(ABC):
    @abstractmethod
    async def analyze(self, *, image_bytes: bytes, filename: str) -> AIAnalysisResult:
        raise NotImplementedError
