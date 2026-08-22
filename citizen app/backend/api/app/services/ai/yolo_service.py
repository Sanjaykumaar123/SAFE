"""
Real YOLO pothole-detection service — the implementation `yolo_stub.py`
(now replaced by this file) reserved as a "future integration point"
(section 61). Loads a fine-tuned YOLO26n checkpoint trained on the
BharatPotHole dashcam dataset (~7,000 images, single "pothole" class) and
runs real inference in-process via `ultralytics`.

Contract (identical to `MockAIAnalysisService`, section 51):
    async def analyze(self, *, image_bytes: bytes, filename: str) -> AIAnalysisResult

Why in-process rather than a separate microservice (the original stub's
"sketch" suggested a standalone service): the checkpoint is a ~5MB
YOLO26n-nano model — small enough that a separate GPU-backed process isn't
warranted yet. If a heavier ensemble model is adopted later (see
DEFERRED.md — the training pipeline this checkpoint came from already has
a working tri-model weighted-box-fusion ensemble prototype), splitting
this out into its own process is a contained follow-up; the
`AIAnalysisService` interface doesn't change either way.

Model provenance: fine-tuned from Ultralytics' `yolo26n.pt` base on the
BharatPotHole dataset (train/val/test = 4890/1049/1049 images, 11,170
pothole boxes). See `AI_MODEL_PATH` in `.env` to point at a different
checkpoint (e.g. a later training run's `best.pt`) without touching this
file — swapping models is a config change, not a code change.

MEASURED ACCURACY (2026-08-22, held-out test split, 1049 images, conf=0.25)
— read this before assuming "real model" means "production-accurate":
    Precision 28.2% · Recall 19.0% · mAP50 8.3% · mAP50-95 2.2%
This is real inference against a real trained model — genuinely better
than the deterministic mock it replaces, and correctly wired end-to-end —
but these numbers mean it currently misses roughly 4 in 5 real potholes on
this dataset and a majority of what it does flag is a weak match. It was
the best of four checkpoints compared (two from this fine-tuning pipeline,
two third-party pretrained pothole models that transferred far worse to
BharatPotHole's Indian-dashcam distribution — see
C:\...\aimodelsafe\runs\pothole_yolo26n\ for training history). The
`finetune_exp` run's own `results.csv` shows classification loss climbing
and mAP trending toward zero in its later epochs — `best.pt` (what this
loads) is Ultralytics' own best-fitness checkpoint from *before* that
divergence, not the final epoch, but the run likely needs re-tuning (lower
learning rate, earlier stopping, or more/cleaner data) rather than just
"more epochs" to meaningfully improve past this. Treat every `detected`
result from this service as a candidate to review, not a verified hazard,
until a materially better checkpoint replaces this one.
"""
import io
import time
from functools import lru_cache
from pathlib import Path

from PIL import Image

from app.core.config import settings
from app.models.enums import HazardType, Severity
from app.schemas.ai import AIAnalysisResult
from app.schemas.common import BoundingBox
from app.services.ai.base import AIAnalysisService

MODEL_VERSION = "yolo26n-bharatpothole-finetune-v1"

NO_HAZARD_MESSAGE = "No confident road hazard detected."


def _resolve_model_path() -> Path:
    path = Path(settings.AI_MODEL_PATH)
    if not path.is_absolute():
        # app/services/ai/yolo_service.py -> backend/api/ (3 parents up)
        path = Path(__file__).resolve().parents[3] / path
    return path


def _load_model():
    # Imported lazily so `mock`-mode deployments never need `ultralytics`/
    # `torch` installed at all (they're heavy, GPU-toolchain-sized deps).
    import torch
    from ultralytics import YOLO

    model_path = _resolve_model_path()
    if not model_path.exists():
        raise FileNotFoundError(
            f"AI_MODEL_PATH does not exist: {model_path}. Point AI_MODEL_PATH in .env at a "
            "real YOLO .pt checkpoint, or set AI_PROVIDER=mock to use MockAIAnalysisService."
        )

    if settings.AI_DEVICE == "auto":
        device = 0 if torch.cuda.is_available() else "cpu"
    else:
        device = settings.AI_DEVICE

    model = YOLO(str(model_path))
    return model, device


@lru_cache
def _get_model_and_device():
    """Loaded once per process (not per request) — `YOLO(...)` deserializes
    the checkpoint and moves it onto the device, which takes real time
    (hundreds of ms to a few seconds); paying that on every `/ai/analyze`
    call would make every request that much slower for no reason."""
    return _load_model()


def _severity_for_box(area_pct: float, near_bottom: bool) -> Severity:
    """Severity from how much of the frame the pothole's box fills — a
    physical proxy (a bigger box means either a bigger pothole or a
    closer/more imminent one) ported from the training pipeline's own
    `pothole_analytics.py::PotholeTracker` severity grading. Deliberately
    NOT derived from confidence — confidence measures the model's
    certainty that *a* pothole is there, not how severe it is; conflating
    the two (as the mock service does, for lack of a real box to measure)
    is what this real implementation improves on."""
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
        model, device = _get_model_and_device()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = image.size

        # conf here is deliberately looser than fleet's own
        # AI_CONFIDENCE_THRESHOLD=0.50 (app/api/v1/fleet/observations.py,
        # which decides whether a detection is hazard-worthy enough to
        # create/update a Hazard row) — this is only "does the model see
        # anything at all", so a borderline detection still reaches the
        # client/tracker instead of being silently dropped here.
        results = model.predict(
            source=image,
            conf=settings.AI_DETECTION_CONFIDENCE,
            imgsz=640,
            device=device,
            verbose=False,
        )[0]

        processing_time_ms = int((time.perf_counter() - start) * 1000)

        if results.boxes is None or len(results.boxes) == 0:
            return AIAnalysisResult(
                detected=False,
                confidence=0.0,
                processing_time_ms=processing_time_ms,
                model_version=MODEL_VERSION,
                message=NO_HAZARD_MESSAGE,
            )

        # Highest-confidence box drives the response — a frame with several
        # potholes still becomes several observations as the vehicle passes
        # each one over consecutive frames (section 18), not one call
        # reporting several boxes at once.
        best_idx = int(results.boxes.conf.argmax())
        x1, y1, x2, y2 = [float(v) for v in results.boxes.xyxy[best_idx].tolist()]
        confidence = float(results.boxes.conf[best_idx])

        box_w, box_h = (x2 - x1), (y2 - y1)
        area_pct = (box_w * box_h) / (width * height) * 100
        near_bottom = (y2 / height) > 0.7
        severity = _severity_for_box(area_pct, near_bottom)

        bounding_box = BoundingBox(
            x=max(0.0, min(1.0, x1 / width)),
            y=max(0.0, min(1.0, y1 / height)),
            width=max(0.0, min(1.0, box_w / width)),
            height=max(0.0, min(1.0, box_h / height)),
        )

        return AIAnalysisResult(
            detected=True,
            hazard_type=HazardType.POTHOLE,
            confidence=round(confidence, 4),
            severity=severity,
            bounding_box=bounding_box,
            processing_time_ms=processing_time_ms,
            model_version=MODEL_VERSION,
        )
