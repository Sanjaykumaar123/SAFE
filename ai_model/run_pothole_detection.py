"""
JARVISS Pothole Detection & Road Damage Assessment Engine
CLI execution script for batch & video processing.
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

def detect_potholes(
    input_video_path,
    output_video_paths=None,
    model_path=None,
    conf_thresh=0.25,
    iou_thresh=0.5,
    imgsz=640,
    device='0',
    half=False,
    use_roi=False,
    frame_skip=1,
    save_json=None
):
    # Resolve model path
    if model_path is None or not os.path.exists(model_path):
        candidates = ['models/pothole_v2_final.pt', 'models/pothole_v2_training.pt', 'models/best.pt', 'model/best.pt']
        for c in candidates:
            if os.path.exists(c):
                model_path = c
                break
                
    print(f"[*] Loading YOLOv8 model from {model_path}...", flush=True)
    if not model_path or not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    
    best_model = YOLO(model_path)
    
    if not os.path.exists(input_video_path):
        raise FileNotFoundError(f"Input video file not found at {input_video_path}")
        
    cap = cv2.VideoCapture(input_video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open input video {input_video_path}")
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"Video Info: Resolution {width}x{height}, FPS: {fps:.2f}, Total Frames: {total_frames}", flush=True)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writers = []
    if output_video_paths:
        for out_path in output_video_paths:
            os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
            writers.append(cv2.VideoWriter(out_path, fourcc, fps, (width, height)))
            print(f"Output video writer initialized: {out_path}", flush=True)
        
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = max(0.45, width / 1200.0)
    bg_color = (20, 20, 20)
    
    count_deque = deque(maxlen=15)
    total_potholes_tracked = set()
    
    roi_y1 = int(height * 0.40) if use_roi else 0
    roi_y2 = int(height * 0.90) if use_roi else height
    road_area = width * (roi_y2 - roi_y1)

    frame_idx = 0
    frames_with_potholes = 0
    max_potholes_in_single_frame = 0
    max_potholes_frame_img = None
    sample_annotated_frames = {}
    last_res = None
    
    start_time = time.time()
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_idx += 1
        should_infer = (frame_idx % frame_skip == 0) or (last_res is None)
        
        if should_infer:
            infer_img = frame[roi_y1:roi_y2, :] if use_roi else frame
            results = best_model.track(
                source=infer_img,
                persist=True,
                imgsz=imgsz,
                conf=conf_thresh,
                iou=iou_thresh,
                device=device,
                half=half,
                verbose=False
            )
            last_res = results[0]

        processed_frame = frame.copy()
        
        total_pothole_pixels = 0
        raw_count = 0

        if last_res is not None:
            # 1. Draw red segmentation masks
            if last_res.masks is not None and last_res.masks.xy is not None:
                overlay = processed_frame.copy()
                for polygon in last_res.masks.xy:
                    if len(polygon) > 0:
                        pts = np.array(polygon, dtype=np.int32)
                        if use_roi:
                            pts[:, 1] += roi_y1
                        cv2.fillPoly(overlay, [pts], (0, 0, 255))
                        total_pothole_pixels += cv2.contourArea(pts)
                cv2.addWeighted(overlay, 0.55, processed_frame, 0.45, 0, processed_frame)
                
            # 2. Draw bounding boxes & tracking labels
            if last_res.boxes is not None and len(last_res.boxes) > 0:
                boxes_data = last_res.boxes.xyxy.cpu().numpy()
                confs = last_res.boxes.conf.cpu().numpy()
                raw_count = len(boxes_data)
                
                track_ids = []
                if last_res.boxes.id is not None:
                    track_ids = last_res.boxes.id.int().cpu().tolist()
                    for tid in track_ids:
                        total_potholes_tracked.add(tid)
                else:
                    track_ids = [-1] * raw_count
                    
                for i, box in enumerate(boxes_data):
                    x1, y1, x2, y2 = map(int, box)
                    if use_roi:
                        y1 += roi_y1
                        y2 += roi_y1
                    conf = confs[i]
                    tid = track_ids[i]
                    
                    label = f"Pothole #{tid} ({conf:.2f})" if tid != -1 else f"Pothole ({conf:.2f})"
                    
                    cv2.rectangle(processed_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    
                    (tw, th), baseline = cv2.getTextSize(label, font, 0.4, 1)
                    cv2.rectangle(processed_frame, (x1, max(y1 - 16, 0)), (x1 + tw + 4, max(y1, 16)), (0, 0, 255), -1)
                    cv2.putText(processed_frame, label, (x1 + 2, max(y1 - 4, 12)), font, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
                
        if raw_count > 0:
            frames_with_potholes += 1
            if raw_count > max_potholes_in_single_frame:
                max_potholes_in_single_frame = raw_count
                max_potholes_frame_img = processed_frame.copy()
                
        count_deque.append(raw_count)
        smoothed_current_count = round(sum(count_deque) / len(count_deque))
        total_count = max(len(total_potholes_tracked), smoothed_current_count)
        damage_ratio = total_pothole_pixels / max(1, road_area)

        # 3. HUD Overlay Banner
        hud_w, hud_h = max(280, int(width * 0.45)), 85
        cv2.rectangle(processed_frame, (10, 10), (10 + hud_w, 10 + hud_h), bg_color, -1)
        cv2.rectangle(processed_frame, (10, 10), (10 + hud_w, 10 + hud_h), (0, 0, 255), 2)
        
        line1 = f"Current Potholes: {smoothed_current_count} (raw: {raw_count})"
        line2 = f"Total Unique Tracked: {len(total_potholes_tracked)}"
        line3 = f"Damage: {damage_ratio*100:.2f}% | Frame: {frame_idx}/{total_frames}"
        
        cv2.putText(processed_frame, line1, (18, 33), font, font_scale, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(processed_frame, line2, (18, 56), font, font_scale, (0, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(processed_frame, line3, (18, 79), font, font_scale * 0.85, (200, 200, 200), 1, cv2.LINE_AA)
        
        if frame_idx in [int(total_frames * 0.25), int(total_frames * 0.5), int(total_frames * 0.75)] or (raw_count > 0 and len(sample_annotated_frames) < 5):
            sample_annotated_frames[frame_idx] = processed_frame.copy()
            
        for w in writers:
            w.write(processed_frame)
            
        if frame_idx % 30 == 0 or frame_idx == total_frames:
            print(f"Processed frame {frame_idx}/{total_frames} ({frame_idx/total_frames*100:.1f}%) - Active: {raw_count}, Tracked: {len(total_potholes_tracked)}", flush=True)
            
    cap.release()
    for w in writers:
        w.release()
        
    elapsed_time = time.time() - start_time
    effective_fps = frame_idx / max(0.001, elapsed_time)
    print(f"\n--- Detection Complete ---", flush=True)
    print(f"Time taken: {elapsed_time:.2f} seconds ({effective_fps:.2f} FPS processing speed)", flush=True)
    print(f"Total unique tracked potholes: {len(total_potholes_tracked)}", flush=True)
    
    # Save output previews
    video_stem = os.path.splitext(os.path.basename(input_video_path))[0]
    preview_dir = f"output_previews_{video_stem}"
    os.makedirs(preview_dir, exist_ok=True)
    
    saved_previews = []
    if max_potholes_frame_img is not None:
        p_path = os.path.join(preview_dir, "peak_detection.jpg")
        cv2.imwrite(p_path, max_potholes_frame_img)
        saved_previews.append(p_path)
        
    for idx, f_img in sample_annotated_frames.items():
        p_path = os.path.join(preview_dir, f"frame_{idx}.jpg")
        cv2.imwrite(p_path, f_img)
        saved_previews.append(p_path)
        
    summary = {
        "total_frames": frame_idx,
        "frames_with_potholes": frames_with_potholes,
        "total_unique_potholes": len(total_potholes_tracked),
        "max_potholes_single_frame": max_potholes_in_single_frame,
        "processing_time": elapsed_time,
        "effective_fps": effective_fps,
        "preview_images": saved_previews
    }

    if save_json:
        with open(save_json, "w") as f:
            json.dump(summary, f, indent=2)

    return summary

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JARVISS Pothole Detection CLI")
    parser.add_argument("--source", type=str, default="sample_video.mp4", help="Input video path")
    parser.add_argument("--model", type=str, default=None, help="Model weights path")
    parser.add_argument("--output", type=str, default=None, help="Output video path")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.5, help="IoU threshold")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", type=str, default="0", help="Device (0 or cpu)")
    parser.add_argument("--roi", action="store_true", help="Enable ROI optimization")
    parser.add_argument("--frame-skip", type=int, default=1, help="Frame skipping rate")
    parser.add_argument("--save-json", type=str, default=None, help="Save summary JSON")
    args = parser.parse_args()

    input_video = args.source
    base_name = os.path.splitext(os.path.basename(input_video))[0]
    out_video = args.output if args.output else f"{base_name}_pothole_detected.mp4"

    detect_potholes(
        input_video_path=input_video,
        output_video_paths=[out_video],
        model_path=args.model,
        conf_thresh=args.conf,
        iou_thresh=args.iou,
        imgsz=args.imgsz,
        device=args.device,
        use_roi=args.roi,
        frame_skip=args.frame_skip,
        save_json=args.save_json
    )
