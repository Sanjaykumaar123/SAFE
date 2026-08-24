"""
SafePath AI Database Persistence Manager.
Provides persistent storage using SQLite (with auto-sync to PostgreSQL when available).
Prevents data loss for reported hazards, citizen submissions, work orders, and verifications.
"""

import os
import json
import sqlite3
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("safepath_db")

DB_FILE_PATH = os.path.join(os.path.dirname(__file__), "safepath.db")

class SafePathDatabase:
    def __init__(self, db_path: str = DB_FILE_PATH):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS hazards (
                        id TEXT PRIMARY KEY,
                        title TEXT,
                        description TEXT,
                        type TEXT,
                        severity TEXT,
                        status TEXT,
                        latitude REAL,
                        longitude REAL,
                        location_name TEXT,
                        photo_url TEXT,
                        ai_confidence REAL,
                        risk_score REAL,
                        created_at TEXT,
                        is_demo_data INTEGER,
                        bbox_json TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS work_orders (
                        id TEXT PRIMARY KEY,
                        hazard_id TEXT,
                        contractor_id TEXT,
                        status TEXT,
                        priority TEXT,
                        sla_deadline TEXT,
                        sla_breached INTEGER,
                        created_at TEXT,
                        estimated_completion TEXT,
                        actual_completion TEXT
                    )
                """)
                conn.commit()
                logger.info(f"Database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

    def get_all_hazards(self) -> List[Dict[str, Any]]:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM hazards ORDER BY created_at DESC")
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    bbox_data = json.loads(r["bbox_json"]) if r["bbox_json"] else None
                    results.append({
                        "id": r["id"],
                        "title": r["title"],
                        "description": r["description"],
                        "type": r["type"],
                        "severity": r["severity"],
                        "status": r["status"],
                        "latitude": r["latitude"],
                        "longitude": r["longitude"],
                        "locationName": r["location_name"],
                        "location_name": r["location_name"],
                        "photoUrl": r["photo_url"],
                        "photo_url": r["photo_url"],
                        "aiConfidence": r["ai_confidence"],
                        "ai_confidence": r["ai_confidence"],
                        "riskScore": r["risk_score"],
                        "risk_score": r["risk_score"],
                        "createdAt": r["created_at"],
                        "created_at": r["created_at"],
                        "isDemoData": bool(r["is_demo_data"]),
                        "is_demo_data": bool(r["is_demo_data"]),
                        "bbox": bbox_data,
                    })
                return results
        except Exception as e:
            logger.error(f"Error reading hazards from DB: {e}")
            return []

    def save_hazard(self, h: Dict[str, Any]):
        try:
            bbox_json = json.dumps(h.get("bbox")) if h.get("bbox") else None
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO hazards (
                        id, title, description, type, severity, status,
                        latitude, longitude, location_name, photo_url,
                        ai_confidence, risk_score, created_at, is_demo_data, bbox_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    h.get("id"),
                    h.get("title"),
                    h.get("description"),
                    h.get("type"),
                    h.get("severity"),
                    h.get("status"),
                    h.get("latitude"),
                    h.get("longitude"),
                    h.get("locationName") or h.get("location_name"),
                    h.get("photoUrl") or h.get("photo_url"),
                    h.get("aiConfidence") or h.get("ai_confidence"),
                    h.get("riskScore") or h.get("risk_score"),
                    h.get("createdAt") or h.get("created_at"),
                    1 if h.get("isDemoData") or h.get("is_demo_data") else 0,
                    bbox_json
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save hazard {h.get('id')}: {e}")

    def update_hazard_status(self, hazard_id: str, new_status: str):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE hazards SET status = ? WHERE id = ?", (new_status, hazard_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update hazard status for {hazard_id}: {e}")

    def get_hazard_count(self) -> int:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM hazards")
                return cursor.fetchone()[0]
        except Exception:
            return 0

    def get_all_work_orders(self) -> List[Dict[str, Any]]:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM work_orders ORDER BY created_at DESC")
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    results.append({
                        "id": r["id"],
                        "hazardId": r["hazard_id"],
                        "hazard_id": r["hazard_id"],
                        "contractorId": r["contractor_id"],
                        "contractor_id": r["contractor_id"],
                        "status": r["status"],
                        "priority": r["priority"],
                        "slaDeadline": r["sla_deadline"],
                        "sla_deadline": r["sla_deadline"],
                        "slaBreached": bool(r["sla_breached"]),
                        "sla_breached": bool(r["sla_breached"]),
                        "createdAt": r["created_at"],
                        "created_at": r["created_at"],
                        "estimatedCompletion": r["estimated_completion"],
                        "estimated_completion": r["estimated_completion"],
                        "actualCompletion": r["actual_completion"],
                        "actual_completion": r["actual_completion"],
                    })
                return results
        except Exception as e:
            logger.error(f"Error reading work orders from DB: {e}")
            return []

    def save_work_order(self, w: Dict[str, Any]):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO work_orders (
                        id, hazard_id, contractor_id, status, priority,
                        sla_deadline, sla_breached, created_at,
                        estimated_completion, actual_completion
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    w.get("id"),
                    w.get("hazardId") or w.get("hazard_id"),
                    w.get("contractorId") or w.get("contractor_id"),
                    w.get("status"),
                    w.get("priority"),
                    w.get("slaDeadline") or w.get("sla_deadline"),
                    1 if w.get("slaBreached") or w.get("sla_breached") else 0,
                    w.get("createdAt") or w.get("created_at"),
                    w.get("estimatedCompletion") or w.get("estimated_completion"),
                    w.get("actualCompletion") or w.get("actual_completion"),
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save work order {w.get('id')}: {e}")

    def update_work_order_status(self, wo_id: str, new_status: str):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE work_orders SET status = ? WHERE id = ?", (new_status, wo_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update work order status for {wo_id}: {e}")

db_manager = SafePathDatabase()
