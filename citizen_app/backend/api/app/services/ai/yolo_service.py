"""
Real YOLO pothole-detection service for SafePath AI backend.

Primary path: offload inference to the standalone `ai_model/` microservice
over HTTP (`AI_SERVER_URL` in `.env`) — this is the model the APK is meant
to be served by in every environment where `AI_SERVER_URL` is configured.
Fallback path: run the bundled fine-tuned checkpoint (`AI_MODEL_PATH`,
e.g. `pothole_v2_final.pt` / `best.pt`) in-process via `ultralytics`, used
only when no remote server is configured or the remote call fails/times out
— so a flaky/cold/unreachable AI server degrades gracefully instead of
breaking hazard reporting for citizens.
"""
import base64
import io
import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image, ImageFile, ImageOps

ImageFile.LOAD_TRUNCATED_IMAGES = True

from app.core.config import settings
from app.models.enums import HazardType, Severity
from app.schemas.ai import AIDetectionItem, AIAnalysisResult, BoundingBoxXYXY
from app.schemas.common import BoundingBox
from app.services.ai.base import AIAnalysisService

logger = logging.getLogger("safepath.ai")

NO_HAZARD_MESSAGE = "No confident road hazard detected."

# Generous timeout for the remote call: the `ai_model` microservice runs
# YOLO inference on CPU on a free-tier host, which can take 20-30s per
# request (plus a cold-start spin-up of up to ~60s if it had gone idle)
# — a short timeout here would make the remote path fail on every request
# and silently fall back to the bundled local model every time.
_REMOTE_TIMEOUT = httpx.Timeout(75.0, connect=20.0)


def _resolve_model_path() -> Path:
    path = Path(settings.AI_MODEL_PATH)
    if not path.is_absolute():
        base_dir = Path(__file__).resolve().parents[3]
        resolved = base_dir / path
        if not resolved.exists():
            # base_dir is citizen_app/backend/api; the repo root (where the
            # standalone ai_model/ checkpoint lives) is two levels up from
            # citizen_app, i.e. three levels up from base_dir.
            workspace_model = base_dir.parents[2] / "ai_model" / "model" / "pothole_v2_training.pt"
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

        try:
            raw_img = Image.open(io.BytesIO(image_bytes))
            image = ImageOps.exif_transpose(raw_img).convert("RGB")
            width, height = image.size
        except Exception as ex:
            logger.warning(f"Could not decode uploaded image ({filename}): {ex}")
            return AIAnalysisResult(
                success=False,
                detected=False,
                confidence=0.0,
                processing_time_ms=int((time.perf_counter() - start) * 1000),
                model_version="unavailable",
                message="Could not read the uploaded image. Please try again with a clearer photo.",
                image_width=0,
                image_height=0,
                detections=[],
            )

        ai_server_url = getattr(settings, "AI_SERVER_URL", "")

        # Primary path — the deployed ai_model microservice. This is what
        # actually serves the APK whenever AI_SERVER_URL is configured
        # (see .env); the bundled checkpoint below is only a fallback.
        if ai_server_url:
            remote_result = await self._analyze_remote(
                image_bytes=image_bytes,
                width=width,
                height=height,
                start=start,
                ai_server_url=ai_server_url,
            )
            if remote_result is not None:
                return remote_result
            logger.warning(
                f"AI_SERVER_URL ({ai_server_url}) unavailable or timed out; "
                "falling back to the in-process bundled YOLO checkpoint."
            )

        # Fallback path — in-process inference using the bundled checkpoint.
        # Also the only path when AI_SERVER_URL isn't configured at all.
        try:
            return self._analyze_local(image=image, width=width, height=height, start=start)
        except Exception as ex:
            logger.warning(f"In-process YOLO inference failed: {ex}")

        # Both the remote server and the local fallback failed.
        processing_time_ms = int((time.perf_counter() - start) * 1000)
        return AIAnalysisResult(
            success=False,
            detected=False,
            confidence=0.0,
            processing_time_ms=processing_time_ms,
            model_version="unavailable",
            message="AI analysis is temporarily unavailable. Please try again.",
            image_width=width,
            image_height=height,
            detections=[],
        )

    def _analyze_local(self, *, image: Image.Image, width: int, height: int, start: float) -> AIAnalysisResult:
        model, device, model_version = _get_model_and_device()

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

    async def _analyze_remote(
        self, *, image_bytes: bytes, width: int, height: int, start: float, ai_server_url: str
    ) -> Optional[AIAnalysisResult]:
        """Calls the standalone `ai_model` microservice's `/api/detect`. Returns
        `None` (never raises) on any network/parsing failure so the caller can
        fall back to the in-process checkpoint."""
        try:
            b64_str = base64.b64encode(image_bytes).decode("utf-8")
            async with httpx.AsyncClient(timeout=_REMOTE_TIMEOUT) as client:
                resp = await client.post(
                    f"{ai_server_url.rstrip('/')}/api/detect",
                    json={
                        "imageBase64": b64_str,
                        "confidenceThreshold": settings.AI_DETECTION_CONFIDENCE,
                    },
                )
            if resp.status_code != 200:
                logger.warning(f"AI server ({ai_server_url}) returned HTTP {resp.status_code}: {resp.text[:300]}")
                return None

            data = resp.json()
            raw_dets = data.get("detections") or []

            detections: list[AIDetectionItem] = []
            severities: list[Severity] = []
            for d in raw_dets:
                bbox = d.get("bbox") or d.get("normalized_bbox") or d.get("normalizedBbox") or {}
                if isinstance(bbox, dict):
                    if "x1" in bbox and "x2" in bbox:
                        x1_val = float(bbox["x1"])
                        y1_val = float(bbox["y1"])
                        x2_val = float(bbox["x2"])
                        y2_val = float(bbox["y2"])
                        if x1_val <= 1.0 and x2_val <= 1.0 and y1_val <= 1.0 and y2_val <= 1.0:
                            bx = x1_val
                            by = y1_val
                            bw = max(0.01, x2_val - x1_val)
                            bh = max(0.01, y2_val - y1_val)
                        else:
                            bx = x1_val / width
                            by = y1_val / height
                            bw = max(0.01, (x2_val - x1_val) / width)
                            bh = max(0.01, (y2_val - y1_val) / height)
                    else:
                        bx = float(bbox.get("x") or 0.1)
                        by = float(bbox.get("y") or 0.1)
                        bw = float(bbox.get("width") or bbox.get("w") or 0.2)
                        bh = float(bbox.get("height") or bbox.get("h") or 0.2)
                else:
                    bx, by, bw, bh = 0.1, 0.1, 0.2, 0.2

                norm_box = BoundingBox(
                    x=max(0.0, min(1.0, round(bx, 4))),
                    y=max(0.0, min(1.0, round(by, 4))),
                    width=max(0.0, min(1.0, round(bw, 4))),
                    height=max(0.0, min(1.0, round(bh, 4))),
                )
                conf_val = float(d.get("confidence") or d.get("aiConfidence") or d.get("conf") or 0.85)
                sev_str = str(d.get("severity") or d.get("severityLevel") or "MEDIUM").upper()
                severities.append(
                    Severity.CRITICAL if ("CRITICAL" in sev_str or "SEVERE" in sev_str) else (
                        Severity.HIGH if "HIGH" in sev_str else (
                            Severity.LOW if "LOW" in sev_str else Severity.MEDIUM
                        )
                    )
                )

                detections.append(
                    AIDetectionItem(
                        class_id=0,
                        class_name=str(d.get("class") or d.get("class_name") or "pothole").lower(),
                        confidence=round(conf_val, 4),
                        bbox=BoundingBoxXYXY(
                            x1=round(norm_box.x * width, 1),
                            y1=round(norm_box.y * height, 1),
                            x2=round((norm_box.x + norm_box.width) * width, 1),
                            y2=round((norm_box.y + norm_box.height) * height, 1),
                        ),
                        normalized_bbox=norm_box,
                    )
                )

            processing_time_ms = int((time.perf_counter() - start) * 1000)
            detected = bool(data.get("detected") or len(detections) > 0)

            top_det: Optional[AIDetectionItem] = None
            top_severity: Optional[Severity] = None
            top_conf = float(data.get("confidence") or 0.0)
            if detections:
                best_idx = max(range(len(detections)), key=lambda i: detections[i].confidence)
                top_det = detections[best_idx]
                top_severity = severities[best_idx]
                top_conf = top_det.confidence

            remote_model_version = str(
                data.get("modelVersion") or data.get("model_version") or data.get("modelName") or "safepath-ai-server"
            )

            return AIAnalysisResult(
                success=True,
                detected=detected,
                hazard_type=HazardType.POTHOLE if detected else None,
                confidence=top_conf,
                severity=top_severity if detected else None,
                bounding_box=top_det.normalized_bbox if top_det else None,
                processing_time_ms=processing_time_ms,
                model_version=f"{remote_model_version} (remote: {ai_server_url})",
                message=None if detected else NO_HAZARD_MESSAGE,
                image_width=width,
                image_height=height,
                detections=detections,
            )
        except Exception as ex:
            logger.warning(f"AI server API endpoint ({ai_server_url}) unavailable: {type(ex).__name__}: {ex}.")
            return None
