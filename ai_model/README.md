# 🛣️ JARVISS • AI Pothole Vision & Road Damage Assessment

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PyTorch CUDA](https://img.shields.io/badge/PyTorch-CUDA%20Accelerated-green.svg)](https://pytorch.org/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/YOLOv8-Instance%20Segmentation-orange.svg)](https://ultralytics.com)
[![Web Dashboard](https://img.shields.io/badge/UI-FastAPI%20%2B%20Glassmorphism-cyan.svg)](http://127.0.0.1:8000)

A high-performance, real-time Computer Vision system for automated pothole detection, polygon instance segmentation, and road surface damage severity assessment. Built on fine-tuned **YOLOv8-seg** with hardware acceleration (NVIDIA RTX 2050 CUDA, ONNX Runtime, and TensorRT).

---

## 📸 Key Features

- 🎯 **Pixel-Level Pothole Segmentation**: Delineates pothole perimeters using polygon masks and bounding boxes.
- ⚡ **Real-Time Edge Performance**: Runs at 45–90+ FPS on GPU with FP16 half-precision and Road ROI optimization.
- 📊 **Road Damage Severity Index (RDSI)**: Automatically computes damage coverage ratio (`Clear`, `Low`, `Moderate`, `Severe`).
- 🛣️ **Road ROI Optimization**: Focuses inference on the 40%–90% road plane and translates coordinates seamlessly back to full-frame coordinates.
- 🔄 **ByteTrack Multi-Object Tracking**: Assigns persistent IDs to track unique potholes across moving vehicle camera feeds.
- 🌐 **Interactive Web Dashboard**: Glassmorphic UI with drag-and-drop image/video analysis, parameter sliders, and audit report generation.
- 🚀 **Multi-Backend Deployment**: Supports `.pt` PyTorch weights, `.onnx` (ONNX Runtime), and `.engine` (NVIDIA TensorRT).

---

## 📁 Repository Structure

```text
pathole_ai_model/
├── models/
│   ├── pothole_v2_training.pt    # Base copy model checkpoint
│   ├── pothole_v2_final.pt       # Fine-tuned best model checkpoint
│   ├── pothole_v2_final.onnx     # Optimized ONNX model
│   └── pothole_v2_final.engine   # TensorRT engine (RTX 2050 specific)
│
├── dataset/                      # YOLOv8 segmentation dataset
│   ├── train/ (images, labels)   # 720 training samples
│   └── valid/ (images, labels)   # 60 validation samples
│
├── scripts/
│   ├── train.py                  # Fine-tuning & training loop
│   ├── inference.py              # Real-time CLI inference engine with ROI & tracking
│   ├── export.py                 # Multi-format model exporter (ONNX / TensorRT)
│   └── benchmark.py              # Comprehensive benchmark suite
│
├── static/                       # Web Dashboard frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── web_app.py                    # FastAPI Web Application & REST API
├── road_damage_assessment_app.py # Standalone OpenCV live feed demo
├── run_pothole_detection.py      # Batch video detection script
├── data.yaml                     # Dataset configuration file
├── requirements.txt              # Project dependencies
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Setup Environment
```bash
git clone https://github.com/<YOUR_REPO>/pathole_ai_model.git
cd pathole_ai_model

# Install dependencies
pip install -r requirements.txt
```

### 2. Verify GPU & CUDA
```bash
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('Device:', torch.cuda.get_device_name(0))"
```

---

## 🖥️ Interactive Web Dashboard

Launch the local web application:
```bash
python web_app.py
```
Open **`http://127.0.0.1:8000`** in your browser to:
- Drag-and-drop road images or video feeds.
- Adjust confidence & IoU thresholds interactively.
- Toggle Road ROI optimization.
- Inspect damage severity grades, pothole areas, and download JSON audit reports.

---

## 🛠️ CLI Inference & Benchmarking

### Run Video Inference
```bash
python scripts/inference.py --source sample_video.mp4 --model models/pothole_v2_final.pt --conf 0.25 --save-video output.mp4 --save-json report.json
```

### Enable Road ROI Optimization & Frame Skipping
```bash
python scripts/inference.py --source sample_video.mp4 --roi --frame-skip 2 --half
```

### Run Model Training / Fine-Tuning
```bash
python scripts/train.py
```

### Export to ONNX & TensorRT
```bash
python scripts/export.py --weights models/pothole_v2_final.pt --imgsz 640
```

### Run Full Benchmark Suite
```bash
python scripts/benchmark.py
```

---

## 📊 Road Damage Severity Index (RDSI)

| Severity Level | Damage Ratio | Pothole Count | Action Required |
| :--- | :--- | :--- | :--- |
| 🟢 **CLEAR** | < 0.05% | 0 | Road surface in good condition |
| 🟡 **LOW DAMAGE** | < 1.5% | 1 – 2 | Minor surface wear detected |
| 🟠 **MODERATE** | 1.5% – 4.5% | 3 – 4 | Scheduled maintenance advised |
| 🔴 **CRITICAL** | > 4.5% | 5+ or deep cluster | Urgent road repair required |

---

## ⚖️ License
This project is licensed under the MIT License - see the `LICENSE.txt` file for details.