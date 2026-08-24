"""
In-memory Demo Store for SafePath AI Fleet Operator and Citizen API.
Ensures the backend functions seamlessly with full mock/demo capabilities
even when the external PostgreSQL/PostGIS database is not running.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

DEMO_USER_ID = uuid.UUID("8d4d7217-8737-465a-945f-c6b88320e972")
DEMO_CITY_ID = uuid.UUID("59fd1a9b-7f0e-4090-82ea-5372a471af10")
DEMO_VEHICLE_ID = uuid.UUID("31fce860-ec5a-4f98-9f5d-6d694ffc6315")
DEMO_OPERATOR_PROFILE_ID = uuid.UUID("22c1b9a2-5b91-4e4b-91d1-123456789abc")

DEMO_OPERATOR_CODE = "OP-0042"
DEMO_PASSWORD = "SafePath@123"

now = datetime.now(timezone.utc)

class DemoStore:
    def __init__(self):
        self.active_session: Optional[Dict[str, Any]] = None
        self.sessions: List[Dict[str, Any]] = [
            {
                "id": uuid.UUID("a1b2c3d4-e5f6-47a8-b9c0-112233445566"),
                "status": "VALIDATED",
                "vehicle_id": DEMO_VEHICLE_ID,
                "city_id": DEMO_CITY_ID,
                "zone_name": "Chennai South",
                "start_time": now - timedelta(days=1, hours=4),
                "end_time": now - timedelta(days=1, hours=2),
                "start_latitude": 13.0067,
                "start_longitude": 80.2206,
                "end_latitude": 13.0355,
                "end_longitude": 80.2470,
                "reported_distance_km": 42.8,
                "validated_distance_km": 42.8,
                "observation_count": 21,
                "valid_observation_count": 19,
                "data_quality_score": 94.0,
                "client_session_id": "seed-session-1",
                "device_metadata": {},
            },
            {
                "id": uuid.UUID("b2c3d4e5-f6a7-48b9-c0d1-223344556677"),
                "status": "VALIDATED",
                "vehicle_id": DEMO_VEHICLE_ID,
                "city_id": DEMO_CITY_ID,
                "zone_name": "Chennai South",
                "start_time": now - timedelta(days=2, hours=5),
                "end_time": now - timedelta(days=2, hours=3),
                "start_latitude": 13.0100,
                "start_longitude": 80.2150,
                "end_latitude": 13.0400,
                "end_longitude": 80.2500,
                "reported_distance_km": 31.5,
                "validated_distance_km": 31.5,
                "observation_count": 14,
                "valid_observation_count": 13,
                "data_quality_score": 92.0,
                "client_session_id": "seed-session-2",
                "device_metadata": {},
            },
        ]
        self.observations: List[Dict[str, Any]] = []
        self.payments: List[Dict[str, Any]] = [
            {
                "id": uuid.UUID("c3d4e5f6-a7b8-49c0-d1e2-334455667788"),
                "session_id": uuid.UUID("a1b2c3d4-e5f6-47a8-b9c0-112233445566"),
                "status": "APPROVED",
                "total_amount": 548.0,
                "coverage_amount": 350.0,
                "observation_amount": 148.0,
                "quality_bonus_amount": 50.0,
                "computed_at": now - timedelta(days=1, hours=2),
                "created_at": now - timedelta(days=1, hours=2),
                "paid_at": None,
            },
            {
                "id": uuid.UUID("d4e5f6a7-b8c9-40d1-e2f3-445566778899"),
                "session_id": uuid.UUID("b2c3d4e5-f6a7-48b9-c0d1-223344556677"),
                "status": "APPROVED",
                "total_amount": 395.0,
                "coverage_amount": 260.0,
                "observation_amount": 95.0,
                "quality_bonus_amount": 40.0,
                "computed_at": now - timedelta(days=2, hours=3),
                "created_at": now - timedelta(days=2, hours=3),
                "paid_at": None,
            },
        ]

    def start_session(self, payload: Any) -> Dict[str, Any]:
        session_id = uuid.uuid4()
        session = {
            "id": session_id,
            "operator_id": DEMO_OPERATOR_PROFILE_ID,
            "vehicle_id": DEMO_VEHICLE_ID,
            "city_id": DEMO_CITY_ID,
            "zone_name": "Chennai South",
            "status": "ACTIVE",
            "start_time": datetime.now(timezone.utc),
            "end_time": None,
            "start_latitude": getattr(payload, "start_latitude", 13.0067),
            "start_longitude": getattr(payload, "start_longitude", 80.2206),
            "end_latitude": None,
            "end_longitude": None,
            "reported_distance_km": 0.0,
            "validated_distance_km": None,
            "observation_count": 0,
            "valid_observation_count": 0,
            "data_quality_score": None,
            "client_session_id": getattr(payload, "client_session_id", None) or f"session-{session_id}",
            "device_metadata": getattr(payload, "device_metadata", {}),
        }
        self.active_session = session
        self.sessions.insert(0, session)
        return session

    def stop_session(self, session_id: uuid.UUID, payload: Any) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if not session:
            session = self.active_session or self.sessions[0]
        
        end_time = datetime.now(timezone.utc)
        distance = getattr(payload, "reported_distance_km", 12.4)
        obs_count = getattr(payload, "observation_count", 8)
        valid_obs = max(1, obs_count - 1)
        
        session["status"] = "VALIDATED"
        session["end_time"] = end_time
        session["end_latitude"] = getattr(payload, "end_latitude", 13.0355)
        session["end_longitude"] = getattr(payload, "end_longitude", 80.2470)
        session["reported_distance_km"] = distance
        session["validated_distance_km"] = distance
        session["observation_count"] = obs_count
        session["valid_observation_count"] = valid_obs
        session["data_quality_score"] = 95.0
        
        self.active_session = None
        
        coverage_amount = round(distance * 8.0, 2)
        observation_amount = round(valid_obs * 5.0, 2)
        quality_bonus_amount = 25.0
        total_amount = round(coverage_amount + observation_amount + quality_bonus_amount, 2)
        
        payment = {
            "id": uuid.uuid4(),
            "session_id": session["id"],
            "status": "APPROVED",
            "total_amount": total_amount,
            "coverage_amount": coverage_amount,
            "observation_amount": observation_amount,
            "quality_bonus_amount": quality_bonus_amount,
            "computed_at": end_time,
            "created_at": end_time,
            "paid_at": None,
        }
        self.payments.insert(0, payment)
        return {"session": session, "earnings": payment}

    def get_session(self, session_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        for s in self.sessions:
            if s["id"] == session_id:
                return s
        return None

    def get_earnings_summary(self) -> Dict[str, Any]:
        today_total = sum(p["total_amount"] for p in self.payments if (datetime.now(timezone.utc) - p["computed_at"]).days == 0)
        if today_total == 0:
            today_total = 320.0
        return {
            "today": today_total,
            "this_week": 2840.0,
            "this_month": 11240.0,
            "breakdown_today": {
                "coverage_amount": round(today_total * 0.7, 2),
                "observation_amount": round(today_total * 0.2, 2),
                "quality_bonus_amount": round(today_total * 0.1, 2),
                "total_amount": today_total,
            },
        }

demo_store = DemoStore()
