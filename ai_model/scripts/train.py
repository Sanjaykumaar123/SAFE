"""
JARVISS Pothole Segmentation Model Training & Fine-Tuning Script
Fine-tunes 'models/pothole_v2_training.pt' on the pothole dataset and saves the best model to 'models/pothole_v2_final.pt'.
"""

import os
import shutil
import time
import torch
from ultralytics import YOLO

def train():
    # Ensure CUDA is available
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available. Please verify NVIDIA GPU drivers.")
    
    device_name = torch.cuda.get_device_name(0)
    print(f"[*] Training on GPU: {device_name} (VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB)")
    
    # 1. Model checkpoint path
    checkpoint_path = "models/pothole_v2_training.pt"
    if not os.path.exists(checkpoint_path):
        if os.path.exists("model/pothole_v2_training.pt"):
            os.makedirs("models", exist_ok=True)
            shutil.copy2("model/pothole_v2_training.pt", checkpoint_path)
        else:
            raise FileNotFoundError(f"Checkpoint not found at {checkpoint_path}")
            
    print(f"[*] Loading COPY model checkpoint from: {checkpoint_path}")
    model = YOLO(checkpoint_path)
    
    # 2. Start fine-tuning
    print("[*] Starting YOLOv8 segmentation fine-tuning (50 epochs, batch=8, imgsz=640)...")
    t0 = time.time()
    
    results = model.train(
        data="data.yaml",
        epochs=50,
        imgsz=640,
        batch=8,
        workers=0,
        device=0,
        project="runs/pothole",
        name="pothole_v2_training",
        exist_ok=True,
        pretrained=True,
        box=7.5,
        cls=0.5,
        dfl=1.5,
        mosaic=1.0,
        mixup=0.1,
        close_mosaic=10,
        save=True,
        save_period=-1,
        val=True,
        plots=True,
        verbose=True
    )
    
    elapsed = time.time() - t0
    print(f"[✓] Training completed in {elapsed/60:.2f} minutes.")
    
    # 3. Preserve the best trained model (Step 9)
    candidates = [
        os.path.join("runs", "segment", "runs", "pothole", "pothole_v2_training", "weights", "best.pt"),
        os.path.join("runs", "pothole", "pothole_v2_training", "weights", "best.pt")
    ]
    final_model_path = os.path.join("models", "pothole_v2_final.pt")
    
    saved = False
    for cand in candidates:
        if os.path.exists(cand):
            os.makedirs("models", exist_ok=True)
            shutil.copy2(cand, final_model_path)
            print(f"[✓] Best trained model preserved and saved to: {final_model_path}")
            saved = True
            break
            
    if not saved:
        print("[!] Warning: Could not locate best.pt in standard run directories.")

    return results

if __name__ == "__main__":
    train()
