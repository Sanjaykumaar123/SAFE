"""
SafePath AI & JARVISS Pothole AI Interactive Web Application & REST API
Full backend serving SafePath Mobile Android App (APK) & Web Dashboard.
Powered by FastAPI, PyTorch, Ultralytics YOLOv8, and OpenCV.
"""

import os
import sys
import io
import base64
import time
import json
import uuid
from datetime import datetime, timezone

# Ensure both local folder and parent root are in sys.path
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

import torch
import cv2
import numpy as np
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, UploadFile, Form, Request, Body, Path, Query
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="SafePath AI & JARVISS Pothole AI System", version="2.0.0")

# Enable CORS for all mobile and web origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Model loader with fallback
_model = None
_model_path = None

def get_model():
    global _model, _model_path
    if _model is not None:
        return _model

    candidates = [
        os.path.join(_this_dir, "models", "pothole_v2_final.pt"),
        os.path.join(_this_dir, "models", "best.pt"),
        os.path.join(_this_dir, "models", "pothole_v2_training.pt"),
        os.path.join(_this_dir, "model", "best.pt"),
        "ai_model/models/pothole_v2_final.pt",
        "ai_model/models/best.pt",
        "models/pothole_v2_final.pt",
        "models/best.pt"
    ]
    for c in candidates:
        if os.path.exists(c):
            _model_path = c
            print(f"[*] Web App loading trained AI model from: {c}")
            try:
                _model = YOLO(c)
                return _model
            except Exception as ex:
                print(f"[!] Error loading model checkpoint {c}: {ex}")

    try:
        _model = YOLO("yolov8n.pt")
        return _model
    except Exception:
        return None

def _public_base_url(request: Request) -> str:
    """Build the externally-reachable base URL for media links returned to clients.
    Prefers the PUBLIC_BASE_URL env var (for deployments behind a fixed host/proxy),
    falling back to the host actually used to reach this request instead of a
    hardcoded LAN IP that only works on one specific network.
    """
    env_base = os.environ.get("PUBLIC_BASE_URL")
    if env_base:
        return env_base.rstrip("/")
    return str(request.base_url).rstrip("/")

def compute_severity(damage_ratio, pothole_count):
    if pothole_count == 0 or damage_ratio < 0.0005:
        return {"grade": 0, "label": "CLEAR / GOOD", "color": "#10b981", "desc": "Road surface is in good condition."}
    elif damage_ratio < 0.015 and pothole_count <= 2:
        return {"grade": 1, "label": "LOW DAMAGE", "color": "#eab308", "desc": "Minor surface wear or small potholes detected."}
    elif damage_ratio < 0.045 or pothole_count <= 4:
        return {"grade": 2, "label": "MODERATE DAMAGE", "color": "#f97316", "desc": "Noticeable potholes requiring scheduled maintenance."}
    else:
        return {"grade": 3, "label": "CRITICAL / SEVERE", "color": "#ef4444", "desc": "Severe pothole damage. Urgent repair recommended."}

# ---------------- SafePath AI Schemas & Database Mock ----------------

class BoundingBoxModel(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class UserModel(BaseModel):
    id: str
    email: str
    fullName: str
    full_name: Optional[str] = None
    role: str
    isDemoData: bool = True
    is_demo_data: bool = True

    def __init__(self, **data):
        if "fullName" in data and "full_name" not in data:
            data["full_name"] = data["fullName"]
        elif "full_name" in data and "fullName" not in data:
            data["fullName"] = data["full_name"]
        if "isDemoData" in data and "is_demo_data" not in data:
            data["is_demo_data"] = data["isDemoData"]
        elif "is_demo_data" in data and "isDemoData" not in data:
            data["isDemoData"] = data["is_demo_data"]
        super().__init__(**data)

class TokenPairModel(BaseModel):
    accessToken: str
    refreshToken: str
    tokenType: str = "bearer"
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"

    def __init__(self, **data):
        if "accessToken" in data and "access_token" not in data:
            data["access_token"] = data["accessToken"]
        elif "access_token" in data and "accessToken" not in data:
            data["accessToken"] = data["access_token"]
        if "refreshToken" in data and "refresh_token" not in data:
            data["refresh_token"] = data["refreshToken"]
        elif "refresh_token" in data and "refreshToken" not in data:
            data["refreshToken"] = data["refresh_token"]
        super().__init__(**data)

class TokenResponse(BaseModel):
    accessToken: str
    access_token: Optional[str] = None
    refreshToken: str
    refresh_token: Optional[str] = None
    tokenType: str = "bearer"
    token_type: Optional[str] = "bearer"
    expiresInMinutes: int = 1440
    expires_in_minutes: Optional[int] = 1440
    user: UserModel
    tokens: Optional[TokenPairModel] = None

    def __init__(self, **data):
        if "accessToken" in data and "access_token" not in data:
            data["access_token"] = data["accessToken"]
        elif "access_token" in data and "accessToken" not in data:
            data["accessToken"] = data["access_token"]
        if "refreshToken" in data and "refresh_token" not in data:
            data["refresh_token"] = data["refreshToken"]
        elif "refresh_token" in data and "refreshToken" not in data:
            data["refreshToken"] = data["refresh_token"]
        if "tokens" not in data and "accessToken" in data:
            acc_tok = data.get("accessToken") or data.get("access_token", "")
            ref_tok = data.get("refreshToken") or data.get("refresh_token", "")
            tok_typ = data.get("tokenType") or data.get("token_type", "bearer")
            data["tokens"] = TokenPairModel(
                accessToken=acc_tok,
                refreshToken=ref_tok,
                tokenType=tok_typ
            )
        super().__init__(**data)

class LoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    password: str

    def get_user_identifier(self) -> str:
        return self.email or self.identifier or self.username or self.phone or "demo.citizen@safepath.ai"

class RegisterRequest(BaseModel):
    email: str
    password: str
    fullName: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "CITIZEN"

    def __init__(self, **data):
        if "fullName" in data and "full_name" not in data:
            data["full_name"] = data["fullName"]
        elif "full_name" in data and "fullName" not in data:
            data["fullName"] = data["full_name"]
        super().__init__(**data)

class LogoutRequest(BaseModel):
    refreshToken: Optional[str] = None
    refresh_token: Optional[str] = None

class CreateCitizenReportRequest(BaseModel):
    type: str = "pothole"
    description: Optional[str] = "Pothole hazard reported by citizen"
    photoUrl: Optional[str] = None
    photo_url: Optional[str] = None
    latitude: float = 12.9716
    longitude: float = 77.5946
    locationName: Optional[str] = "Central Avenue Road"
    location_name: Optional[str] = None

    def __init__(self, **data):
        if "photoUrl" in data and "photo_url" not in data:
            data["photo_url"] = data["photoUrl"]
        elif "photo_url" in data and "photoUrl" not in data:
            data["photoUrl"] = data["photo_url"]
        if "locationName" in data and "location_name" not in data:
            data["location_name"] = data["locationName"]
        elif "location_name" in data and "locationName" not in data:
            data["locationName"] = data["location_name"]
        super().__init__(**data)

class HazardModel(BaseModel):
    id: str
    title: str
    description: str
    type: str
    severity: str
    status: str
    latitude: float
    longitude: float
    locationName: str
    location_name: Optional[str] = None
    roadName: Optional[str] = None
    road_name: Optional[str] = None
    locationText: Optional[str] = None
    location_text: Optional[str] = None
    photoUrl: Optional[str] = None
    photo_url: Optional[str] = None
    aiConfidence: float = 0.92
    ai_confidence: Optional[float] = 0.92
    riskScore: float = 7.5
    risk_score: Optional[float] = 7.5
    createdAt: str
    created_at: Optional[str] = None
    isDemoData: bool = True
    is_demo_data: bool = True
    bbox: Optional[BoundingBoxModel] = None

    def __init__(self, **data):
        loc = data.get("locationName") or data.get("location_name") or data.get("locationText") or data.get("location_text") or data.get("roadName") or data.get("road_name") or "Chennai Sector"
        data["locationName"] = loc
        data["location_name"] = loc
        data["locationText"] = loc
        data["location_text"] = loc
        data["roadName"] = loc
        data["road_name"] = loc

        if "type" in data and isinstance(data["type"], str):
            data["type"] = data["type"].upper()

        if "photoUrl" in data and "photo_url" not in data:
            data["photo_url"] = data["photoUrl"]
        elif "photo_url" in data and "photoUrl" not in data:
            data["photoUrl"] = data["photo_url"]
        if "aiConfidence" in data and "ai_confidence" not in data:
            data["ai_confidence"] = data["aiConfidence"]
        elif "ai_confidence" in data and "aiConfidence" not in data:
            data["aiConfidence"] = data["ai_confidence"]
        if "riskScore" in data and "risk_score" not in data:
            data["risk_score"] = data["riskScore"]
        elif "risk_score" in data and "riskScore" not in data:
            data["riskScore"] = data["risk_score"]
        if "createdAt" in data and "created_at" not in data:
            data["created_at"] = data["createdAt"]
        elif "created_at" in data and "createdAt" not in data:
            data["createdAt"] = data["created_at"]
        if "isDemoData" in data and "is_demo_data" not in data:
            data["is_demo_data"] = data["isDemoData"]
        elif "is_demo_data" in data and "isDemoData" not in data:
            data["isDemoData"] = data["is_demo_data"]
        super().__init__(**data)

class RoutePointModel(BaseModel):
    lat: float
    lng: float

class RouteOptionModel(BaseModel):
    category: str
    title: str
    distanceKm: float
    distance_km: Optional[float] = None
    durationMinutes: int
    duration_minutes: Optional[int] = None
    riskScore: float
    risk_score: Optional[float] = None
    hazardCount: int
    hazard_count: Optional[int] = None
    isRecommended: bool
    is_recommended: Optional[bool] = None
    routingNote: str
    routing_note: Optional[str] = None
    polyline: List[RoutePointModel]

    def __init__(self, **data):
        if "distanceKm" in data and "distance_km" not in data:
            data["distance_km"] = data["distanceKm"]
        if "durationMinutes" in data and "duration_minutes" not in data:
            data["duration_minutes"] = data["durationMinutes"]
        if "riskScore" in data and "risk_score" not in data:
            data["risk_score"] = data["riskScore"]
        if "hazardCount" in data and "hazard_count" not in data:
            data["hazard_count"] = data["hazardCount"]
        if "isRecommended" in data and "is_recommended" not in data:
            data["is_recommended"] = data["isRecommended"]
        if "routingNote" in data and "routing_note" not in data:
            data["routing_note"] = data["routingNote"]
        super().__init__(**data)

class SaferRouteRequest(BaseModel):
    origin: Union[str, Dict[str, Any], List[float]] = "12.9716, 77.5946"
    destination: Union[str, Dict[str, Any], List[float]] = "12.9352, 77.6245"

class SaferRouteResponse(BaseModel):
    routes: List[RouteOptionModel]

class WorkOrderModel(BaseModel):
    id: str
    hazardId: str
    hazard_id: Optional[str] = None
    contractorId: Optional[str] = "cont_rapid_roads_01"
    contractor_id: Optional[str] = "cont_rapid_roads_01"
    status: str = "IN_PROGRESS"
    priority: str = "HIGH"
    slaDeadline: str = "2026-08-25T18:00:00Z"
    sla_deadline: Optional[str] = "2026-08-25T18:00:00Z"
    slaBreached: bool = False
    sla_breached: Optional[bool] = False
    createdAt: str = "2026-08-22T09:00:00Z"
    created_at: Optional[str] = "2026-08-22T09:00:00Z"
    estimatedCompletion: str = "2026-08-25T17:00:00Z"
    estimated_completion: Optional[str] = "2026-08-25T17:00:00Z"
    actualCompletion: Optional[str] = None
    actual_completion: Optional[str] = None
    hazard: Optional[HazardModel] = None

    def __init__(self, **data):
        if "hazardId" in data and "hazard_id" not in data:
            data["hazard_id"] = data["hazardId"]
        if "contractorId" in data and "contractor_id" not in data:
            data["contractor_id"] = data["contractorId"]
        if "slaDeadline" in data and "sla_deadline" not in data:
            data["sla_deadline"] = data["slaDeadline"]
        if "slaBreached" in data and "sla_breached" not in data:
            data["sla_breached"] = data["slaBreached"]
        if "createdAt" in data and "created_at" not in data:
            data["created_at"] = data["createdAt"]
        if "estimatedCompletion" in data and "estimated_completion" not in data:
            data["estimated_completion"] = data["estimatedCompletion"]
        if "actualCompletion" in data and "actual_completion" not in data:
            data["actual_completion"] = data["actualCompletion"]
        super().__init__(**data)

class CreateWorkOrderRequest(BaseModel):
    hazardId: str
    hazard_id: Optional[str] = None
    contractorId: Optional[str] = "cont_rapid_roads_01"
    contractor_id: Optional[str] = "cont_rapid_roads_01"
    priority: Optional[str] = "HIGH"
    slaDeadline: Optional[str] = "2026-08-25T18:00:00Z"
    sla_deadline: Optional[str] = "2026-08-25T18:00:00Z"

    def __init__(self, **data):
        if "hazardId" in data and "hazard_id" not in data:
            data["hazard_id"] = data["hazardId"]
        elif "hazard_id" in data and "hazardId" not in data:
            data["hazardId"] = data["hazard_id"]
        super().__init__(**data)

class UpdateWorkOrderStatusRequest(BaseModel):
    status: str

try:
    from ai_model.db import db_manager
except (ImportError, ModuleNotFoundError):
    from db import db_manager

# Seed in-memory demo data and sync with database
INITIAL_HAZARDS: List[HazardModel] = [
    HazardModel(
        id="haz_101",
        title="Severe Pothole Cluster",
        description="Deep multi-edge road cavity causing severe vehicle deceleration.",
        type="pothole",
        severity="CRITICAL",
        status="VERIFIED",
        latitude=12.9716,
        longitude=77.5946,
        locationName="MG Road Sector 4",
        photoUrl="/static/images/pothole_sample_1.jpg",
        aiConfidence=0.96,
        riskScore=8.8,
        createdAt="2026-08-22T10:15:00Z",
        isDemoData=True,
        bbox=BoundingBoxModel(x1=0.22, y1=0.45, x2=0.78, y2=0.88)
    ),
    HazardModel(
        id="haz_102",
        title="Surface Asphalt Delamination",
        description="Moderate surface wear expanding on right-hand lane.",
        type="pothole",
        severity="MEDIUM",
        status="REPORTED",
        latitude=12.9780,
        longitude=77.6010,
        locationName="Brigade Junction, 100ft Rd",
        photoUrl="/static/images/pothole_sample_2.jpg",
        aiConfidence=0.89,
        riskScore=6.2,
        createdAt="2026-08-22T11:30:00Z",
        isDemoData=True,
        bbox=BoundingBoxModel(x1=0.35, y1=0.50, x2=0.65, y2=0.80)
    ),
    HazardModel(
        id="haz_103",
        title="Edge Breakdown & Shoulder Pothole",
        description="Pothole on left shoulder near storm drain.",
        type="pothole",
        severity="LOW",
        status="IN_PROGRESS",
        latitude=12.9650,
        longitude=77.5850,
        locationName="Richmond Circle Bypass",
        photoUrl="/static/images/pothole_sample_3.jpg",
        aiConfidence=0.84,
        riskScore=4.1,
        createdAt="2026-08-22T08:00:00Z",
        isDemoData=True,
        bbox=BoundingBoxModel(x1=0.10, y1=0.60, x2=0.45, y2=0.92)
    )
]

def _sync_db_hazards():
    db_rows = db_manager.get_all_hazards()
    loaded_hazards = []
    for r in db_rows:
        try:
            r_copy = dict(r)
            if r_copy.get("bbox") and isinstance(r_copy["bbox"], dict):
                r_copy["bbox"] = BoundingBoxModel(**r_copy["bbox"])
            loaded_hazards.append(HazardModel(**r_copy))
        except Exception:
            pass
    return loaded_hazards

DEMO_HAZARDS: List[HazardModel] = _sync_db_hazards()

DEMO_WORK_ORDERS: List[WorkOrderModel] = [
    WorkOrderModel(
        id="wo_201",
        hazardId="haz_101",
        contractorId="cont_infra_tech",
        status="IN_PROGRESS",
        priority="CRITICAL",
        slaDeadline="2026-08-24T18:00:00Z",
        slaBreached=False,
        createdAt="2026-08-22T10:45:00Z",
        estimatedCompletion="2026-08-24T16:00:00Z",
        hazard=DEMO_HAZARDS[0]
    )
]

def _sync_db_work_orders():
    """Merge the in-memory demo work orders with anything persisted to safepath.db,
    so work orders created/updated via the API survive a server restart."""
    db_rows = db_manager.get_all_work_orders()
    hazards_by_id = {h.id: h for h in DEMO_HAZARDS}
    seed_by_id = {w.id: w for w in DEMO_WORK_ORDERS}
    merged = dict(seed_by_id)
    for r in db_rows:
        try:
            r_copy = dict(r)
            r_copy["hazard"] = hazards_by_id.get(r_copy.get("hazardId"))
            merged[r_copy["id"]] = WorkOrderModel(**r_copy)
        except Exception:
            pass
    return list(merged.values())

# ---------------- Database Health Endpoint ----------------

@app.get("/api/db/status")
async def get_db_status():
    count = db_manager.get_hazard_count()
    return {
        "status": "healthy",
        "persistent_database": True,
        "db_file": db_manager.db_path,
        "hazard_records": count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ---------------- Authentication Endpoints ----------------

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    raw_id = req.get_user_identifier()
    email_clean = raw_id.strip().lower()
    
    # Determine role based on email or demo profile
    if "collector" in email_clean or "fleet" in email_clean:
        role = "FLEET_OPERATOR"
        full_name = "Demo Data Collector"
    elif "admin" in email_clean:
        role = "MUNICIPAL_ADMIN"
        full_name = "Municipal Administrator"
    elif "officer" in email_clean:
        role = "MUNICIPAL_OFFICER"
        full_name = "Road Inspection Officer"
    else:
        role = "CITIZEN"
        full_name = "Arun Kumar"
        
    user_dto = UserModel(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=raw_id if "@" in raw_id else f"{raw_id}@safepath.demo",
        fullName=full_name,
        role=role,
        isDemoData=True
    )
    
    return TokenResponse(
        accessToken=f"eySafePathJwtToken_{uuid.uuid4().hex}",
        refreshToken=f"eySafePathRefresh_{uuid.uuid4().hex}",
        tokenType="bearer",
        expiresInMinutes=1440,
        user=user_dto
    )

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    user_dto = UserModel(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=req.email,
        fullName=req.fullName,
        role=req.role or "CITIZEN",
        isDemoData=True
    )
    return TokenResponse(
        accessToken=f"eySafePathJwtToken_{uuid.uuid4().hex}",
        refreshToken=f"eySafePathRefresh_{uuid.uuid4().hex}",
        tokenType="bearer",
        expiresInMinutes=1440,
        user=user_dto
    )

@app.get("/api/auth/me", response_model=UserModel)
async def get_current_user():
    return UserModel(
        id="usr_current_demo",
        email="citizen@safepath.demo",
        fullName="SafePath Active User",
        role="CITIZEN",
        isDemoData=True
    )

@app.post("/api/auth/logout")
async def logout(req: LogoutRequest = Body(default=None)):
    return {"status": "success", "message": "Logged out successfully."}

# ---------------- Road Hazards & Citizen Reporting ----------------

@app.get("/api/hazards", response_model=List[HazardModel])
async def get_hazards(
    status_filter: Optional[str] = Query(None, alias="status"),
    role: Optional[str] = Query(None)
):
    current_hazards = _sync_db_hazards()
    if status_filter:
        return [h for h in current_hazards if h.status.lower() == status_filter.lower()]
    return current_hazards

@app.post("/api/hazards/{hazard_id}/verify", response_model=HazardModel)
async def verify_hazard(hazard_id: str = Path(...)):
    db_manager.update_hazard_status(hazard_id, "VERIFIED")
    for h in DEMO_HAZARDS:
        if h.id == hazard_id:
            h.status = "VERIFIED"
            return h
    return DEMO_HAZARDS[0]

@app.post("/api/hazards/{hazard_id}/reject", response_model=HazardModel)
async def reject_hazard(hazard_id: str = Path(...)):
    db_manager.update_hazard_status(hazard_id, "REJECTED")
    for h in DEMO_HAZARDS:
        if h.id == hazard_id:
            h.status = "REJECTED"
            return h
    return DEMO_HAZARDS[0]

# ---------------- Safer Routes & Navigation ----------------

@app.post("/api/routes/safer", response_model=SaferRouteResponse)
async def get_safer_routes(req: SaferRouteRequest):
    # Construct 3 realistic route options with polylines
    safest_polyline = [
        RoutePointModel(lat=12.9716, lng=77.5946),
        RoutePointModel(lat=12.9730, lng=77.5980),
        RoutePointModel(lat=12.9760, lng=77.6050),
        RoutePointModel(lat=12.9800, lng=77.6120),
        RoutePointModel(lat=12.9835, lng=77.6200),
    ]
    fastest_polyline = [
        RoutePointModel(lat=12.9716, lng=77.5946),
        RoutePointModel(lat=12.9700, lng=77.6000),
        RoutePointModel(lat=12.9680, lng=77.6100),
        RoutePointModel(lat=12.9835, lng=77.6200),
    ]
    
    return SaferRouteResponse(
        routes=[
            RouteOptionModel(
                category="Safest",
                title="Safe Corridor via Arterial Express",
                distanceKm=6.4,
                durationMinutes=15,
                riskScore=1.1,
                hazardCount=0,
                isRecommended=True,
                routingNote="Paved surface with 0 reported potholes along this corridor.",
                polyline=safest_polyline
            ),
            RouteOptionModel(
                category="Fastest",
                title="Direct Route via Central Avenue",
                distanceKm=4.8,
                durationMinutes=12,
                riskScore=7.4,
                hazardCount=3,
                isRecommended=False,
                routingNote="Contains 2 verified pothole clusters. Moderate bump severity.",
                polyline=fastest_polyline
            )
        ]
    )

# ---------------- Work Orders (Municipal Maintenance) ----------------

@app.get("/api/work-orders", response_model=List[WorkOrderModel])
async def list_work_orders():
    return _sync_db_work_orders()

@app.post("/api/work-orders", response_model=WorkOrderModel)
async def create_work_order(req: CreateWorkOrderRequest):
    h = next((x for x in DEMO_HAZARDS if x.id == req.hazardId), DEMO_HAZARDS[0])
    wo = WorkOrderModel(
        id=f"wo_{uuid.uuid4().hex[:6]}",
        hazardId=req.hazardId,
        contractorId=req.contractorId,
        status="OPEN",
        priority=req.priority or "HIGH",
        slaDeadline=req.slaDeadline or "2026-08-26T18:00:00Z",
        createdAt=datetime.now(timezone.utc).isoformat(),
        hazard=h
    )
    db_manager.save_work_order(wo.dict())
    DEMO_WORK_ORDERS.insert(0, wo)
    return wo

@app.patch("/api/work-orders/{wo_id}/status")
@app.post("/api/work-orders/{wo_id}/status")
async def update_work_order_status(wo_id: str, req: UpdateWorkOrderStatusRequest):
    db_manager.update_work_order_status(wo_id, req.status)
    for w in DEMO_WORK_ORDERS:
        if w.id == wo_id:
            w.status = req.status
            return w
    current = _sync_db_work_orders()
    found = next((w for w in current if w.id == wo_id), None)
    return found or (current[0] if current else None)

# ---------------- AI Vision & Camera Detection Endpoints ----------------

class AiDetectRequest(BaseModel):
    imageBase64: Optional[str] = None
    image_base64: Optional[str] = None
    frameImageBase64: Optional[str] = None
    frame_image_base64: Optional[str] = None
    confidenceThreshold: Optional[float] = 0.20
    confidence_threshold: Optional[float] = 0.20
    classes: Optional[List[str]] = ["pothole"]

    def __init__(self, **data):
        img = data.get("imageBase64") or data.get("image_base64") or data.get("frameImageBase64") or data.get("frame_image_base64")
        if img:
            data["imageBase64"] = img
            data["image_base64"] = img
            data["frameImageBase64"] = img
            data["frame_image_base64"] = img
        conf = data.get("confidenceThreshold") if data.get("confidenceThreshold") is not None else data.get("confidence_threshold")
        if conf is not None:
            data["confidenceThreshold"] = conf
            data["confidence_threshold"] = conf
        super().__init__(**data)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    cuda_avail = torch.cuda.is_available()
    device_str = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    return {
        "status": "healthy",
        "model": "safepath-yolov8-pothole-v2",
        "version": "2.0.0",
        "device": device_str,
        "cuda_available": cuda_avail
    }

@app.get("/model/info")
async def model_info():
    cuda_avail = torch.cuda.is_available()
    device_str = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    return {
        "modelName": "safepath-yolov8-pothole-v2",
        "model_name": "safepath-yolov8-pothole-v2",
        "model": "safepath-yolov8-pothole-v2",
        "version": "2.0.0",
        "modelVersion": "2.0.0",
        "model_version": "2.0.0",
        "framework": "Ultralytics YOLOv8-seg (PyTorch)",
        "isLoaded": True,
        "is_loaded": True,
        "device": device_str,
        "classes": ["pothole"],
        "confidenceThreshold": 0.20,
        "confidence_threshold": 0.20
    }

@app.post("/detect")
@app.post("/api/detect")
@app.post("/api/ai/detect")
@app.post("/api/ai/analyze-pothole")
@app.post("/api/ai/detect-pothole")
async def detect_potholes_mobile(req: Dict[str, Any] = Body(default={})):
    """
    Direct mobile camera inference endpoint matching SafePath AI APK contract.
    Handles raw JSON dictionaries, snake_case/camelCase, and normalized bounding boxes.
    """
    raw_b64 = (
        req.get("imageBase64")
        or req.get("image_base64")
        or req.get("image_base_64")
        or req.get("frameImageBase64")
        or req.get("frame_image_base64")
        or req.get("frame_image_base_64")
        or req.get("image")
        or req.get("frame")
    )
    if not raw_b64:
        return JSONResponse(status_code=400, content={"error": "Missing imageBase64 / image_base64 in request body"})

    try:
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return JSONResponse(status_code=400, content={"error": "Failed to decode image buffer"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Base64 decode failed: {str(e)}"})

    orig_h, orig_w = frame.shape[:2]
    model = get_model()
    conf_thresh = float(req.get("confidenceThreshold") or req.get("confidence_threshold") or 0.20)

    t0 = time.time()
    detections = []
    latency_ms = 45.0

    if model is not None:
        try:
            results = model.predict(
                source=frame,
                conf=conf_thresh,
                iou=0.45,
                max_det=300,
                imgsz=640,
                device=0 if torch.cuda.is_available() else "cpu",
                half=torch.cuda.is_available(),
                verbose=False
            )
            latency_ms = (time.time() - t0) * 1000
            r = results[0]

            if r.boxes is not None and len(r.boxes) > 0:
                boxes = r.boxes.xyxy.cpu().numpy()
                confs = r.boxes.conf.cpu().numpy()
                clss = r.boxes.cls.cpu().numpy()
                model_names = getattr(model, "names", {}) or {}
                num_potholes = len(boxes)

                for i in range(num_potholes):
                    bx = boxes[i]
                    cf = float(confs[i])
                    if cf < conf_thresh:
                        continue  # Require caller/model-configured minimum confidence for high-speed road potholes

                    # Reject any class the loaded checkpoint doesn't call a pothole (guards against
                    # mislabeling every COCO object as POTHOLE if the trained model failed to load).
                    cls_name = str(model_names.get(int(clss[i]), "")).lower()
                    if "pothole" not in cls_name:
                        continue

                    x1_norm = max(0.0, min(1.0, float(bx[0]) / orig_w))
                    y1_norm = max(0.0, min(1.0, float(bx[1]) / orig_h))
                    x2_norm = max(0.0, min(1.0, float(bx[2]) / orig_w))
                    y2_norm = max(0.0, min(1.0, float(bx[3]) / orig_h))

                    # Filter out sky / upper ceiling header false positives (potholes are on road ground)
                    if y1_norm < 0.15 and y2_norm < 0.32:
                        continue  # Discard upper sky/ceiling predictions

                    raw_conf = float(round(cf, 3))
                    sev = "CRITICAL DAMAGE" if raw_conf > 0.75 else ("MODERATE DAMAGE" if raw_conf > 0.60 else "LOW DAMAGE")

                    detections.append({
                        "class": "POTHOLE",
                        "hazardClass": "POTHOLE",
                        "hazard_class": "POTHOLE",
                        "hazardType": "POTHOLE",
                        "hazard_type": "POTHOLE",
                        "hazard": "POTHOLE",
                        "className": "POTHOLE",
                        "class_name": "POTHOLE",
                        "type": "POTHOLE",
                        "confidence": raw_conf,
                        "aiConfidence": raw_conf,
                        "ai_confidence": raw_conf,
                        "evidenceConfidence": raw_conf,
                        "evidence_confidence": raw_conf,
                        "severity": sev,
                        "severityLevel": "CRITICAL" if raw_conf > 0.7 else "MODERATE",
                        "severity_level": "CRITICAL" if raw_conf > 0.7 else "MODERATE",
                        "bbox": {
                            "x1": x1_norm,
                            "y1": y1_norm,
                            "x2": x2_norm,
                            "y2": y2_norm
                        }
                    })
        except Exception as ex:
            print(f"[!] YOLO inference error: {ex}")

    int_latency = max(1, int(round(latency_ms)))
    has_detections = len(detections) > 0

    return {
        "detections": detections,
        "inferenceLatencyMs": int_latency,
        "inference_latency_ms": int_latency,
        "inferenceTimeMs": int_latency,
        "inference_time_ms": int_latency,
        "roadScene": has_detections,
        "road_scene": has_detections,
        "roadSceneConfidence": 0.99 if has_detections else 0.15,
        "road_scene_confidence": 0.99 if has_detections else 0.15,
        "isRoad": has_detections,
        "is_road": has_detections,
        "isSafe": not has_detections,
        "is_safe": not has_detections,
        "modelVersion": "safepath-yolov8-pothole-v1",
        "model_version": "safepath-yolov8-pothole-v1",
        "modelName": "safepath-yolov8-pothole-v1",
        "model_name": "safepath-yolov8-pothole-v1",
        "rejectionMessage": None if has_detections else "No confident road pothole detected in this photo.",
        "rejection_message": None if has_detections else "No confident road pothole detected in this photo.",
        "hazardCount": len(detections),
        "hazard_count": len(detections)
    }

@app.post("/api/ai/detections")
async def ingest_ai_detection(req: Dict[str, Any] = Body(...)):
    h = DEMO_HAZARDS[0]
    return {
        "stable": True,
        "isStable": True,
        "is_stable": True,
        "hazard": h,
        "hazardId": h.id,
        "hazard_id": h.id,
        "success": True,
        "message": "AI detection observation ingested successfully"
    }

@app.post("/api/uploads/image")
async def upload_image(data: Dict[str, Any] = Body(...)):
    """Uploads base64 image and returns accessible URL"""
    raw_b64 = data.get("imageBase64", "")
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]
    filename = f"hazard_{uuid.uuid4().hex[:8]}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(raw_b64))
    return {"url": f"/uploads/{filename}"}

@app.post("/api/ai/detections")
async def ingest_ai_detections(data: Dict[str, Any] = Body(...)):
    """Collector session ingestion acknowledgement"""
    return {
        "status": "success",
        "stable": True,
        "detectionsInWindow": data.get("detectionsInWindow", 1),
        "message": "Detections ingested successfully."
    }

# Mock Geocoding / Reverse Geocoding endpoints for offline support
@app.get("/search")
async def geocode_search(q: str = Query("Bengaluru")):
    return [{
        "place_id": 1001,
        "lat": "12.9716",
        "lon": "77.5946",
        "display_name": f"{q}, Karnataka, India"
    }]

@app.get("/reverse")
async def geocode_reverse(lat: float = 12.9716, lon: float = 77.5946):
    return {
        "place_id": 1001,
        "lat": str(lat),
        "lon": str(lon),
        "display_name": "Main Highway Sector, SafePath Zone"
    }

# ---------------- Dashboard & Web Endpoints ----------------

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>SafePath AI & JARVISS Dashboard loading...</h1>")

@app.get("/api/system-info")
async def system_info():
    cuda_avail = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    active_m = _model_path if _model_path else "models/pothole_v2_final.pt"
    return {
        "system": "SafePath AI & JARVISS Road AI Suite",
        "cuda_available": cuda_avail,
        "gpu_model": gpu_name,
        "pytorch_version": torch.__version__,
        "active_model": active_m,
        "status": "Ready"
    }

@app.post("/api/predict/image")
async def predict_image(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
    iou: float = Form(0.5),
    imgsz: int = Form(640),
    use_roi: bool = Form(False)
):
    model = get_model()
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image file."})
        
    orig_h, orig_w = frame.shape[:2]
    roi_y1 = int(orig_h * 0.40) if use_roi else 0
    roi_y2 = int(orig_h * 0.90) if use_roi else orig_h
    infer_frame = frame[roi_y1:roi_y2, :] if use_roi else frame

    t0 = time.time()
    results = model.predict(
        source=infer_frame,
        conf=conf,
        iou=iou,
        imgsz=imgsz,
        device=0 if torch.cuda.is_available() else "cpu",
        half=torch.cuda.is_available(),
        verbose=False
    )
    latency_ms = (time.time() - t0) * 1000

    r = results[0]
    annotated = frame.copy()
    mask_canvas = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
    
    potholes_count = 0
    total_pothole_pixels = 0
    boxes_out = []
    
    if r.boxes is not None and len(r.boxes) > 0:
        potholes_count = len(r.boxes)
        boxes = r.boxes.xyxy.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()

        for i in range(len(boxes)):
            bx = boxes[i]
            cf = float(confs[i])
            x1, y1, x2, y2 = int(bx[0]), int(bx[1] + roi_y1), int(bx[2]), int(bx[3] + roi_y1)
            boxes_out.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": round(cf, 3)
            })
            # Draw bbox
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(annotated, f"Pothole: {cf:.2f}", (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

    if r.masks is not None and len(r.masks) > 0:
        for poly in r.masks.xy:
            if len(poly) > 0:
                pts = np.array(poly, dtype=np.int32)
                pts[:, 1] += roi_y1
                cv2.fillPoly(mask_canvas, [pts], (0, 255, 255))
                total_pothole_pixels += cv2.contourArea(pts)

        # Blend mask onto annotated image
        overlay = annotated.copy()
        cv2.addWeighted(mask_canvas, 0.4, overlay, 0.6, 0, overlay)
        annotated = np.where(mask_canvas > 0, overlay, annotated)

    # Road damage severity index
    total_pixels = orig_h * orig_w
    damage_ratio = total_pothole_pixels / max(1, total_pixels)
    severity = compute_severity(damage_ratio, potholes_count)

    # Encode images to base64
    _, buf_ann = cv2.imencode('.jpg', annotated)
    b64_ann = "data:image/jpeg;base64," + base64.b64encode(buf_ann).decode('utf-8')

    _, buf_mask = cv2.imencode('.png', mask_canvas)
    b64_mask = "data:image/png;base64," + base64.b64encode(buf_mask).decode('utf-8')

    return {
        "success": True,
        "latency_ms": round(latency_ms, 2),
        "potholes_count": potholes_count,
        "damage_ratio_percent": round(damage_ratio * 100, 3),
        "severity": severity,
        "boxes": boxes_out,
        "image_annotated": b64_ann,
        "image_mask": b64_mask
    }

# ---------------- Fleet Operator & Admin Authentication Endpoints ----------------

DEMO_TOKENS_DICT = {
    "accessToken": "demo-jwt-access-token",
    "refreshToken": "demo-jwt-refresh-token",
    "tokenType": "bearer"
}

DEMO_OPERATOR_DICT = {
    "id": "op_0042",
    "operatorCode": "OP-0042",
    "operator_code": "OP-0042",
    "name": "Alex Mercer",
    "email": "alex.mercer@safepath.ai",
    "vehicleId": "veh_101",
    "vehicle_id": "veh_101",
    "vehiclePlate": "TN-01-AB-1234",
    "vehicle_plate": "TN-01-AB-1234",
    "vehicleType": "PATROL_VAN",
    "status": "ON_DUTY",
    "activeSessionId": "sess_99",
    "cityId": "city_chennai",
    "permissions": ["LOG_OBSERVATION", "VIEW_ROUTES", "START_SHIFT"]
}

DEMO_ADMIN_DICT = {
    "id": "adm_super",
    "adminId": "ADM-001",
    "name": "Super Admin",
    "email": "super.admin@safepath.ai",
    "role": "SUPER_ADMIN",
    "cityName": "Chennai",
    "cityId": "city_chennai",
    "permissions": ["VALIDATE_HAZARD", "REJECT_HAZARD", "MERGE_HAZARD", "REOPEN_HAZARD", "MANAGE_CITY", "MANAGE_USERS"]
}

@app.post("/api/fleet/auth/login")
@app.post("/fleet/auth/login")
async def fleet_login(payload: Dict[str, Any] = Body(default={})):
    op_code = payload.get("operatorCode") or payload.get("operator_code") or "OP-0042"
    op_data = dict(DEMO_OPERATOR_DICT)
    op_data["operatorCode"] = op_code
    op_data["operator_code"] = op_code
    print(f"[+] Fleet Operator login successful: {op_code}")
    return {
        "operator": op_data,
        "tokens": DEMO_TOKENS_DICT
    }

@app.get("/api/fleet/me/")
@app.get("/api/fleet/me")
@app.get("/fleet/me/")
@app.get("/fleet/me")
async def fleet_me():
    return {
        "operator": DEMO_OPERATOR_DICT
    }

@app.post("/api/auth/logout")
@app.post("/auth/logout")
async def logout_alt(req: LogoutRequest = Body(default=None)):
    return {"status": "success", "message": "Logged out successfully."}

# ---------------- File & Media Upload Endpoints ----------------

@app.post("/api/media/upload")
@app.post("/media/upload")
@app.post("/api/upload")
@app.post("/upload")
async def upload_media_file(request: Request, file: UploadFile = File(...)):
    filename = f"{uuid.uuid4().hex}_{file.filename or 'photo.jpg'}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    file_url = f"{_public_base_url(request)}/uploads/{filename}"
    print(f"[+] Uploaded Hazard Evidence Frame: {filename} -> {file_url}")
    return {
        "url": file_url,
        "imageUrl": file_url,
        "photo_url": file_url,
        "contentType": file.content_type or "image/jpeg",
        "sizeBytes": len(content)
    }

# ---------------- Fleet Operator Live Sessions & Auto-Dispatch Endpoints ----------------

@app.post("/api/fleet/sessions")
@app.post("/fleet/sessions")
async def start_fleet_session(payload: Dict[str, Any] = Body(default={})):
    sess_id = f"sess_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    session_data = {
        "id": sess_id,
        "status": "ACTIVE",
        "vehicleId": payload.get("vehicleId") or "veh_101",
        "cityId": payload.get("cityId") or "city_chennai",
        "zoneName": "North Zone",
        "startTime": now_iso,
        "endTime": None,
        "reportedDistanceKm": 0.0,
        "validatedDistanceKm": 0.0,
        "observationCount": 0,
        "validObservationCount": 0,
        "dataQualityScore": 0.98
    }
    print(f"[+] Started Fleet Monitoring Session: {sess_id}")
    return session_data

@app.post("/api/fleet/sessions/{sess_id}/stop")
@app.post("/fleet/sessions/{sess_id}/stop")
async def stop_fleet_session(sess_id: str, payload: Dict[str, Any] = Body(default={})):
    now_iso = datetime.now(timezone.utc).isoformat()
    session_data = {
        "id": sess_id,
        "status": "COMPLETED",
        "vehicleId": "veh_101",
        "cityId": "city_chennai",
        "zoneName": "North Zone",
        "startTime": now_iso,
        "endTime": now_iso,
        "reportedDistanceKm": payload.get("reportedDistanceKm", 12.4),
        "validatedDistanceKm": payload.get("reportedDistanceKm", 12.4),
        "observationCount": 5,
        "validObservationCount": 5,
        "dataQualityScore": 0.98
    }
    print(f"[+] Ended Fleet Monitoring Session: {sess_id}")
    return {
        "session": session_data,
        "durationMinutes": 45,
        "estimatedEarnings": 450.0
    }

@app.post("/api/fleet/observations")
@app.post("/fleet/observations")
async def create_fleet_observation(payload: Dict[str, Any] = Body(default={})):
    hz_id = f"haz_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    lat = float(payload.get("latitude") or 13.0827)
    lng = float(payload.get("longitude") or 80.2707)
    cf = float(payload.get("confidence") or 0.88)
    sev = payload.get("severity") or "CRITICAL"
    
    # Save directly to safepath.db database!
    new_hazard = {
        "id": hz_id,
        "title": "Automated Fleet Dashcam Pothole",
        "description": "Real-time AI observation captured by Fleet Patrol Unit with GPS coordinates",
        "type": "pothole",
        "severity": sev,
        "status": "REPORTED",  # Sent automatically to Admin for verification!
        "latitude": lat,
        "longitude": lng,
        "location_name": f"Patrol GPS Coordinates: ({lat:.4f}, {lng:.4f})",
        "photo_url": payload.get("imageUrl") or "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
        "ai_confidence": cf,
        "risk_score": 0.92,
        "created_at": now_iso,
        "is_demo_data": False,
        "bbox": payload.get("boundingBox")
    }
    db_manager.save_hazard(new_hazard)
    _sync_db_hazards()
    print(f"[⚡ AUTO-DISPATCH] Real-Time Fleet AI Observation saved to DB & dispatched to Admin & Municipality! ID: {hz_id} Lat: {lat} Lng: {lng}")
    
    return {
        "id": f"obs_{hz_id}",
        "clientObservationId": payload.get("clientObservationId"),
        "sessionId": payload.get("sessionId"),
        "hazardId": hz_id,
        "latitude": lat,
        "longitude": lng,
        "observedAt": now_iso,
        "hazardType": "POTHOLE",
        "confidence": cf,
        "severity": sev,
        "imageUrl": new_hazard["photo_url"],
        "boundingBox": payload.get("boundingBox"),
        "dataQuality": "HIGH",
        "observationState": "DISPATCHED"
    }

@app.post("/api/fleet/observations/batch")
@app.post("/fleet/observations/batch")
async def create_fleet_observations_batch(payload: Dict[str, Any] = Body(default={})):
    items = payload.get("items", [])
    results = []
    for item in items:
        res = await create_fleet_observation(item)
        results.append({
            "clientObservationId": item.get("clientObservationId"),
            "status": "ACCEPTED",
            "observationId": res["id"],
            "hazardId": res["hazardId"],
            "message": "Automated observation saved and dispatched."
        })
    return {"results": results}

@app.get("/api/fleet/routes/today")
@app.get("/fleet/routes/today")
async def get_today_route():
    return {
        "routeName": "Route A-12 (North Zone Patrol)",
        "zoneName": "North Zone",
        "targetKm": 50.0,
        "priority": "HIGH",
        "roadSegments": ["GST Road", "Mount Road", "Anna Salai"]
    }

@app.get("/api/fleet/earnings")
@app.get("/fleet/earnings")
async def get_fleet_earnings():
    return {
        "today": 650.0,
        "thisWeek": 3200.0,
        "thisMonth": 14500.0,
        "breakdownToday": {
            "coverageAmount": 400.0,
            "observationAmount": 200.0,
            "qualityBonusAmount": 50.0,
            "totalAmount": 650.0
        }
    }

@app.get("/api/fleet/payments")
@app.get("/fleet/payments")
async def get_fleet_payments():
    return {
        "items": [
            {
                "id": "pay-101",
                "sessionId": "sess-101",
                "operatorId": "op-1",
                "coverageAmount": 400.0,
                "observationAmount": 200.0,
                "qualityBonusAmount": 50.0,
                "totalAmount": 650.0,
                "status": "PAID",
                "computedAt": "2026-08-25T08:00:00Z",
                "paidAt": "2026-08-25T09:00:00Z"
            },
            {
                "id": "pay-102",
                "sessionId": "sess-102",
                "operatorId": "op-1",
                "coverageAmount": 350.0,
                "observationAmount": 150.0,
                "qualityBonusAmount": 25.0,
                "totalAmount": 525.0,
                "status": "APPROVED",
                "computedAt": "2026-08-24T18:00:00Z",
                "paidAt": None
            }
        ],
        "total": 2
    }

@app.get("/api/fleet/sessions/history")
@app.get("/fleet/sessions/history")
async def get_fleet_session_history():
    return {
        "items": [
            {
                "id": "sess-101",
                "operatorId": "op-1",
                "vehicleId": "veh-1",
                "startTime": "2026-08-25T06:00:00Z",
                "endTime": "2026-08-25T08:00:00Z",
                "status": "VALIDATED",
                "reportedDistanceKm": 24.5,
                "validatedDistanceKm": 24.5,
                "observationCount": 12,
                "dataQualityScore": 96.0
            },
            {
                "id": "sess-102",
                "operatorId": "op-1",
                "vehicleId": "veh-1",
                "startTime": "2026-08-24T14:00:00Z",
                "endTime": "2026-08-24T17:30:00Z",
                "status": "VALIDATED",
                "reportedDistanceKm": 38.2,
                "validatedDistanceKm": 38.2,
                "observationCount": 19,
                "dataQualityScore": 94.0
            }
        ],
        "total": 2
    }

# ---------------- Citizen Mobile Nearby & Home Endpoints ----------------

@app.get("/api/citizen/home")
@app.get("/api/home")
async def get_citizen_home(
    latitude: float = Query(12.9716),
    longitude: float = Query(77.5946),
    radius: float = Query(5000)
):
    current_hazards = _sync_db_hazards()
    active_hazards = [h for h in current_hazards if h.status != "REJECTED"]
    critical_cnt = len([h for h in active_hazards if h.severity == "CRITICAL"])
    warning_cnt = len([h for h in active_hazards if h.severity in ["MODERATE", "HIGH"]])
    hazard_objs = [h.dict() for h in active_hazards]
    verified_hazards = [h for h in hazard_objs if h.get("status") in ["VERIFIED", "ACTIVE", "IN_PROGRESS", "UNDER_REPAIR"]]

    return {
        "greeting": "Good Day",
        "userName": "Arun Kumar",
        "user_name": "Arun Kumar",
        "cityName": "Chennai",
        "city_name": "Chennai",
        "stats": {
            "nearbyCount": len(active_hazards),
            "nearby_count": len(active_hazards),
            "criticalCount": critical_cnt,
            "critical_count": critical_cnt,
            "warningCount": warning_cnt,
            "warning_count": warning_cnt
        },
        "nearbyHazards": hazard_objs,
        "nearby_hazards": hazard_objs,
        "mapMarkers": verified_hazards,
        "map_markers": verified_hazards
    }

@app.get("/api/hazards/nearby")
@app.get("/api/municipality/hazards")
async def hazards_nearby(
    latitude: float = Query(12.9716),
    longitude: float = Query(77.5946),
    radius: float = Query(5000)
):
    current_hazards = _sync_db_hazards()
    # REJECTED reports are completely excluded from map markers and work orders!
    active_hazards = [h for h in current_hazards if h.status in ["VERIFIED", "ACTIVE", "IN_PROGRESS", "UNDER_REPAIR", "REPORTED"]]
    items = [h.dict() for h in active_hazards]
    return {
        "items": items,
        "total": len(items)
    }

@app.get("/api/municipality/dashboard")
@app.get("/api/municipality/home")
@app.get("/api/municipality/work-orders")
async def get_municipality_dashboard():
    current_hazards = _sync_db_hazards()
    # Only VERIFIED/ACTIVE hazards become Municipality Work Orders
    verified_work_orders = [h.dict() for h in current_hazards if h.status in ["VERIFIED", "ACTIVE", "UNDER_REPAIR"]]
    rejected_count = len([h for h in current_hazards if h.status == "REJECTED"])
    
    return {
        "totalAssignedWorkOrders": len(verified_work_orders),
        "inProgressCount": len([h for h in verified_work_orders if h.get("status") == "UNDER_REPAIR"]),
        "rejectedCount": rejected_count,
        "workOrders": verified_work_orders,
        "items": verified_work_orders,
        "heatmapPoints": [
            {"lat": h["latitude"], "lng": h["longitude"], "weight": 1.0 if h["severity"] == "CRITICAL" else 0.6}
            for h in verified_work_orders
        ]
    }

# ---------------- Admin Live Intelligence & Dashboard Endpoints ----------------

@app.get("/api/admin/dashboard")
@app.get("/admin/dashboard")
async def get_admin_dashboard():
    current_hazards = _sync_db_hazards()
    active_h = [h for h in current_hazards if h.status != "REJECTED"]
    critical_h = [h for h in active_h if h.severity == "CRITICAL"]
    reported_today = [h for h in current_hazards if "REPORTED" in h.status]
    verified_h = [h for h in current_hazards if h.status in ["VERIFIED", "ACTIVE", "UNDER_REPAIR"]]
    
    return {
        "kpis": {
            "activeHazards": len(active_h),
            "activeHazardsTrendPct": 12.5,
            "criticalHazards": len(critical_h),
            "citizenReportsToday": len(reported_today),
            "fleetObservationsToday": len(current_hazards),
            "activeVehicles": 1,
            "citiesActive": 1,
            "municipalities": 1,
            "dataCoveragePct": 98.4,
            "underRepair": len([h for h in verified_h if h.status == "UNDER_REPAIR"]),
            "resolved": len([h for h in current_hazards if h.status == "RESOLVED"])
        },
        "systemStatus": {
            "overall": "HEALTHY",
            "services": [
                {"name": "PyTorch YOLOv8 AI Engine", "status": "HEALTHY", "latencyMs": 38},
                {"name": "Fleet GPS Stream", "status": "HEALTHY", "latencyMs": 14},
                {"name": "SQLite Registry DB", "status": "HEALTHY", "latencyMs": 4}
            ]
        },
        "activity": [
            {
                "id": f"act_{h.id}",
                "kind": "HAZARD",
                "message": f"{h.title} detected at GPS ({h.latitude:.4f}, {h.longitude:.4f})",
                "cityName": "Chennai",
                "severity": "HIGH" if h.severity == "CRITICAL" else "MEDIUM",
                "createdAt": h.createdAt
            }
            for h in current_hazards[:5]
        ],
        "actionRequired": [
            {
                "id": f"act_req_{h.id}",
                "entityType": "HAZARD",
                "entityId": h.id,
                "title": f"Review Pending Pothole {getattr(h, 'code', 'PTH-101')}",
                "description": f"AI Confidence {int(getattr(h, 'aiConfidence', 0.88)*100)}% - Requires Admin Verification",
                "cityName": "Chennai",
                "severity": "CRITICAL" if h.severity == "CRITICAL" else "HIGH"
            }
            for h in reported_today[:5]
        ]
    }

@app.get("/api/admin/fleet/vehicles")
@app.get("/admin/fleet/vehicles")
async def get_admin_fleet_vehicles():
    current_hazards = _sync_db_hazards()
    return {
        "items": [
            {
                "id": "veh_101",
                "plateNumber": "TN-01-AB-1234",
                "operatorId": "OP-0042",
                "operatorName": "Karthik Raja",
                "cityName": "Chennai",
                "zoneName": "North Zone Patrol",
                "status": "ACTIVE",
                "kmToday": 24.8,
                "dataQualityPct": 98.4,
                "latitude": 13.0827,
                "longitude": 80.2707,
                "lastPingAt": datetime.now(timezone.utc).isoformat(),
                "gps": "GOOD",
                "camera": "OK",
                "ai": "OK",
                "network": "OK",
                "storageUsedPct": 14.2
            }
        ],
        "total": 1
    }

@app.get("/api/admin/fleet/operators")
@app.get("/admin/fleet/operators")
async def get_admin_fleet_operators():
    current_hazards = _sync_db_hazards()
    return {
        "items": [
            {
                "id": "OP-0042",
                "operatorCode": "OP-0042",
                "name": "Karthik Raja",
                "vehiclePlate": "TN-01-AB-1234",
                "cityName": "Chennai",
                "status": "ACTIVE",
                "coveragePct": 96.0,
                "dataQualityPct": 98.4,
                "tripsCompleted": len(current_hazards),
                "pendingEarnings": 1450.0
            }
        ],
        "total": 1
    }

@app.get("/api/admin/municipalities")
@app.get("/admin/municipalities")
async def get_admin_municipalities():
    current_hazards = _sync_db_hazards()
    active_h = [h for h in current_hazards if h.status in ["VERIFIED", "ACTIVE", "UNDER_REPAIR"]]
    critical_h = [h for h in active_h if h.severity == "CRITICAL"]
    
    return {
        "items": [
            {
                "id": "muni_chennai",
                "name": "Greater Chennai Corporation",
                "cityId": "city_chennai",
                "cityName": "Chennai",
                "officerCount": 12,
                "activeHazards": len(active_h),
                "criticalHazards": len(critical_h),
                "openRepairs": len([h for h in active_h if h.status == "UNDER_REPAIR"]),
                "avgResolutionDays": 1.4,
                "resolutionRatePct": 88.5,
                "status": "ACTIVE"
            }
        ],
        "total": 1
    }

@app.get("/api/admin/analytics/summary")
@app.get("/admin/analytics/summary")
@app.get("/api/admin/analytics")
@app.get("/admin/analytics")
async def get_admin_analytics_summary():
    current_hazards = _sync_db_hazards()
    active_h = [h for h in current_hazards if h.status != "REJECTED"]
    critical_h = [h for h in active_h if h.severity == "CRITICAL"]
    
    return {
        "totalHazards": len(current_hazards),
        "criticalHazards": len(critical_h),
        "citizenReports": len([h for h in current_hazards if "Citizen" in getattr(h, 'title', '')]),
        "fleetObservations": len([h for h in current_hazards if "Fleet" in getattr(h, 'title', '')]),
        "activeVehicles": 1,
        "cities": 1,
        "municipalities": 1,
        "resolutionRatePct": 88.5,
        "avgResolutionDays": 1.4,
        "aiDetections": len(current_hazards),
        "aiAvgLatencyMs": 38.0,
        "fleetCoveragePct": 96.0
    }

@app.get("/api/admin/analytics/cities")
@app.get("/admin/analytics/cities")
async def get_admin_analytics_cities():
    current_hazards = _sync_db_hazards()
    active_h = [h for h in current_hazards if h.status != "REJECTED"]
    critical_h = [h for h in active_h if h.severity == "CRITICAL"]
    return [
        {
            "cityId": "c_blr",
            "cityName": "Bengaluru",
            "activeHazards": len(active_h),
            "criticalHazards": len(critical_h),
            "fleetCoveragePct": 96.0,
            "resolutionRatePct": 88.5,
            "avgResolutionDays": 1.4,
            "citizenParticipation": 142
        },
        {
            "cityId": "c_che",
            "cityName": "Chennai",
            "activeHazards": 12,
            "criticalHazards": 3,
            "fleetCoveragePct": 91.0,
            "resolutionRatePct": 92.0,
            "avgResolutionDays": 1.1,
            "citizenParticipation": 98
        }
    ]

@app.get("/api/admin/analytics/trends")
@app.get("/admin/analytics/trends")
async def get_admin_analytics_trends():
    return [
        {"label": "Day 1", "value": 12},
        {"label": "Day 2", "value": 18},
        {"label": "Day 3", "value": 15},
        {"label": "Day 4", "value": 24},
        {"label": "Day 5", "value": 30},
        {"label": "Day 6", "value": 22},
        {"label": "Day 7", "value": 28},
        {"label": "Day 8", "value": 35},
        {"label": "Day 9", "value": 19},
        {"label": "Day 10", "value": 26},
        {"label": "Day 11", "value": 32},
        {"label": "Day 12", "value": 40},
        {"label": "Day 13", "value": 25},
        {"label": "Day 14", "value": 38}
    ]

@app.get("/api/admin/hazards")
@app.get("/admin/hazards")
async def list_admin_hazards(
    tab: Optional[str] = Query("ALL"),
    page: int = Query(1),
    pageSize: int = Query(20)
):
    current_hazards = _sync_db_hazards()
    items = []
    for h in current_hazards:
        h_dict = h.dict() if hasattr(h, 'dict') else dict(h)
        h_dict["code"] = h_dict.get("code") or f"PTH-{h.id[-6:].upper()}"
        h_dict["cityName"] = h_dict.get("cityName") or "Chennai"
        h_dict["locationText"] = h_dict.get("locationText") or h_dict.get("location_name") or f"GPS ({h.latitude:.4f}, {h.longitude:.4f})"
        h_dict["roadName"] = h_dict.get("roadName") or "Patrol Road"
        h_dict["aiConfidence"] = h_dict.get("ai_confidence") or 0.88
        h_dict["source"] = h_dict.get("source") or "FLEET_AI"
        h_dict["citizenReportCount"] = h_dict.get("citizenReportCount") or 1
        h_dict["fleetObservationCount"] = h_dict.get("fleetObservationCount") or 1
        h_dict["linkedHazardIds"] = h_dict.get("linkedHazardIds") or []
        
        iso_created = h_dict.get("createdAt") or h_dict.get("created_at") or datetime.now(timezone.utc).isoformat()
        h_dict["createdAt"] = iso_created
        h_dict["created_at"] = iso_created
        h_dict["lastUpdateAt"] = iso_created
        
        items.append(h_dict)
    
    return {
        "items": items,
        "total": len(items),
        "page": page,
        "pageSize": pageSize,
        "hasMore": False
    }

@app.get("/api/hazards/{hazard_id}")
@app.get("/api/admin/hazards/{hazard_id}")
@app.get("/admin/hazards/{hazard_id}")
async def get_hazard_by_id(hazard_id: str = Path(...)):
    current_hazards = _sync_db_hazards()
    found = next((h for h in current_hazards if h.id == hazard_id or getattr(h, 'code', '') == hazard_id), current_hazards[0])
    h_dict = found.dict() if hasattr(found, 'dict') else dict(found)
    
    img_url = h_dict.get("photo_url") or h_dict.get("photoUrl") or "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800"
    bbox_val = h_dict.get("bbox") or {"x": 0.25, "y": 0.35, "width": 0.50, "height": 0.40, "confidence": h_dict.get("ai_confidence", 0.88)}
    
    h_dict["code"] = h_dict.get("code") or f"PTH-{found.id[-6:].upper()}"
    h_dict["cityName"] = h_dict.get("cityName") or "Chennai"
    h_dict["locationText"] = h_dict.get("locationText") or h_dict.get("location_name") or f"GPS ({found.latitude:.4f}, {found.longitude:.4f})"
    h_dict["roadName"] = h_dict.get("roadName") or "Patrol Road"
    h_dict["aiConfidence"] = h_dict.get("ai_confidence") or 0.88
    h_dict["source"] = h_dict.get("source") or "FLEET_AI"
    h_dict["citizenReportCount"] = h_dict.get("citizenReportCount") or 1
    h_dict["fleetObservationCount"] = h_dict.get("fleetObservationCount") or 1
    h_dict["linkedHazardIds"] = h_dict.get("linkedHazardIds") or []
    h_dict["version"] = h_dict.get("version") or 1
    
    h_dict["evidence"] = [
        {
            "id": f"ev_{found.id}_1",
            "kind": "FLEET" if "Fleet" in h_dict.get("title", "") else "AI",
            "title": "Automated Dashcam Evidence Frame",
            "detail": f"Captured by Patrol Unit with PyTorch YOLOv8 detection ({int(h_dict.get('ai_confidence', 0.88)*100)}% confidence)",
            "imageUrl": img_url,
            "confidence": h_dict.get("ai_confidence", 0.88),
            "gpsQuality": "GOOD",
            "timestamp": h_dict.get("created_at") or h_dict.get("createdAt") or datetime.now(timezone.utc).isoformat(),
            "actorLabel": "Fleet Patrol Unit 101",
            "bbox": bbox_val
        }
    ]
    h_dict["timeline"] = [
        {"id": "step_1", "label": "Detected by Fleet AI Dashcam", "actorLabel": "Automated Patrol Unit", "timestamp": h_dict.get("created_at"), "done": True},
        {"id": "step_2", "label": "Submitted for Admin Verification", "actorLabel": "SafePath AI Engine", "timestamp": h_dict.get("created_at"), "done": True},
        {"id": "step_3", "label": "Admin Verification & Work Order", "actorLabel": "Admin Operations", "timestamp": h_dict.get("created_at"), "done": h_dict.get("status") == "VERIFIED"}
    ]
    return h_dict

@app.get("/api/reports/me")
async def get_my_reports(tab: Optional[str] = Query("all")):
    current_hazards = _sync_db_hazards()
    items = []
    for h in current_hazards:
        items.append({
            "id": f"rep_{h.id}",
            "reportCode": f"PTH-{h.id.upper()}",
            "hazardType": h.type.upper(),
            "severity": h.severity,
            "status": h.status,
            "locationText": h.locationName or h.locationText,
            "createdAt": h.createdAt,
            "statusNote": "Rejected by Admin" if h.status == "REJECTED" else ("Verified by SafePath AI" if h.status == "VERIFIED" else "Under Review")
        })
    return {
        "items": items,
        "total": len(items)
    }

@app.post("/api/reports/")
@app.post("/api/reports")
@app.post("/api/hazards/citizen-report")
async def create_report(payload: Dict[str, Any] = Body(...)):
    new_id = f"haz_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    hz_type = payload.get('hazard_type') or payload.get('hazardType') or 'pothole'
    severity = payload.get('severity') or 'MEDIUM'
    desc = payload.get('description') or "Hazard reported via SafePath Mobile"
    lat = payload.get('latitude', 12.9716)
    lng = payload.get('longitude', 77.5946)
    loc_text = payload.get('location_text') or payload.get('locationText') or payload.get('location_name') or payload.get('locationName') or "Observed Road Segment"

    media = payload.get('media_urls') or payload.get('mediaUrls') or payload.get('media') or []
    photo_url = media[0] if media and len(media) > 0 else (payload.get('photo_url') or payload.get('photoUrl'))

    ai_analysis = payload.get('ai_analysis') or payload.get('aiAnalysis') or {}
    ai_detected = ai_analysis.get('detected', False) if isinstance(ai_analysis, dict) else False
    ai_conf = ai_analysis.get('confidence') if isinstance(ai_analysis, dict) else None
    bbox_dict = ai_analysis.get('bbox') if isinstance(ai_analysis, dict) else None

    # Perform server-side YOLO model verification on uploaded photo if needed
    if photo_url and (ai_conf is None or not ai_detected):
        local_filename = photo_url.split('/')[-1]
        local_filepath = os.path.join(UPLOAD_DIR, local_filename)
        if os.path.exists(local_filepath):
            try:
                with open(local_filepath, "rb") as img_file:
                    img_bytes = img_file.read()
                    b64_str = base64.b64encode(img_bytes).decode('utf-8')
                    detection_res = await detect_potholes_mobile(req={"imageBase64": b64_str})
                    detections_list = detection_res.get("detections", [])
                    if detections_list and len(detections_list) > 0:
                        ai_detected = True
                        ai_conf = detections_list[0].get("confidence", 0.88)
                        bx = detections_list[0].get("bbox", {})
                        bbox_dict = {"x1": bx.get("x1", 0.25), "y1": bx.get("y1", 0.40), "x2": bx.get("x2", 0.75), "y2": bx.get("y2", 0.85)}
                    else:
                        ai_detected = False
                        ai_conf = 0.0
            except Exception as ex:
                print(f"[!] Server-side YOLO evaluation warning: {ex}")

    # AI Verification & Admin Approval Pipeline:
    # 1. If AI detects NO pothole in photo (laptop, desk, room, clear road), status = REJECTED.
    # 2. If AI verifies a pothole, status = REPORTED (Pending Admin Approval).
    # 3. ONLY when Admin approves (VERIFY button), status becomes VERIFIED and appears on Citizen Map & Heatmap!
    if not ai_detected or (ai_conf is not None and float(ai_conf) < 0.20):
        report_status = "REJECTED"
        rejection_reason = "No pothole detected in image by SafePath AI model."
    else:
        report_status = "REPORTED"  # Under Review — Pending Admin Approval
        rejection_reason = None

    final_conf = float(ai_conf) if ai_conf is not None else (0.88 if report_status == "REPORTED" else 0.12)

    new_hazard = HazardModel(
        id=new_id,
        title=f"Reported {hz_type.capitalize()} Hazard",
        description=desc,
        type=hz_type.upper(),
        severity=severity.upper(),
        status=report_status,
        latitude=lat,
        longitude=lng,
        locationName=loc_text,
        locationText=loc_text,
        roadName=loc_text,
        photoUrl=photo_url,
        aiConfidence=final_conf,
        riskScore=7.5,
        createdAt=now_iso,
        isDemoData=False,
        bbox=BoundingBoxModel(x1=0.25, y1=0.40, x2=0.75, y2=0.85)
    )
    db_manager.save_hazard(new_hazard.dict())
    DEMO_HAZARDS.insert(0, new_hazard)

    status_history = [{"status": "REPORTED", "note": "Report submitted by citizen.", "createdAt": now_iso}]
    if report_status == "VERIFIED":
        status_history.append({"status": "VERIFIED", "note": f"Verified by SafePath YOLOv8 Pothole AI Engine ({int(final_conf*100)}% conf)", "createdAt": now_iso})
    elif report_status == "REJECTED":
        status_history.append({"status": "REJECTED", "note": f"Rejected by SafePath AI: {rejection_reason}", "createdAt": now_iso})

    return {
        "id": f"rep_{new_id}",
        "reportCode": f"PTH-{new_id.upper()}",
        "hazardId": new_id,
        "hazardType": hz_type.upper(),
        "severity": severity.upper(),
        "status": report_status,
        "description": desc,
        "latitude": lat,
        "longitude": lng,
        "locationText": loc_text,
        "media": media,
        "photoUrl": photo_url,
        "statusHistory": status_history,
        "createdAt": now_iso,
        "updatedAt": now_iso
    }

@app.get("/api/reports/{report_id}")
async def get_report_detail(report_id: str = Path(...)):
    current_hazards = _sync_db_hazards()
    found = next((h for h in current_hazards if f"rep_{h.id}" == report_id or h.id == report_id), current_hazards[0])
    now_iso = datetime.now(timezone.utc).isoformat()

    status_history = [{"status": "REPORTED", "note": "Submitted by citizen", "createdAt": found.createdAt}]
    if found.status in ["VERIFIED", "ACTIVE", "IN_PROGRESS", "RESOLVED"]:
        status_history.append({"status": "VERIFIED", "note": "Verified by SafePath AI Engine", "createdAt": found.createdAt})
    if found.status == "RESOLVED":
        status_history.append({"status": "RESOLVED", "note": "Road Maintenance Completed", "createdAt": now_iso})

    return {
        "id": report_id,
        "reportCode": f"PTH-{found.id.upper()}",
        "hazardId": found.id,
        "hazardType": found.type.upper(),
        "severity": found.severity,
        "status": found.status,
        "description": found.description,
        "latitude": found.latitude,
        "longitude": found.longitude,
        "locationText": found.locationName,
        "media": [found.photoUrl] if found.photoUrl else [],
        "statusHistory": status_history,
        "createdAt": found.createdAt,
        "updatedAt": now_iso
    }

# ---------------- Media Upload Endpoint ----------------

@app.post("/api/media/upload")
@app.post("/media/upload")
async def upload_media(request: Request, file: UploadFile = File(...)):
    uploads_dir = os.path.join(_this_dir, "static", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    filename_raw = file.filename or "capture.jpg"
    file_ext = filename_raw.split(".")[-1] if "." in filename_raw else "jpg"
    out_filename = f"upload_{uuid.uuid4().hex[:8]}.{file_ext}"
    out_path = os.path.join(uploads_dir, out_filename)

    contents = await file.read()
    with open(out_path, "wb") as f:
        f.write(contents)

    photo_url = f"{_public_base_url(request)}/static/uploads/{out_filename}"

    return {
        "url": photo_url,
        "contentType": file.content_type or "image/jpeg",
        "sizeBytes": len(contents)
    }

# ---------------- Municipality App API Routes ----------------

@app.post("/api/municipality/auth/login")
@app.post("/municipality/auth/login")
async def municipality_login(payload: Dict[str, Any] = Body(default={})):
    code = payload.get("municipalityCode") or payload.get("email") or "bbmp-01"
    officer = {
        "id": "off_101",
        "name": "Officer Rajesh Kumar",
        "email": payload.get("email", "rajesh.kumar@bbmp.gov.in"),
        "municipalityCode": code,
        "municipalityName": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
        "cityId": "c_blr",
        "cityName": "Bengaluru",
        "role": "MUNICIPALITY_OFFICER",
        "permissions": ["VIEW_HAZARDS", "UPDATE_REPAIRS", "INSPECT_HAZARDS"]
    }
    return {
        "officer": officer,
        "tokens": {
            "accessToken": "safepath-municipality-access-token-jwt",
            "refreshToken": "safepath-municipality-refresh-token-jwt",
            "tokenType": "bearer"
        }
    }

@app.get("/api/municipality/me/")
@app.get("/municipality/me/")
@app.get("/api/municipality/me")
@app.get("/municipality/me")
async def municipality_me():
    return {
        "officer": {
            "id": "off_101",
            "name": "Officer Rajesh Kumar",
            "email": "rajesh.kumar@bbmp.gov.in",
            "municipalityCode": "bbmp-01",
            "municipalityName": "Bruhat Bengaluru Mahanagara Palike (BBMP)",
            "cityId": "c_blr",
            "cityName": "Bengaluru",
            "role": "MUNICIPALITY_OFFICER",
            "permissions": ["VIEW_HAZARDS", "UPDATE_REPAIRS", "INSPECT_HAZARDS"]
        }
    }

@app.get("/api/municipality/cities/")
@app.get("/municipality/cities/")
@app.get("/api/cities")
async def get_municipality_cities():
    return [
        {"id": "c_blr", "name": "Bengaluru", "state": "Karnataka", "code": "BLR", "activeHazards": 142},
        {"id": "c_chn", "name": "Chennai", "state": "Tamil Nadu", "code": "MAA", "activeHazards": 98},
        {"id": "c_mum", "name": "Mumbai", "state": "Maharashtra", "code": "BOM", "activeHazards": 210}
    ]

@app.get("/api/municipality/dashboard/")
@app.get("/municipality/dashboard/")
@app.get("/api/dashboard")
async def get_municipality_dashboard(cityId: Optional[str] = Query("c_blr")):
    current_hazards = _sync_db_hazards()
    active_count = len([h for h in current_hazards if h.status in ["REPORTED", "VERIFIED", "IN_PROGRESS"]])
    return {
        "cityId": cityId,
        "cityName": "Bengaluru Metro Zone",
        "activeHazards": active_count,
        "criticalHazards": len([h for h in current_hazards if h.severity == "CRITICAL"]),
        "inProgressRepairs": 12,
        "slaBreachedCount": 1,
        "resolvedThisMonth": 84,
        "avgResolutionHours": 34.2,
        "recentHazards": [h.dict() for h in current_hazards[:5]]
    }

@app.get("/api/municipality/hazards/")
@app.get("/municipality/hazards/")
async def get_municipality_hazards_list(
    cityId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None)
):
    current_hazards = _sync_db_hazards()
    filtered = current_hazards
    if status:
        filtered = [h for h in filtered if h.status.lower() == status.lower()]
    if severity:
        filtered = [h for h in filtered if h.severity.lower() == severity.lower()]
    return {
        "items": [h.dict() for h in filtered],
        "total": len(filtered),
        "page": 1,
        "pageSize": 20
    }

@app.get("/api/municipality/hazards/{hazard_id}")
@app.get("/municipality/hazards/{hazard_id}")
async def get_municipality_hazard_detail(hazard_id: str = Path(...)):
    current_hazards = _sync_db_hazards()
    found = next((h for h in current_hazards if h.id == hazard_id), current_hazards[0])
    h_dict = found.dict()
    h_dict["roadName"] = found.locationName
    h_dict["citizenReports"] = []
    h_dict["municipalityActions"] = []
    h_dict["latestAiAnalysis"] = {
        "imageUrl": found.photoUrl,
        "detected": True,
        "confidence": found.aiConfidence,
        "modelVersion": "safepath-yolov8-pothole-v2",
        "createdAt": found.createdAt
    }
    h_dict["currentRepair"] = {
        "id": f"rep_{hazard_id}",
        "repairCode": f"REP-{hazard_id.upper()}",
        "status": "IN_PROGRESS",
        "priority": "HIGH"
    }
    return h_dict

@app.get("/api/municipality/hazards/{hazard_id}/verification")
@app.get("/municipality/hazards/{hazard_id}/verification")
async def get_municipality_hazard_verification(hazard_id: str = Path(...)):
    return {
        "hazardId": hazard_id,
        "state": "VERIFIED_ACTIVE",
        "confidence": 94,
        "summary": "Verified by SafePath AI Model Inspection & Citizen Consensus"
    }

@app.get("/api/municipality/repairs/")
@app.get("/municipality/repairs/")
async def get_municipality_repairs(
    cityId: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    return {
        "items": [
            {
                "id": "rep_101",
                "repairCode": "REP-HAZ-101",
                "hazardId": "haz_101",
                "hazardRoadName": "MG Road Sector 4",
                "status": "IN_PROGRESS",
                "priority": "CRITICAL",
                "assignedContractor": "Rapid Road Works Ltd",
                "createdAt": "2026-08-22T12:00:00Z"
            }
        ],
        "total": 1
    }

@app.get("/api/municipality/analytics/summary")
@app.get("/municipality/analytics/summary")
async def get_municipality_analytics_summary(cityId: Optional[str] = Query("c_blr")):
    return {
        "cityId": cityId,
        "totalReported": 184,
        "totalResolved": 142,
        "resolutionRatePercent": 77.1,
        "avgTurnaroundHours": 28.5
    }

# ---------------- Admin App API Routes ----------------

ROLE_NAMES = {
    "SUPER_ADMIN": "Super Admin",
    "PLATFORM_ADMIN": "Platform Admin",
    "DATA_ADMIN": "Data Admin",
    "CITY_ADMIN": "City Admin",
    "FLEET_ADMIN": "Fleet Admin",
    "AI_ADMIN": "AI Admin",
    "SUPPORT_ADMIN": "Support Admin",
    "ANALYST": "Analyst"
}

ALL_PERMISSIONS = [
    "DASHBOARD_VIEW", "CITIES_VIEW", "CITIES_MANAGE", "HAZARDS_VIEW", "HAZARDS_VERIFY",
    "HAZARDS_REJECT", "HAZARDS_MERGE", "HAZARDS_FLAG", "FLEET_VIEW", "FLEET_MANAGE",
    "FLEET_PAYMENTS", "USERS_VIEW", "USERS_MANAGE", "AI_VIEW", "AI_CONFIG",
    "ANOMALIES_VIEW", "ANOMALIES_RESOLVE", "DATA_QUALITY_VIEW", "SYSTEM_VIEW",
    "FEATURE_FLAGS_MANAGE", "APP_VERSIONS_MANAGE", "MAINTENANCE_MANAGE",
    "AUDIT_VIEW", "ANALYTICS_VIEW", "NOTIFICATIONS_VIEW", "NOTIFICATIONS_SEND"
]

def build_admin_user(email_or_id: str):
    email_clean = email_or_id.strip().lower()
    role_key = "SUPER_ADMIN"
    if "platform" in email_clean:
        role_key = "PLATFORM_ADMIN"
    elif "data" in email_clean:
        role_key = "DATA_ADMIN"
    elif "city" in email_clean:
        role_key = "CITY_ADMIN"
    elif "fleet" in email_clean:
        role_key = "FLEET_ADMIN"
    elif "ai" in email_clean:
        role_key = "AI_ADMIN"
    elif "support" in email_clean:
        role_key = "SUPPORT_ADMIN"
    elif "analyst" in email_clean:
        role_key = "ANALYST"
        
    return {
        "id": f"admin-{role_key}",
        "adminId": f"ADM-{role_key[:3]}",
        "name": ROLE_NAMES.get(role_key, "Super Admin"),
        "email": email_clean if "@" in email_clean else f"{role_key.lower().replace('_', '.')}@safepath.ai",
        "role": role_key,
        "permissions": ALL_PERMISSIONS,
        "accessibleCityIds": "ALL",
        "accessibleMunicipalityIds": "ALL",
        "lastLoginAt": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/admin/auth/login")
@app.post("/admin/auth/login")
async def admin_login(payload: Dict[str, Any] = Body(...)):
    admin_id = payload.get("adminId") or payload.get("email") or "super.admin@safepath.ai"
    admin_user = build_admin_user(admin_id)
    return {
        "admin": admin_user,
        "tokens": {
            "accessToken": "safepath-admin-access-token-jwt",
            "refreshToken": "safepath-admin-refresh-token-jwt",
            "tokenType": "bearer"
        }
    }

@app.get("/api/admin/me")
@app.get("/admin/me")
async def admin_me():
    return {
        "admin": build_admin_user("super.admin@safepath.ai")
    }

@app.post("/api/auth/logout")
@app.post("/admin/auth/logout")
async def admin_logout():
    return {"status": "success"}

# ---------------- Explicit Admin Action Routes ----------------

@app.post("/api/admin/hazards/{hazard_id}/verify")
@app.post("/admin/hazards/{hazard_id}/verify")
async def verify_admin_hazard(hazard_id: str, payload: Dict[str, Any] = Body(default={})):
    current_hazards = _sync_db_hazards()
    found = None
    for h in current_hazards:
        if h.id == hazard_id or f"PTH-{h.id.upper()}" == hazard_id or getattr(h, 'code', '') == hazard_id:
            h.status = "VERIFIED"
            db_manager.save_hazard(h.dict() if hasattr(h, "dict") else dict(h))
            found = h
            break
    if not found and current_hazards:
        found = current_hazards[0]
        found.status = "VERIFIED"
        db_manager.save_hazard(found.dict() if hasattr(found, "dict") else dict(found))
    
    hd = found.dict() if hasattr(found, "dict") else dict(found)
    hd["status"] = "VERIFIED"
    hd["linkedHazardIds"] = hd.get("linkedHazardIds") or []
    hd["evidence"] = hd.get("evidence") or []
    hd["timeline"] = [
        {"id": "t-1", "label": "Report Submitted", "actorLabel": "Citizen", "done": True},
        {"id": "t-2", "label": "AI Verification", "actorLabel": "SafePath AI Engine", "done": True},
        {"id": "t-3", "label": "Verified & Approved", "actorLabel": "Central Admin", "done": True}
    ]
    return hd

@app.post("/api/admin/hazards/{hazard_id}/reject")
@app.post("/admin/hazards/{hazard_id}/reject")
async def reject_admin_hazard(hazard_id: str, payload: Dict[str, Any] = Body(default={})):
    current_hazards = _sync_db_hazards()
    found = None
    for h in current_hazards:
        if h.id == hazard_id or f"PTH-{h.id.upper()}" == hazard_id or getattr(h, 'code', '') == hazard_id:
            h.status = "REJECTED"
            db_manager.save_hazard(h.dict() if hasattr(h, "dict") else dict(h))
            found = h
            break
    if not found and current_hazards:
        found = current_hazards[0]
        found.status = "REJECTED"
        db_manager.save_hazard(found.dict() if hasattr(found, "dict") else dict(found))
    
    hd = found.dict() if hasattr(found, "dict") else dict(found)
    hd["status"] = "REJECTED"
    hd["linkedHazardIds"] = hd.get("linkedHazardIds") or []
    hd["evidence"] = hd.get("evidence") or []
    hd["timeline"] = [
        {"id": "t-1", "label": "Report Submitted", "actorLabel": "Citizen", "done": True},
        {"id": "t-2", "label": "AI Verification", "actorLabel": "SafePath AI Engine", "done": True},
        {"id": "t-3", "label": "Rejected by Admin", "actorLabel": "Central Admin (Reason: " + payload.get("reason", "False report") + ")", "done": True}
    ]
    return hd

@app.post("/api/admin/hazards/{hazard_id}/reopen")
@app.post("/admin/hazards/{hazard_id}/reopen")
async def reopen_admin_hazard(hazard_id: str, payload: Dict[str, Any] = Body(default={})):
    current_hazards = _sync_db_hazards()
    found = None
    for h in current_hazards:
        if h.id == hazard_id or f"PTH-{h.id.upper()}" == hazard_id or getattr(h, 'code', '') == hazard_id:
            h.status = "REOPENED"
            db_manager.save_hazard(h.dict() if hasattr(h, "dict") else dict(h))
            found = h
            break
    if not found and current_hazards:
        found = current_hazards[0]
        found.status = "REOPENED"
        db_manager.save_hazard(found.dict() if hasattr(found, "dict") else dict(found))
    
    hd = found.dict() if hasattr(found, "dict") else dict(found)
    hd["status"] = "REOPENED"
    return hd

@app.api_route("/api/admin/{rest_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/admin/{rest_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def admin_catch_all_route(rest_path: str, request: Request):
    path_lower = rest_path.lower()
    
    if "dashboard" in path_lower:
        if "activity" in path_lower:
            return [
                {
                    "id": "act-1",
                    "type": "HAZARD_VERIFIED",
                    "title": "Hazard VERIFIED by SafePath AI",
                    "detail": "PTH-REP_HAZ_39D211 confirmed with 92% confidence in Chennai.",
                    "actorName": "SafePath AI Engine",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            ]
        elif "action" in path_lower:
            return [
                {
                    "id": "act-req-1",
                    "kind": "UNVERIFIED_HAZARD",
                    "title": "High-severity hazard awaiting review",
                    "subtitle": "Chennai · Ward 42",
                    "severity": "HIGH",
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
            ]
        else:
            current_hazards = _sync_db_hazards()
            return {
                "activeHazards": len(current_hazards),
                "activeHazardsTrendPct": 12,
                "criticalHazards": len([h for h in current_hazards if h.severity in ["HIGH", "CRITICAL"]]),
                "citizenReportsToday": 48,
                "fleetObservationsToday": 182,
                "activeVehicles": 24,
                "citiesActive": 12,
                "municipalities": 14,
                "dataCoveragePct": 89,
                "underRepair": 6,
                "resolved": 142
            }
            
    elif "hazard" in path_lower:
        current_hazards = _sync_db_hazards()
        items = []
        for h in current_hazards:
            hd = h.dict() if hasattr(h, "dict") else dict(h)
            hd["linkedHazardIds"] = hd.get("linkedHazardIds") or []
            ai_conf_val = hd.get("aiConfidence") or hd.get("ai_confidence") or hd.get("confidence") or 0.85
            hd["aiConfidence"] = ai_conf_val
            hd["evidence"] = hd.get("evidence") or [
                {
                    "id": f"{hd.get('id', 'hz')}-ev-1",
                    "kind": "CITIZEN",
                    "title": "Citizen report submitted",
                    "detail": f"Reported near {hd.get('locationText', 'Location')}",
                    "imageUrl": hd.get("photoUrl") or hd.get("imageUrl") or "",
                    "timestamp": hd.get("createdAt", datetime.now(timezone.utc).isoformat()),
                    "actorLabel": "Citizen reporter"
                },
                {
                    "id": f"{hd.get('id', 'hz')}-ev-2",
                    "kind": "AI",
                    "title": f"AI detection (Confidence {int(ai_conf_val*100)}%)",
                    "detail": "YOLOv8 pothole detection frame logged.",
                    "confidence": ai_conf_val,
                    "timestamp": hd.get("createdAt", datetime.now(timezone.utc).isoformat()),
                    "actorLabel": "SafePath AI Engine"
                }
            ]
            hd["timeline"] = hd.get("timeline") or [
                {"id": "t-1", "label": "Report Submitted", "actorLabel": "Citizen", "done": True},
                {"id": "t-2", "label": "AI Verification", "actorLabel": "SafePath AI Engine", "done": True},
                {"id": "t-3", "label": "Under Review", "actorLabel": "Central Admin", "done": True}
            ]
            items.append(hd)
            
        parts = [p for p in rest_path.split("/") if p]
        if len(parts) >= 2 and parts[0] in ["hazards", "hazard"] and parts[1] not in ["", "duplicates"]:
            target_id = parts[1]
            found = next((item for item in items if item["id"] == target_id or item.get("code") == target_id), None)
            if found:
                return found
            if items:
                return items[0]

        return {
            "items": items,
            "total": len(items),
            "page": 1,
            "pageSize": 20,
            "hasMore": False
        }
        
    elif "vehicle" in path_lower or "fleet" in path_lower or "operator" in path_lower or "payment" in path_lower:
        return {
            "items": [
                {
                    "id": "v-1",
                    "vehicleId": "FLT-CHN-001",
                    "operatorName": "Metropolitan Transport Corp",
                    "status": "LIVE",
                    "cityId": "city-chennai",
                    "cityName": "Chennai",
                    "lastSeenAt": datetime.now(timezone.utc).isoformat(),
                    "coverageKmToday": 142.5,
                    "detectionsToday": 18
                }
            ],
            "total": 1,
            "page": 1,
            "pageSize": 20,
            "hasMore": False
        }

    elif "user" in path_lower:
        return {
            "items": [
                {
                    "id": "user-1",
                    "userId": "USR-001",
                    "name": "Super Admin",
                    "email": "super.admin@safepath.ai",
                    "role": "SUPER_ADMIN",
                    "status": "ACTIVE",
                    "cityId": "ALL",
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
            ],
            "total": 1,
            "page": 1,
            "pageSize": 20,
            "hasMore": False
        }

    elif "system" in path_lower:
        if "summary" in path_lower:
            return {
                "overallStatus": "OPTIMAL",
                "servicesCount": 5,
                "healthyCount": 5,
                "lastCheckedAt": datetime.now(timezone.utc).isoformat()
            }
        return [
            {"id": "sys-1", "name": "AI Model Inference Engine", "status": "HEALTHY", "latencyMs": 38, "uptimePct": 99.98},
            {"id": "sys-2", "name": "Database Cluster", "status": "HEALTHY", "latencyMs": 2, "uptimePct": 99.99},
            {"id": "sys-3", "name": "Media Upload Storage", "status": "HEALTHY", "latencyMs": 12, "uptimePct": 99.95}
        ]

    elif "notification" in path_lower:
        return [
            {
                "id": "notif-1",
                "title": "System Active",
                "body": "SafePath Admin API backend connected cleanly.",
                "type": "SYSTEM",
                "read": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
        ]

    elif "feature-flag" in path_lower:
        return [
            {"key": "AI_AUTO_VERIFY", "name": "AI Automatic Hazard Verification", "enabled": True, "description": "Auto-verify hazards with >=70% AI confidence"},
            {"key": "FLEET_REALTIME_INGEST", "name": "Fleet Realtime Stream", "enabled": True, "description": "Ingest dash-cam telemetry in real time"}
        ]

    elif "app-version" in path_lower:
        return [
            {"app": "CITIZEN", "minSupportedVersion": "1.0.0", "latestVersion": "1.2.0", "updateMode": "OPTIONAL"},
            {"app": "ADMIN", "minSupportedVersion": "1.0.0", "latestVersion": "1.0.0", "updateMode": "OPTIONAL"}
        ]

    elif "maintenance-mode" in path_lower:
        return {"enabled": False, "reason": None, "allowedRoles": ["SUPER_ADMIN"]}

    elif "anomaly" in path_lower or "anomalies" in path_lower:
        return []

    elif "data-quality" in path_lower:
        return {"overallScore": 94, "gpsAccuracyScore": 96, "aiConfidenceScore": 92, "duplicateRatePct": 3.2}

    return {"status": "success", "message": "Admin API endpoint active", "path": rest_path}

# ---------------- Fleet Operator API Routes ----------------

@app.post("/api/fleet/observations")
async def ingest_fleet_observations(data: Dict[str, Any] = Body(...)):
    return {
        "status": "success",
        "ingestedCount": data.get("observationsCount", 1),
        "message": "Fleet observations ingested into database"
    }

def run_server(port):
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")

if __name__ == "__main__":
    import threading
    t1 = threading.Thread(target=run_server, args=(8000,), daemon=True)
    t2 = threading.Thread(target=run_server, args=(8001,), daemon=True)
    t1.start()
    t2.start()
    print("[+] SafePath AI Backend & AI Service running on ports 8000 and 8001...")
    t1.join()
    t2.join()
