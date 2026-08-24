"""
JARVISS Model Exporter:
Exports trained YOLOv8 PyTorch (.pt) weights to ONNX and TensorRT (.engine) formats.
"""

import os
import sys
import shutil
import argparse
import torch
from ultralytics import YOLO

def export_models(
    weights_path="models/pothole_v2_final.pt",
    imgsz=640,
    half=True,
    dynamic=False
):
    if not os.path.exists(weights_path):
        fallbacks = ["models/pothole_v2_final.pt", "models/pothole_v2_training.pt", "models/best.pt", "model/best.pt"]
        for fb in fallbacks:
            if os.path.exists(fb):
                print(f"[*] Warning: '{weights_path}' not found. Using fallback: '{fb}'")
                weights_path = fb
                break

    print(f"[*] Loading model for export from: {weights_path}")
    model = YOLO(weights_path)
    
    exported_files = {}

    # 1. Export ONNX
    print(f"\n[*] Exporting to ONNX (imgsz={imgsz}, dynamic={dynamic})...")
    try:
        onnx_path = model.export(
            format="onnx",
            imgsz=imgsz,
            dynamic=dynamic,
            simplify=True,
            opset=17
        )
        print(f"[✓] Successfully exported ONNX model: {onnx_path}")
        
        # Ensure it is placed in models/
        target_onnx = os.path.join("models", "pothole_v2_final.onnx")
        if os.path.exists(onnx_path) and os.path.abspath(onnx_path) != os.path.abspath(target_onnx):
            shutil.copy2(onnx_path, target_onnx)
            print(f"[✓] Copied ONNX to: {target_onnx}")
        exported_files["onnx"] = target_onnx
    except Exception as e:
        print(f"[!] Error exporting ONNX: {e}")

    # 2. Export TensorRT Engine (if CUDA & TensorRT available)
    if torch.cuda.is_available():
        print(f"\n[*] Attempting TensorRT export (imgsz={imgsz}, half={half}, device=0)...")
        try:
            engine_path = model.export(
                format="engine",
                imgsz=imgsz,
                half=half,
                device=0
            )
            print(f"[✓] Successfully exported TensorRT engine: {engine_path}")
            
            target_engine = os.path.join("models", "pothole_v2_final.engine")
            if os.path.exists(engine_path) and os.path.abspath(engine_path) != os.path.abspath(target_engine):
                shutil.copy2(engine_path, target_engine)
                print(f"[✓] Copied TensorRT engine to: {target_engine}")
            exported_files["engine"] = target_engine
        except Exception as e:
            print(f"[!] TensorRT export not supported or TensorRT package not installed: {e}")
            print("Note: TensorRT (.engine) is hardware-specific and requires TensorRT C++/Python SDK.")
    else:
        print("[!] CUDA not available, skipping TensorRT export.")

    print("\n=== Export Summary ===")
    for fmt, path in exported_files.items():
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            print(f" - {fmt.upper()}: {path} ({size_mb:.2f} MB)")
            
    return exported_files

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export YOLOv8 pothole model")
    parser.add_argument("--weights", type=str, default="models/pothole_v2_final.pt", help="Path to .pt weights")
    parser.add_argument("--imgsz", type=int, default=640, help="Export image size")
    parser.add_argument("--dynamic", action="store_true", help="Enable dynamic shape for ONNX")
    parser.add_argument("--no-half", action="store_true", help="Disable FP16 half precision for TensorRT")
    args = parser.parse_args()

    export_models(
        weights_path=args.weights,
        imgsz=args.imgsz,
        half=not args.no_half,
        dynamic=args.dynamic
    )
