"""
Real YOLO pothole-detection service for SafePath AI backend.
Loads fine-tuned YOLO pothole detection weights (`pothole_v2_final.pt` / `best.pt`)
and runs inference in-process via `ultralytics`.
"""
import base64
import io
import logging
import time
from functools import lru_cache
from pathlib import Path

import httpx
from PIL import Image, ImageOps

from app.core.config import settings
from app.models.enums import HazardType, Severity
from app.schemas.ai import AIDetectionItem, AIAnalysisResult, BoundingBoxXYXY
from app.schemas.common import BoundingBox
from app.services.ai.base import AIAnalysisService

logger = logging.getLogger("safepath.ai")

NO_HAZARD_MESSAGE = "No confident road hazard detected."


def _resolve_model_path() -> Path:
    path = Path(settings.AI_MODEL_PATH)
    if not path.is_absolute():
        base_dir = Path(__file__).resolve().parents[3]
        resolved = base_dir / path
        if not resolved.exists():
            workspace_model = base_dir.parents[1] / "ai_model" / "models" / "pothole_v2_final.pt"
            if workspace_model.exists():
                return workspace_model
        return resolved
    return path


def _load_model():
    import torch
    from ultralytics import YOLO

    model_path = _resolve_model_path()
    if not model_path.exists():
        raise FileNotFoundError(
            f"AI_MODEL_PATH does not exist: {model_path}. Point AI_MODEL_PATH in .env at a "
            "valid YOLO .pt checkpoint, or set AI_PROVIDER=mock to use MockAIAnalysisService."
        )

    if settings.AI_DEVICE == "auto":
        device = 0 if torch.cuda.is_available() else "cpu"
    else:
        device = settings.AI_DEVICE

    model = YOLO(str(model_path))
    model_version = model_path.name

    print("\n" + "=" * 60)
    print("      SAFEPATH AI MODEL INITIALIZATION DIAGNOSTIC      ")
    print("=" * 60)
    print(f"  MODEL PATH          : {model_path}")
    print(f"  MODEL VERSION       : {model_version}")
    print(f"  MODEL TASK          : {getattr(model, 'task', 'detect')}")
    print(f"  CLASS NAMES         : {model.names}")
    print(f"  DEVICE              : {device}")
    print(f"  IMAGE SIZE (imgsz)  : {settings.AI_IMAGE_SIZE}")
    print(f"  CONFIDENCE THRESHOLD: {settings.AI_DETECTION_CONFIDENCE}")
    print(f"  IOU THRESHOLD       : {settings.AI_IOU_THRESHOLD}")
    print("=" * 60 + "\n", flush=True)

    return model, device, model_version


@lru_cache
def _get_model_and_device():
    return _load_model()


def _severity_for_box(area_pct: float, near_bottom: bool) -> Severity:
    if area_pct > 6.0:
        return Severity.CRITICAL
    if area_pct > 4.0 or (near_bottom and area_pct > 2.5):
        return Severity.HIGH
    if area_pct > 1.5:
        return Severity.MEDIUM
    return Severity.LOW


class YOLOAIAnalysisService(AIAnalysisService):
    async def analyze(self, *, image_bytes: bytes, filename: str) -> AIAnalysisResult:
        start = time.perf_counter()

        raw_img = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(raw_img).convert("RGB")
        width, height = image.size

        # 1. Try remote AI server microservice API URL (e.g. http://localhost:8001/api/detect)
        ai_server_url = getattr(settings, "AI_SERVER_URL", "http://localhost:8001")
        if ai_server_url:
            try:
                b64_str = base64.b64encode(image_bytes).decode("utf-8")
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        f"{ai_server_url.rstrip('/')}/api/detect",
                        json={
                            "imageBase64": b64_str,
                            "confidenceThreshold": settings.AI_DETECTION_CONFIDENCE,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        processing_time_ms = int((time.perf_counter() - start) * 1000)
                        raw_dets = data.get("detections") or []
                        
                        detections: list[AIDetectionItem] = []
                        for d in raw_dets:
                            bbox = d.get("bbox") or d.get("normalized_bbox") or d.get("normalizedBbox") or {}
                            if isinstance(bbox, dict):
                                bx = float(bbox.get("x") or bbox.get("x1") or 0.0)
                                by = float(bbox.get("y") or bbox.get("y1") or 0.0)
                                bw = float(bbox.get("width") or bbox.get("w") or 0.3)
                                bh = float(bbox.get("height") or bbox.get("h") or 0.3)
                            else:
                                bx, by, bw, bh = 0.1, 0.1, 0.3, 0.3

                            norm_box = BoundingBox(
                                x=max(0.0, min(1.0, bx)),
                                y=max(0.0, min(1.0, by)),
                                width=max(0.0, min(1.0, bw)),
                                height=max(0.0, min(1.0, bh)),
                            )
                            conf_val = float(d.get("confidence") or d.get("conf") or 0.85)
                            detections.append(
                                AIDetectionItem(
                                    class_id=0,
                                    class_name=str(d.get("class") or d.get("class_name") or "pothole").lower(),
                                    confidence=round(conf_val, 4),
                                    bbox=BoundingBoxXYXY(
                                        x1=round(bx * width, 1),
                                        y1=round(by * height, 1),
                                        x2=round((bx + bw) * width, 1),
                                        y2=round((by + bh) * height, 1),
                                    ),
                                    normalized_bbox=norm_box,
                                )
                            )

                        detected = bool(data.get("detected") or len(detections) > 0)
                        top_conf = float(data.get("confidence") or (detections[0].confidence if detections else 0.0))
                        top_sev_raw = str(data.get("severity") or "MEDIUM").upper()
                        top_sev = Severity.CRITICAL if "CRITICAL" in top_sev_raw or "HIGH" in top_sev_raw else Severity.MEDIUM

                        return AIAnalysisResult(
                            success=True,
                            detected=detected,
                            hazard_type=HazardType.POTHOLE if detected else None,
                            confidence=top_conf,
                            severity=top_sev if detected else None,
                            bounding_box=detections[0].normalized_bbox if detections else None,
                            processing_time_ms=processing_time_ms,
                            model_version="safepath-ai-server-v2 (http://localhost:8001)",
                            image_width=width,
                            image_height=height,
                            detections=detections,
                        )
            except Exception as ex:
                logger.warning(f"AI server API endpoint ({ai_server_url}) unavailable: {ex}. Falling back to in-process YOLO.")

        results = model.predict(
            source=image,
            conf=settings.AI_DETECTION_CONFIDENCE,
            iou=settings.AI_IOU_THRESHOLD,
            imgsz=settings.AI_IMAGE_SIZE,
            device=device,
            verbose=False,
        )[0]

        processing_time_ms = int((time.perf_counter() - start) * 1000)

        if results.boxes is None or len(results.boxes) == 0:
            return AIAnalysisResult(
                success=True,
                detected=False,
                confidence=0.0,
                processing_time_ms=processing_time_ms,
                model_version=model_version,
                message=NO_HAZARD_MESSAGE,
                image_width=width,
                image_height=height,
                detections=[],
            )

        boxes_data = results.boxes.xyxy.cpu().numpy()
        confs = results.boxes.conf.cpu().numpy()
        cls_ids = results.boxes.cls.cpu().numpy() if results.boxes.cls is not None else [0] * len(boxes_data)

        detections: list[AIDetectionItem] = []
        for i, box in enumerate(boxes_data):
            x1, y1, x2, y2 = [float(v) for v in box]
            conf = float(confs[i])
            cls_id = int(cls_ids[i])
            cls_name = str(model.names.get(cls_id, "pothole")).lower()

            norm_box = BoundingBox(
                x=max(0.0, min(1.0, x1 / width)),
                y=max(0.0, min(1.0, y1 / height)),
                width=max(0.0, min(1.0, (x2 - x1) / width)),
                height=max(0.0, min(1.0, (y2 - y1) / height)),
            )

            detections.append(
                AIDetectionItem(
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=round(conf, 4),
                    bbox=BoundingBoxXYXY(x1=round(x1, 1), y1=round(y1, 1), x2=round(x2, 1), y2=round(y2, 1)),
                    normalized_bbox=norm_box,
                )
            )

        best_idx = int(confs.argmax())
        top_det = detections[best_idx]
        box_w, box_h = top_det.bbox.x2 - top_det.bbox.x1, top_det.bbox.y2 - top_det.bbox.y1
        area_pct = (box_w * box_h) / (width * height) * 100
        near_bottom = (top_det.bbox.y2 / height) > 0.7
        severity = _severity_for_box(area_pct, near_bottom)

        return AIAnalysisResult(
            success=True,
            detected=True,
            hazard_type=HazardType.POTHOLE,
            confidence=top_det.confidence,
            severity=severity,
            bounding_box=top_det.normalized_bbox,
            processing_time_ms=processing_time_ms,
            model_version=model_version,
            image_width=width,
            image_height=height,
            detections=detections,
        )
