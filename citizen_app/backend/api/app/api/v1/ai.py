"""
AI router for SafePath AI backend.
Provides endpoints for AI photo analysis, fleet inference, AI health, and debug diagnostics.
"""
import base64
import time
from typing import Any, Optional
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.ai_analysis import AIAnalysis
from app.models.enums import AIProvider
from app.schemas.ai import AIAnalysisResult
from app.services.ai import get_ai_service
from app.services.storage import get_storage_service

router = APIRouter(prefix="/ai", tags=["ai"])


from pydantic import BaseModel, Field


class Base64InferenceRequest(BaseModel):
    imageBase64: Optional[str] = Field(None, alias="image_base64")
    confidenceThreshold: Optional[float] = Field(None, alias="confidence_threshold")
    iouThreshold: Optional[float] = Field(None, alias="iou_threshold")

    model_config = {
        "populate_by_name": True,
        "extra": "ignore",
    }



@router.get("/health")
async def ai_health() -> dict[str, Any]:
    """Section 51 requirement: AI Health Endpoint"""
    service = get_ai_service()
    is_yolo = settings.AI_PROVIDER == "yolov8"
    model_version = settings.AI_MODEL_PATH if is_yolo else "mock-v1"

    return {
        "status": "healthy",
        "provider": settings.AI_PROVIDER,
        "model_loaded": True,
        "model_path": settings.AI_MODEL_PATH,
        "model_version": model_version,
        "device": settings.AI_DEVICE,
        "imgsz": settings.AI_IMAGE_SIZE,
        "conf_threshold": settings.AI_DETECTION_CONFIDENCE,
        "iou_threshold": settings.AI_IOU_THRESHOLD,
    }


@router.post("/analyze", response_model=AIAnalysisResult)
async def analyze_image(
    request: Request,
    image: Optional[UploadFile] = File(None),
    payload: Optional[Base64InferenceRequest] = Body(None),
    current_user: Any = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> AIAnalysisResult:
    file_bytes: bytes = b""
    filename: str = "capture.jpg"
    content_type: str = "image/jpeg"

    if isinstance(image, UploadFile):
        file_bytes = await image.read()
        filename = image.filename or filename
        content_type = image.content_type or content_type

    if not file_bytes:
        try:
            body_json = await request.json()
            if isinstance(body_json, dict):
                b64_str = body_json.get("imageBase64") or body_json.get("image_base64") or body_json.get("imageBase64Data")
                if b64_str:
                    if "," in b64_str:
                        b64_str = b64_str.split(",", 1)[1]
                    file_bytes = base64.b64decode(b64_str)
        except Exception:
            pass

    if not file_bytes and isinstance(payload, Base64InferenceRequest) and payload.imageBase64:
        raw_b64 = payload.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(raw_b64)

    if not file_bytes:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Must provide either multipart 'image' file or JSON body with 'imageBase64'.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Image payload is empty.")

    storage = get_storage_service()
    image_url = await storage.upload(file_bytes=file_bytes, filename=filename, content_type=content_type)

    service = get_ai_service()
    result = await service.analyze(image_bytes=file_bytes, filename=filename)

    provider_enum = AIProvider.YOLOV8 if settings.AI_PROVIDER == "yolov8" else AIProvider.MOCK

    try:
        analysis = AIAnalysis(
            provider=provider_enum,
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
    except Exception as e:
        logger.warning(f"Could not persist AI analysis record to DB: {e}")
        await db.rollback()

    return result


@router.post("/detect", response_model=AIAnalysisResult)
async def detect_base64_or_form(
    request: Request,
    image: Optional[UploadFile] = File(None),
    payload: Optional[Base64InferenceRequest] = Body(None),
) -> AIAnalysisResult:
    file_bytes: bytes = b""
    filename: str = "frame.jpg"

    if isinstance(image, UploadFile):
        file_bytes = await image.read()
        filename = image.filename or filename

    if not file_bytes:
        try:
            body_json = await request.json()
            if isinstance(body_json, dict):
                b64_str = body_json.get("imageBase64") or body_json.get("image_base64") or body_json.get("imageBase64Data")
                if b64_str:
                    if "," in b64_str:
                        b64_str = b64_str.split(",", 1)[1]
                    file_bytes = base64.b64decode(b64_str)
        except Exception:
            pass

    if not file_bytes and isinstance(payload, Base64InferenceRequest) and payload.imageBase64:
        raw_b64 = payload.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(raw_b64)

    if not file_bytes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Missing image payload.")

    service = get_ai_service()
    return await service.analyze(image_bytes=file_bytes, filename=filename)


@router.post("/debug/inference")
async def debug_inference(
    request: Request,
    image: Optional[UploadFile] = File(None),
    payload: Optional[Base64InferenceRequest] = Body(None),
) -> dict[str, Any]:
    """Section 15 requirement: AI Debug Endpoint for developer diagnostics"""
    start_total = time.perf_counter()

    file_bytes: bytes = b""
    if isinstance(image, UploadFile):
        file_bytes = await image.read()

    if not file_bytes:
        try:
            body_json = await request.json()
            if isinstance(body_json, dict):
                b64_str = body_json.get("imageBase64") or body_json.get("image_base64") or body_json.get("imageBase64Data")
                if b64_str:
                    if "," in b64_str:
                        b64_str = b64_str.split(",", 1)[1]
                    file_bytes = base64.b64decode(b64_str)
        except Exception:
            pass

    if not file_bytes and payload is not None and payload.imageBase64:
        raw_b64 = payload.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        file_bytes = base64.b64decode(raw_b64)

    if not file_bytes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide an image file or imageBase64 payload.")

    service = get_ai_service()
    result = await service.analyze(image_bytes=file_bytes, filename="debug.jpg")
    total_latency_ms = int((time.perf_counter() - start_total) * 1000)

    return {
        "success": True,
        "model": "YOLOv8",
        "model_path": settings.AI_MODEL_PATH,
        "model_version": result.model_version,
        "device": settings.AI_DEVICE,
        "imgsz": settings.AI_IMAGE_SIZE,
        "conf_threshold": settings.AI_DETECTION_CONFIDENCE,
        "iou_threshold": settings.AI_IOU_THRESHOLD,
        "image_bytes_len": len(file_bytes),
        "image_width": result.image_width,
        "image_height": result.image_height,
        "inference_latency_ms": result.processing_time_ms,
        "total_latency_ms": total_latency_ms,
        "detection_count": len(result.detections),
        "detected": result.detected,
        "top_confidence": result.confidence,
        "top_severity": result.severity,
        "detections": [d.model_dump() for d in result.detections],
    }
