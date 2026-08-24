import os
import sys
import time
import cv2
import torch
import numpy as np
from ultralytics import YOLO

def process_video(input_path: str, output_path: str):
    print(f"[*] Starting Video Pothole Detection Pipeline...")
    print(f"[*] Input Video: {input_path}")
    print(f"[*] Output Video: {output_path}")

    # Load PyTorch YOLOv8 model
    model_path = os.path.abspath("ai_model/models/pothole_v2_final.pt")
    if not os.path.exists(model_path):
        model_path = os.path.abspath("models/pothole_v2_final.pt")
    
    print(f"[*] Loading PyTorch YOLOv8 Model: {model_path}")
    model = YOLO(model_path)
    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"[*] Running inference on device: {device}")

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"[!] Error: Could not open input video {input_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[*] Video Properties: Resolution {width}x{height}, FPS: {fps:.2f}, Total Frames: {total_frames}")

    # Initialize VideoWriter
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_idx = 0
    potholes_detected_count = 0
    start_time = time.time()

    # Stream video inference for 10x fast processing
    results_generator = model.predict(
        source=input_path,
        stream=True,
        conf=0.25,
        iou=0.45,
        max_det=300,
        imgsz=480,
        device=device,
        verbose=False
    )

    for r in results_generator:
        frame_idx += 1
        frame = r.orig_img.copy()
        has_detection_in_frame = False

        if r.boxes is not None and len(r.boxes) > 0:
            boxes = r.boxes.xyxy.cpu().numpy()
            confs = r.boxes.conf.cpu().numpy()

            for i in range(len(boxes)):
                bx = boxes[i]
                cf = float(confs[i])
                if cf < 0.25:
                    continue

                x1, y1, x2, y2 = int(bx[0]), int(bx[1]), int(bx[2]), int(bx[3])
                x1_norm = x1 / float(width)
                y1_norm = y1 / float(height)
                x2_norm = x2 / float(width)
                y2_norm = y2 / float(height)

                # Filter out upper sky/header noise
                if y1_norm < 0.15 and y2_norm < 0.32:
                    continue

                has_detection_in_frame = True
                potholes_detected_count += 1

                # Draw thick red bounding box
                box_color = (68, 68, 239) # BGR for red #EF4444
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 4)

                # Draw label badge
                label_text = f"POTHOLE {int(cf * 100)}%"
                font_scale = 0.6
                font_thickness = 2
                (t_w, t_h), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)

                # Badge background
                badge_y1 = max(0, y1 - t_h - 10)
                badge_y2 = max(t_h + 10, y1)
                cv2.rectangle(frame, (x1, badge_y1), (x1 + t_w + 12, badge_y2), box_color, -1)
                
                # Badge text (White)
                cv2.putText(frame, label_text, (x1 + 6, badge_y2 - 6), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)

                # Draw label badge
                label_text = f"POTHOLE {int(cf * 100)}%"
                font_scale = 0.6
                font_thickness = 2
                (t_w, t_h), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)

                # Badge background
                badge_y1 = max(0, y1 - t_h - 10)
                badge_y2 = max(t_h + 10, y1)
                cv2.rectangle(frame, (x1, badge_y1), (x1 + t_w + 12, badge_y2), box_color, -1)
                
                # Badge text (White)
                cv2.putText(frame, label_text, (x1 + 6, badge_y2 - 6), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)

        # Draw top status banner if detection in frame
        if has_detection_in_frame:
            banner_bg = (68, 68, 239)
            cv2.rectangle(frame, (20, 20), (450, 70), banner_bg, -1)
            cv2.putText(frame, "SAFEPATH AI · POTHOLE DETECTED", (32, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

        out.write(frame)

        if frame_idx % 30 == 0 or frame_idx == total_frames:
            elapsed = time.time() - start_time
            print(f"[+] Processed Frame {frame_idx}/{total_frames} ({frame_idx/total_frames*100:.1f}%) - Elapsed: {elapsed:.1f}s")

    cap.release()
    out.release()
    print(f"\n[🎉 SUCCESS] Video Processing Complete!")
    print(f"[*] Output saved to: {output_path}")
    print(f"[*] Total frames processed: {frame_idx}")
    print(f"[*] Total pothole detections marked: {potholes_detected_count}")

if __name__ == "__main__":
    input_file = r"C:\Users\Sanjay Kumaar\Downloads\t2.mp4"
    artifact_output = r"C:\Users\Sanjay Kumaar\.gemini\antigravity-ide\brain\cd56d94c-f542-4ab0-9d16-1d5225bb324c\t2_detected_potholes.mp4"
    downloads_output = r"C:\Users\Sanjay Kumaar\Downloads\t2_detected_potholes.mp4"
    
    process_video(input_file, artifact_output)
    
    # Also save copy to Downloads folder for user access
    if os.path.exists(artifact_output):
        import shutil
        shutil.copy(artifact_output, downloads_output)
        print(f"[*] Copy saved to Downloads: {downloads_output}")
