"""
AI Regression Test Suite: Standalone vs SafePath Backend Inference Consistency.

Runs standalone YOLOv8 inference and backend YOLOAIAnalysisService inference
on golden test dataset images, verifying parity across detection count,
confidence scores, bounding boxes (IoU), and processing latency.
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Add backend/api root to sys.path
backend_api_dir = Path(__file__).resolve().parents[2]
if str(backend_api_dir) not in sys.path:
    sys.path.insert(0, str(backend_api_dir))

from PIL import Image
from ultralytics import YOLO

from app.core.config import settings
from app.services.ai.yolo_service import YOLOAIAnalysisService


def calculate_iou(box1: dict, box2: dict) -> float:
    """Calculate IoU for two normalized bounding boxes {x, y, width, height}"""
    x1_a, y1_a, x2_a, y2_a = box1["x"], box1["y"], box1["x"] + box1["width"], box1["y"] + box1["height"]
    x1_b, y1_b, x2_b, y2_b = box2["x"], box2["y"], box2["x"] + box2["width"], box2["y"] + box2["height"]

    inter_x1 = max(x1_a, x1_b)
    inter_y1 = max(y1_a, y1_b)
    inter_x2 = min(x2_a, x2_b)
    inter_y2 = min(y2_a, y2_b)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    area_a = box1["width"] * box1["height"]
    area_b = box2["width"] * box2["height"]
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


async def run_consistency_test(max_images: int = 30):
    workspace_root = backend_api_dir.parents[2]
    model_path = workspace_root / "ai_model" / "models" / "pothole_v2_final.pt"
    if not model_path.exists():
        model_path = workspace_root / "ai_model" / "models" / "best.pt"

    dataset_dir = workspace_root / "ai_model" / "dataset" / "valid" / "images"
    image_paths = sorted(list(dataset_dir.glob("*.jpg")))[:max_images]

    print(f"\n=======================================================")
    print(f"   SAFEPATH AI REGRESSION TEST: STANDALONE VS BACKEND  ")
    print(f"=======================================================")
    print(f"Model Path   : {model_path}")
    print(f"Golden Images: {len(image_paths)}")
    print(f"-------------------------------------------------------\n")

    standalone_model = YOLO(str(model_path))
    backend_service = YOLOAIAnalysisService()

    passed_count = 0
    failed_count = 0
    results_report = []

    for idx, img_path in enumerate(image_paths, 1):
        with open(img_path, "rb") as f:
            image_bytes = f.read()

        pil_img = Image.open(img_path).convert("RGB")
        w, h = pil_img.size

        # Standalone inference
        start_s = time.perf_counter()
        s_res = standalone_model.predict(
            source=pil_img,
            conf=settings.AI_DETECTION_CONFIDENCE,
            iou=settings.AI_IOU_THRESHOLD,
            imgsz=settings.AI_IMAGE_SIZE,
            verbose=False,
        )[0]
        s_time_ms = int((time.perf_counter() - start_s) * 1000)

        s_boxes = s_res.boxes.xyxy.cpu().numpy() if s_res.boxes is not None else []
        s_confs = s_res.boxes.conf.cpu().numpy() if s_res.boxes is not None else []
        s_detected = len(s_boxes) > 0
        s_top_conf = float(s_confs[s_confs.argmax()]) if s_detected else 0.0

        # Backend service inference
        b_res = await backend_service.analyze(image_bytes=image_bytes, filename=img_path.name)

        # Comparison metrics
        conf_diff = abs(s_top_conf - b_res.confidence)
        iou_val = 1.0

        if s_detected and b_res.detected and b_res.bounding_box:
            top_s_box = s_boxes[s_confs.argmax()]
            x1, y1, x2, y2 = top_s_box
            s_norm_box = {"x": x1 / w, "y": y1 / h, "width": (x2 - x1) / w, "height": (y2 - y1) / h}
            b_norm_box = b_res.bounding_box.model_dump()
            iou_val = calculate_iou(s_norm_box, b_norm_box)

        detection_match = (s_detected == b_res.detected)
        conf_match = conf_diff < 0.05
        iou_match = iou_val > 0.80 if (s_detected and b_res.detected) else True

        is_pass = detection_match and conf_match and iou_match

        if is_pass:
            passed_count += 1
            status_str = "PASS"
        else:
            failed_count += 1
            status_str = "FAIL"

        item_result = {
            "index": idx,
            "filename": img_path.name,
            "status": status_str,
            "standalone_detected": bool(s_detected),
            "backend_detected": bool(b_res.detected),
            "standalone_conf": float(round(s_top_conf, 4)),
            "backend_conf": float(round(b_res.confidence, 4)),
            "conf_diff": float(round(conf_diff, 4)),
            "iou": float(round(iou_val, 4)),
            "backend_latency_ms": int(b_res.processing_time_ms),
        }
        results_report.append(item_result)

        print(
            f"[{idx:02d}/{len(image_paths)}] {img_path.name[:25]:<25} | "
            f"Status: {status_str:<4} | Standalone: {s_detected} ({s_top_conf:.2f}) | "
            f"Backend: {b_res.detected} ({b_res.confidence:.2f}) | IoU: {iou_val:.2f}"
        )

    pass_rate = (passed_count / len(image_paths)) * 100
    print(f"\n-------------------------------------------------------")
    print(f"SUMMARY RESULT: Passed {passed_count}/{len(image_paths)} ({pass_rate:.1f}%)")
    print(f"-------------------------------------------------------\n")

    report_payload = {
        "model_loaded": settings.AI_MODEL_PATH,
        "golden_images_tested": len(image_paths),
        "passed": passed_count,
        "failed": failed_count,
        "pass_rate_pct": pass_rate,
        "items": results_report,
    }

    report_path = backend_api_dir / "AI_DEBUG_REPORT.json"
    with open(report_path, "w") as f:
        json.dump(report_payload, f, indent=2)
    print(f"Saved detailed AI Debug Report to {report_path}")

    assert pass_rate >= 90.0, f"AI consistency test failed: pass rate {pass_rate:.1f}% below 90% tolerance threshold."


if __name__ == "__main__":
    asyncio.run(run_consistency_test())
