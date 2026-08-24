"""
Road Damage Assessment App (Live Video / Camera Display)
Powered by YOLOv8 Pothole Segmentation & ByteTrack tracking
"""

import cv2
import numpy as np
import os
import sys
from ultralytics import YOLO
from collections import deque

def run_app():
    # Resolve best available model
    model_paths = [
        'models/pothole_v2_final.pt',
        'models/pothole_v2_training.pt',
        'models/best.pt',
        'model/best.pt'
    ]
    model_file = None
    for p in model_paths:
        if os.path.exists(p):
            model_file = p
            break
            
    if not model_file:
        raise FileNotFoundError("No valid model file found.")

    print(f"[*] Loading model from: {model_file}")
    model = YOLO(model_file)

    video_path = 'sample_video.mp4'
    if not os.path.exists(video_path):
        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            video_path = sys.argv[1]
        else:
            print("[*] 'sample_video.mp4' not found, defaulting to webcam (0)...")
            video_path = 0

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[!] Could not open video source: {video_path}")
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 25.0

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter('road_damage_assessment.mp4', fourcc, fps, (width, height))

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.60
    count_deque = deque(maxlen=15)
    total_potholes_tracked = set()

    print("[*] Starting Road Damage Assessment... Press 'q' in window to exit.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model.track(source=frame, persist=True, imgsz=640, conf=0.25, verbose=False)
        processed_frame = frame.copy()

        # 1. Segmentation masks
        if results[0].masks is not None and results[0].masks.xy is not None:
            overlay = processed_frame.copy()
            for polygon in results[0].masks.xy:
                if len(polygon) > 0:
                    pts = np.array(polygon, dtype=np.int32)
                    cv2.fillPoly(overlay, [pts], (0, 0, 255))
            cv2.addWeighted(overlay, 0.55, processed_frame, 0.45, 0, processed_frame)

        raw_count = 0
        if results[0].boxes is not None and len(results[0].boxes) > 0:
            boxes_data = results[0].boxes.xyxy.cpu().numpy()
            raw_count = len(boxes_data)
            
            if results[0].boxes.id is not None:
                track_ids = results[0].boxes.id.int().cpu().tolist()
                for tid in track_ids:
                    total_potholes_tracked.add(tid)
            
            for box in boxes_data:
                x1, y1, x2, y2 = map(int, box)
                cv2.rectangle(processed_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(processed_frame, 'Pothole', (x1, max(y1 - 8, 15)),
                            font, 0.5, (0, 0, 255), 2, cv2.LINE_AA)

        count_deque.append(raw_count)
        smoothed_current_count = round(sum(count_deque) / len(count_deque))
        total_count = max(len(total_potholes_tracked), smoothed_current_count)

        # HUD styling
        cv2.rectangle(processed_frame, (20, 20), (320, 95), (20, 20, 20), -1)
        cv2.rectangle(processed_frame, (20, 20), (320, 95), (0, 0, 255), 2)

        cv2.putText(processed_frame, f'Current Potholes: {smoothed_current_count}', (30, 48), font, font_scale, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(processed_frame, f'Total Tracked: {total_count}', (30, 78), font, font_scale, (0, 255, 255), 2, cv2.LINE_AA)

        out.write(processed_frame)
        cv2.imshow('JARVISS Road Damage Assessment', processed_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print("[✓] Finished assessment. Output saved to road_damage_assessment.mp4")

if __name__ == "__main__":
    run_app()