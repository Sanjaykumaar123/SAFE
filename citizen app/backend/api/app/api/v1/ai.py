"""
POST /ai/analyze — currently backed by MockAIAnalysisService
(AI_PROVIDER=mock). Response shape is the section-51 contract a future
YOLOv8 service must also satisfy; the mobile app already renders this exact
structure, so swapping the provider later requires no UI change.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.ai_analysis import AIAnalysis
from app.models.enums import AIProvider
from app.models.user import User
from app.schemas.ai import AIAnalysisResult
from app.services.ai import get_ai_service
from app.services.storage import get_storage_service

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze", response_model=AIAnalysisResult)
async def analyze_image(
    image: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AIAnalysisResult:
    if not (image.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Please provide an image file.")

    file_bytes = await image.read()
    if len(file_bytes) == 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Uploaded image is empty.")

    storage = get_storage_service()
    image_url = await storage.upload(file_bytes=file_bytes, filename=image.filename or "capture.jpg", content_type=image.content_type)

    service = get_ai_service()
    result = await service.analyze(image_bytes=file_bytes, filename=image.filename or "")

    analysis = AIAnalysis(
        provider=AIProvider.MOCK,
        image_url=image_url,
        detected=result.detected,
        hazard_type=result.hazard_type,
        confidence=result.confidence,
        severity=result.severity,
        bounding_box=result.bounding_box.model_dump() if result.bounding_box else None,
        processing_time_ms=result.processing_time_ms,
        model_version=result.model_version,
        message=result.message,
    )
    db.add(analysis)
    await db.commit()

    return result
