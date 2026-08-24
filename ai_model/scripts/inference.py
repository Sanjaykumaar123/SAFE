"""
JARVISS Pothole Segmentation & Road Damage Assessment Inference Engine
Supports:
  - Video, Image, Webcam real-time inference
  - Road ROI (Region of Interest) optimization with automatic coordinate translation
  - Dynamic Frame Skipping (1, 2, 3)
  - Road Damage Severity Index (RDSI) calculation
  - Persistent tracking with ByteTrack
  - Multi-backend support (.pt, .onnx, .engine)
"""

import cv2
import numpy as np
import os
import sys
import time
import argparse
import json
from collections import deque
from ultralytics import YOLO

def compute_damage_severity(mask_area_ratio, pothole_count, max_single_area_ratio):
    """
    Compute road damage severity grade based on coverage ratio and count.
    Returns (grade, label, color_bgr)
    """
    if pothole_count == 0 or mask_area_ratio < 0.0005:
        return 0, "CLEAR", (0, 200, 0) # Green
    elif mask_area_ratio < 0.015 and pothole_count <= 2 and max_single_area_ratio < 0.01:
        return 1, "LOW DAMAGE", (0, 220, 220) # Yellow-Green
    elif mask_area_ratio < 0.045 or pothole_count <= 4:
        return 2, "MODERATE DAMAGE", (0, 165, 255) # Orange
    else:
        return 3, "SEVERE DAMAGE", (0, 0, 255) # Red

def run_inference(
    source,
    model_path="models/pothole_v2_final.pt",
    imgsz=640,
    conf=0.25,
    iou=0.5,
    device="0",
    half=False,
    use_roi=False,
    roi_top=0.40,
    roi_bottom=0.90,
    frame_skip=1,
    save_video=None,
    save_json=None,
    show=False,
    save_preview_dir=None
):
    # Fallback model path resolution
    if not os.path.exists(model_path):
        fallbacks = ["models/pothole_v2_final.pt", "models/pothole_v2_training.pt", "models/best.pt", "model/best.pt"]
        for fb in fallbacks:
            if os.path.exists(fb):
                print(f"[*] Note: '{model_path}' not found. Using fallback model: '{fb}'")
                model_path = fb
                break

    print(f"[*] Loading model from: {model_path}")
    model = YOLO(model_path)
    
    # Check if source is image or video
    is_image = False
    if isinstance(source, str) and source.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp')):
        is_image = True

    # Image inference
    if is_image:
        frame = cv2.imread(source)
        if frame is None:
            raise FileNotFoundError(f"Could not load image from: {source}")
        h, w = frame.shape[:2]
        
        t0 = time.time()
        
        # Optional ROI
        roi_y1, roi_y2 = 0, h
        infer_img = frame
        if use_roi:
            roi_y1 = int(h * roi_top)
            roi_y2 = int(h * roi_bottom)
            infer_img = frame[roi_y1:roi_y2, :]

        results = model.predict(
            source=infer_img,
            imgsz=imgsz,
            conf=conf,
            iou=iou,
            device=device,
            half=half,
            verbose=False
        )
        latency = (time.time() - t0) * 1000
        
        annotated = frame.copy()
        total_pothole_pixels = 0
        pothole_boxes = []
        max_single_area = 0

        res = results[0]
        if res.masks is not None and res.masks.xy is not None:
            overlay = annotated.copy()
            for polygon in res.masks.xy:
                if len(polygon) > 0:
                    pts = np.array(polygon, dtype=np.int32)
                    if use_roi:
                        pts[:, 1] += roi_y1
                    cv2.fillPoly(overlay, [pts], (0, 0, 255))
                    # Compute area
                    area = cv2.contourArea(pts)
                    total_pothole_pixels += area
                    if area > max_single_area:
                        max_single_area = area
            cv2.addWeighted(overlay, 0.5, annotated, 0.5, 0, annotated)

        if res.boxes is not None and len(res.boxes) > 0:
            boxes = res.boxes.xyxy.cpu().numpy()
            confs = res.boxes.conf.cpu().numpy()
            for i, box in enumerate(boxes):
                x1, y1, x2, y2 = box
                if use_roi:
                    y1 += roi_y1
                    y2 += roi_y1
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                pothole_boxes.append({"bbox": [x1, y1, x2, y2], "confidence": float(confs[i])})
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)
                lbl = f"Pothole {confs[i]:.2f}"
                cv2.putText(annotated, lbl, (x1, max(y1 - 8, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        road_area = w * (roi_y2 - roi_y1 if use_roi else h)
        damage_ratio = total_pothole_pixels / max(1, road_area)
        max_ratio = max_single_area / max(1, road_area)
        grade, grade_label, grade_color = compute_damage_severity(damage_ratio, len(pothole_boxes), max_ratio)

        # Draw HUD badge
        hud_w, hud_h = 320, 95
        cv2.rectangle(annotated, (15, 15), (15 + hud_w, 15 + hud_h), (20, 20, 20), -1)
        cv2.rectangle(annotated, (15, 15), (15 + hud_w, 15 + hud_h), grade_color, 2)
        cv2.putText(annotated, f"Status: {grade_label}", (25, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.65, grade_color, 2)
        cv2.putText(annotated, f"Potholes Detected: {len(pothole_boxes)}", (25, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
        cv2.putText(annotated, f"Damage Ratio: {damage_ratio*100:.2f}% | {latency:.1f}ms", (25, 94), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1)

        if save_video:
            out_img_path = save_video if save_video.endswith(('.jpg', '.png')) else os.path.splitext(save_video)[0] + "_annotated.jpg"
            cv2.imwrite(out_img_path, annotated)
            print(f"[+] Saved annotated output to: {out_img_path}")

        summary = {
            "potholes_count": len(pothole_boxes),
            "damage_severity_grade": grade,
            "damage_severity_label": grade_label,
            "damage_area_ratio": float(damage_ratio),
            "latency_ms": float(latency),
            "boxes": pothole_boxes
        }
        if save_json:
            with open(save_json, "w") as f:
                json.dump(summary, f, indent=2)
            print(f"[+] Saved metrics JSON to: {save_json}")

        return summary, annotated

    # Video / Webcam inference
    cap_src = int(source) if str(source).isdigit() else source
    cap = cv2.VideoCapture(cap_src)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video source: {source}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    writer = None
    if save_video:
        os.makedirs(os.path.dirname(os.path.abspath(save_video)), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(save_video, fourcc, fps, (width, height))

    roi_y1 = int(height * roi_top) if use_roi else 0
    roi_y2 = int(height * roi_bottom) if use_roi else height
    road_area = width * (roi_y2 - roi_y1)

    total_tracked_ids = set()
    frame_count = 0
    processed_count = 0
    pothole_frame_count = 0
    latencies = []
    
    last_res = None
    start_time = time.time()
    
    print(f"[*] Starting video inference: {width}x{height} @ {fps:.1f} FPS, total frames: {total_frames}, ROI: {use_roi}, FrameSkip: {frame_skip}")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1
        
        # Frame skip logic
        should_infer = (frame_count % frame_skip == 0) or (last_res is None)
        
        if should_infer:
            t0 = time.time()
            infer_img = frame[roi_y1:roi_y2, :] if use_roi else frame
            
            # Tracking with ByteTrack
            results = model.track(
                source=infer_img,
                persist=True,
                imgsz=imgsz,
                conf=conf,
                iou=iou,
                device=device,
                half=half,
                verbose=False
            )
            latencies.append((time.time() - t0) * 1000)
            last_res = results[0]
            processed_count += 1
            
        annotated = frame.copy()
        
        # Draw ROI boundary guideline if ROI active
        if use_roi:
            cv2.line(annotated, (0, roi_y1), (width, roi_y1), (0, 165, 255), 1)
            cv2.line(annotated, (0, roi_y2), (width, roi_y2), (0, 165, 255), 1)

        total_pothole_pixels = 0
        current_potholes = 0
        max_single_area = 0

        if last_res is not None:
            # 1. Segmentation masks
            if last_res.masks is not None and last_res.masks.xy is not None:
                overlay = annotated.copy()
                for polygon in last_res.masks.xy:
                    if len(polygon) > 0:
                        pts = np.array(polygon, dtype=np.int32)
                        if use_roi:
                            pts[:, 1] += roi_y1
                        cv2.fillPoly(overlay, [pts], (0, 0, 255))
                        area = cv2.contourArea(pts)
                        total_pothole_pixels += area
                        if area > max_single_area:
                            max_single_area = area
                cv2.addWeighted(overlay, 0.5, annotated, 0.5, 0, annotated)

            # 2. Bounding boxes & Tracking IDs
            if last_res.boxes is not None and len(last_res.boxes) > 0:
                boxes = last_res.boxes.xyxy.cpu().numpy()
                confs = last_res.boxes.conf.cpu().numpy()
                current_potholes = len(boxes)
                
                track_ids = []
                if last_res.boxes.id is not None:
                    track_ids = last_res.boxes.id.int().cpu().tolist()
                    for tid in track_ids:
                        total_tracked_ids.add(tid)
                else:
                    track_ids = [-1] * current_potholes
                    
                for i, box in enumerate(boxes):
                    x1, y1, x2, y2 = map(int, box)
                    if use_roi:
                        y1 += roi_y1
                        y2 += roi_y1
                    tid = track_ids[i]
                    conf_val = confs[i]
                    
                    lbl = f"Pothole #{tid} ({conf_val:.2f})" if tid != -1 else f"Pothole ({conf_val:.2f})"
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(annotated, lbl, (x1, max(y1 - 6, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1, cv2.LINE_AA)

        if current_potholes > 0:
            pothole_frame_count += 1

        damage_ratio = total_pothole_pixels / max(1, road_area)
        max_ratio = max_single_area / max(1, road_area)
        grade, grade_label, grade_color = compute_damage_severity(damage_ratio, current_potholes, max_ratio)

        avg_lat = np.mean(latencies[-30:]) if latencies else 0
        inst_fps = 1000.0 / avg_lat if avg_lat > 0 else 0

        # HUD Overlay
        hud_w, hud_h = 340, 95
        cv2.rectangle(annotated, (15, 15), (15 + hud_w, 15 + hud_h), (20, 20, 20), -1)
        cv2.rectangle(annotated, (15, 15), (15 + hud_w, 15 + hud_h), grade_color, 2)
        cv2.putText(annotated, f"Severity: {grade_label}", (25, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.65, grade_color, 2)
        cv2.putText(annotated, f"Active: {current_potholes} | Total Unique: {len(total_tracked_ids)}", (25, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1)
        cv2.putText(annotated, f"Damage: {damage_ratio*100:.2f}% | {avg_lat:.1f}ms ({inst_fps:.1f} FPS)", (25, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (200, 200, 200), 1)

        if writer is not None:
            writer.write(annotated)

        if show:
            cv2.imshow("JARVISS Pothole Assessment", annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    cap.release()
    if writer is not None:
        writer.release()
    if show:
        cv2.destroyAllWindows()

    total_time = time.time() - start_time
    effective_fps = frame_count / max(0.001, total_time)
    avg_latency = float(np.mean(latencies)) if latencies else 0.0

    summary = {
        "total_frames": frame_count,
        "processed_frames": processed_count,
        "pothole_frames": pothole_frame_count,
        "total_unique_potholes": len(total_tracked_ids),
        "avg_latency_ms": avg_latency,
        "effective_fps": effective_fps,
        "total_time_sec": total_time,
        "model_used": model_path,
        "imgsz": imgsz,
        "roi_enabled": use_roi,
        "frame_skip": frame_skip
    }

    print(f"\n[✓] Inference Complete: {frame_count} frames in {total_time:.2f}s ({effective_fps:.2f} FPS). Avg Latency: {avg_latency:.2f}ms. Total Unique Potholes: {len(total_tracked_ids)}")

    if save_json:
        with open(save_json, "w") as f:
            json.dump(summary, f, indent=2)
        print(f"[+] Saved summary to: {save_json}")

    return summary

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JARVISS Pothole Segmentation Inference")
    parser.add_argument("--source", type=str, default="sample_video.mp4", help="Input image, video, or webcam index")
    parser.add_argument("--model", type=str, default="models/pothole_v2_final.pt", help="Path to model weights (.pt, .onnx, .engine)")
    parser.add_argument("--imgsz", type=int, default=640, help="Inference image size")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.5, help="NMS IoU threshold")
    parser.add_argument("--device", type=str, default="0", help="CUDA device (0) or cpu")
    parser.add_argument("--half", action="store_true", help="Enable FP16 half precision")
    parser.add_argument("--roi", action="store_true", help="Enable road ROI optimization")
    parser.add_argument("--frame-skip", type=int, default=1, help="Frame skip rate (1=every frame, 2=every 2nd, 3=every 3rd)")
    parser.add_argument("--save-video", type=str, default=None, help="Path to save annotated output video")
    parser.add_argument("--save-json", type=str, default=None, help="Path to save metrics JSON")
    parser.add_argument("--show", action="store_true", help="Display OpenCV window")
    args = parser.parse_args()

    run_inference(
        source=args.source,
        model_path=args.model,
        imgsz=args.imgsz,
        conf=args.conf,
        iou=args.iou,
        device=args.device,
        half=args.half,
        use_roi=args.roi,
        frame_skip=args.frame_skip,
        save_video=args.save_video,
        save_json=args.save_json,
        show=args.show
    )
