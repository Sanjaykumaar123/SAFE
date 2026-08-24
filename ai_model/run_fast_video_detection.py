import os
import time
import cv2
import torch
from ultralytics import YOLO

def process_video_fast(input_path: str, artifact_output: str, downloads_output: str):
    print(f"[*] Starting Fast PyTorch YOLOv8 Video Inference...")
    print(f"[*] Input: {input_path}")
    print(f"[*] Target Artifact Output: {artifact_output}")

    model_path = os.path.abspath("ai_model/models/pothole_v2_final.pt")
    if not os.path.exists(model_path):
        model_path = os.path.abspath("models/pothole_v2_final.pt")
    
    print(f"[*] Loading Model: {model_path}")
    model = YOLO(model_path)
    device = 0 if torch.cuda.is_available() else "cpu"

    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"[*] Video Spec: {width}x{height} @ {fps:.1f} FPS, {total_frames} frames")

    os.makedirs(os.path.dirname(artifact_output), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(artifact_output, fourcc, fps, (width, height))

    frame_idx = 0
    total_detections = 0
    t0 = time.time()

    with torch.no_grad():
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            
            # Predict every frame with 320px fast resolution
            results = model.predict(
                source=frame,
                conf=0.25,
                iou=0.45,
                imgsz=320,
                device=device,
                verbose=False
            )
            r = results[0]
            has_det = False

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

                    if y1_norm < 0.15 and y2_norm < 0.32:
                        continue

                    has_det = True
                    total_detections += 1

                    # Thick Red Bounding Box (#EF4444)
                    box_color = (68, 68, 239)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 4)

                    # Label Badge
                    label_text = f"POTHOLE {int(cf * 100)}%"
                    (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                    badge_y1 = max(0, y1 - th - 10)
                    badge_y2 = max(th + 10, y1)
                    cv2.rectangle(frame, (x1, badge_y1), (x1 + tw + 12, badge_y2), box_color, -1)
                    cv2.putText(frame, label_text, (x1 + 6, badge_y2 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)

            if has_det:
                cv2.rectangle(frame, (20, 20), (450, 70), (68, 68, 239), -1)
                cv2.putText(frame, "SAFEPATH AI · POTHOLE DETECTED", (32, 54), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)

            out.write(frame)

            if frame_idx % 60 == 0 or frame_idx == total_frames:
                print(f"[+] Frame {frame_idx}/{total_frames} ({frame_idx/total_frames*100:.1f}%) processed")

    cap.release()
    out.release()
    t_end = time.time()
    print(f"[🎉 FINISHED] Complete in {t_end - t0:.2f}s! Total Detections: {total_detections}")

    if os.path.exists(artifact_output):
        import shutil
        shutil.copy(artifact_output, downloads_output)
        print(f"[*] Output copied to Downloads: {downloads_output}")

if __name__ == "__main__":
    inp = r"C:\Users\Sanjay Kumaar\Downloads\t2.mp4"
    art = r"C:\Users\Sanjay Kumaar\.gemini\antigravity-ide\brain\cd56d94c-f542-4ab0-9d16-1d5225bb324c\t2_detected_potholes.mp4"
    dl = r"C:\Users\Sanjay Kumaar\Downloads\t2_detected_potholes.mp4"
    process_video_fast(inp, art, dl)
