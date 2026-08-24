"""
JARVISS Pothole Segmentation Comprehensive Benchmark Suite:
Compares:
  1. Baseline Copy vs Fine-tuned Final Model
  2. Image Sizes: 1280, 640, 512, 480
  3. FP16 (half=True) vs FP32
  4. Road ROI Optimization (Enabled vs Disabled)
  5. Frame Skipping (skip=1, skip=2, skip=3)
  6. Backends: PyTorch (.pt) vs ONNX vs TensorRT (.engine)
"""

import os
import sys
import time
import json
import torch
import numpy as np
import cv2
from ultralytics import YOLO

def benchmark_validation_metrics(model_path, data_yaml="data.yaml", imgsz=640, device=0):
    """Run validation split and return mAP50, mAP50-95, Precision, Recall for box & mask."""
    if not os.path.exists(model_path):
        return None
    model = YOLO(model_path)
    res = model.val(data=data_yaml, imgsz=imgsz, device=device, split="val", verbose=False)
    return {
        "box_map50": float(res.box.map50),
        "box_map50_95": float(res.box.map),
        "box_precision": float(res.box.mp),
        "box_recall": float(res.box.mr),
        "seg_map50": float(res.seg.map50),
        "seg_map50_95": float(res.seg.map),
        "seg_precision": float(res.seg.mp),
        "seg_recall": float(res.seg.mr),
        "val_speed_ms": res.speed
    }

def benchmark_video_speed(
    model_path,
    video_path="sample_video.mp4",
    imgsz=640,
    half=False,
    device=0,
    use_roi=False,
    frame_skip=1,
    max_frames=100
):
    """Benchmark raw video inference speed, FPS, latency, and pothole detection stats."""
    if not os.path.exists(model_path):
        return None
    if not os.path.exists(video_path):
        return {"error": "video not found"}

    is_onnx = model_path.endswith(".onnx")
    actual_device = "cpu" if is_onnx else device
    actual_half = False if is_onnx else half

    model = YOLO(model_path)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "could not open video"}

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    roi_y1 = int(height * 0.40) if use_roi else 0
    roi_y2 = int(height * 0.90) if use_roi else height

    latencies = []
    total_tracked_ids = set()
    frame_idx = 0
    inferred_count = 0
    last_res = None
    
    # Warmup
    dummy = np.zeros((height, width, 3), dtype=np.uint8)
    for _ in range(3):
        _ = model.predict(source=dummy, imgsz=imgsz, device=actual_device, half=actual_half, verbose=False)
    
    t_start = time.time()
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        if (frame_idx % frame_skip == 0) or (last_res is None):
            infer_img = frame[roi_y1:roi_y2, :] if use_roi else frame
            t0 = time.time()
            results = model.track(
                source=infer_img,
                persist=True,
                imgsz=imgsz,
                device=actual_device,
                half=actual_half,
                verbose=False
            )
            latencies.append((time.time() - t0) * 1000)
            last_res = results[0]
            inferred_count += 1
            
            if last_res.boxes is not None and last_res.boxes.id is not None:
                for tid in last_res.boxes.id.int().cpu().tolist():
                    total_tracked_ids.add(tid)

    cap.release()
    total_time = time.time() - t_start
    effective_fps = frame_idx / max(0.001, total_time)
    avg_latency = float(np.mean(latencies)) if latencies else 0.0

    return {
        "frames_tested": frame_idx,
        "inferred_frames": inferred_count,
        "total_time_sec": round(total_time, 2),
        "effective_fps": round(effective_fps, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "unique_potholes_tracked": len(total_tracked_ids)
    }

def run_full_benchmark(
    baseline_model="models/pothole_v2_training.pt",
    final_model="models/pothole_v2_final.pt",
    onnx_model="models/pothole_v2_final.onnx",
    engine_model="models/pothole_v2_final.engine",
    video_path="sample_video.mp4"
):
    print("=" * 70)
    print("      JARVISS POTHOLE SEGMENTATION FULL BENCHMARK SUITE")
    print("=" * 70)

    # 1. Validation Accuracy Metrics
    print("\n[1] Evaluating Validation Accuracy Metrics...")
    val_results = {}
    for name, path in [("Baseline Copy", baseline_model), ("Fine-Tuned Final", final_model)]:
        if os.path.exists(path):
            print(f"[*] Validating {name} ({path})...")
            val_results[name] = benchmark_validation_metrics(path)
        else:
            print(f"[!] {name} not found at {path}")

    # 2. Image Size Comparison (Step 10)
    print("\n[2] Testing Image Resolutions (1280, 640, 512, 480)...")
    imgsz_results = {}
    target_model = final_model if os.path.exists(final_model) else baseline_model
    for sz in [1280, 640, 512, 480]:
        print(f"[*] Benchmarking imgsz={sz}...")
        imgsz_results[f"imgsz_{sz}"] = benchmark_video_speed(target_model, video_path=video_path, imgsz=sz)

    # 3. FP16 (half=True) vs FP32 (Step 10)
    print("\n[3] Testing FP16 vs FP32 Precision...")
    prec_results = {
        "FP32": benchmark_video_speed(target_model, video_path=video_path, imgsz=640, half=False),
        "FP16": benchmark_video_speed(target_model, video_path=video_path, imgsz=640, half=True)
    }

    # 4. ROI Optimization (Step 11)
    print("\n[4] Testing ROI Optimization (Road ROI vs Full Frame)...")
    roi_results = {
        "Full_Frame": benchmark_video_speed(target_model, video_path=video_path, imgsz=640, use_roi=False),
        "Road_ROI": benchmark_video_speed(target_model, video_path=video_path, imgsz=640, use_roi=True)
    }

    # 5. Frame Skipping (Step 12)
    print("\n[5] Testing Frame Skipping (skip=1, skip=2, skip=3)...")
    skip_results = {}
    for sk in [1, 2, 3]:
        print(f"[*] Benchmarking FrameSkip={sk}...")
        skip_results[f"skip_{sk}"] = benchmark_video_speed(target_model, video_path=video_path, imgsz=640, frame_skip=sk)

    # 6. Backend Comparison (PyTorch vs ONNX vs TensorRT) (Step 14)
    print("\n[6] Testing Deployment Backends (.pt vs .onnx)...")
    backend_results = {
        "PyTorch_CUDA": benchmark_video_speed(target_model, video_path=video_path, imgsz=640, device=0)
    }
    if os.path.exists(onnx_model):
        print("[*] Benchmarking ONNX...")
        backend_results["ONNX_Runtime"] = benchmark_video_speed(onnx_model, video_path=video_path, imgsz=640, device="cpu")

    full_report = {
        "validation_metrics": val_results,
        "image_sizes": imgsz_results,
        "precision_fp16_fp32": prec_results,
        "roi_optimization": roi_results,
        "frame_skipping": skip_results,
        "backends": backend_results
    }

    report_path = "benchmark_results.json"
    with open(report_path, "w") as f:
        json.dump(full_report, f, indent=2)
    print(f"\n[✓] Saved complete benchmark results to: {report_path}")

    return full_report

if __name__ == "__main__":
    run_full_benchmark()
