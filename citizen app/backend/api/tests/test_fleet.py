"""
Fleet Operator app backend tests (product-spec section 88/89). Runs against
the same real Postgres+PostGIS test database as the rest of the suite (see
conftest.py). The security set (§89) matters most here: one operator must
never be able to read or act on another operator's session/observation/
vehicle/city, and the client can never assert its own operator/vehicle/city
identity — only what the JWT resolves to.
"""
from datetime import datetime, timedelta, timezone

import pytest_asyncio
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.city import City
from app.models.enums import HazardSource, HazardStatus, HazardType, Severity
from app.models.fleet_operator_profile import FleetOperatorProfile
from app.models.geo import make_point_wkt
from app.models.hazard import Hazard
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle

OPERATOR_A_CODE = "OP-0042"
OPERATOR_B_CODE = "OP-0099"
OPERATOR_PASSWORD = "SafePath@123"


@pytest_asyncio.fixture
async def fleet_setup(db_session_factory):
    """Chennai city, one seeded active hazard (for association tests), and
    two independent operators (A/B) each with their own vehicle — B exists
    purely to prove A can't touch B's data."""
    async with db_session_factory() as db:
        chennai = City(name="Chennai", state="Tamil Nadu", code="CHN", center_latitude=13.0827, center_longitude=80.2707)
        db.add(chennai)
        await db.flush()

        near_lat, near_lon = 12.9784, 80.2205
        existing_hazard = Hazard(
            hazard_code="PTH-1029", type=HazardType.POTHOLE, latitude=near_lat, longitude=near_lon,
            location=make_point_wkt(near_lat, near_lon), location_text="Velachery Main Road, near MRTS Station",
            road_name="Velachery Main Road", severity=Severity.HIGH, status=HazardStatus.ACTIVE,
            ai_confidence=0.91, source=HazardSource.CITIZEN_REPORT, city_id=chennai.id,
            last_observed_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        db.add(existing_hazard)
        await db.flush()

        vehicle_a = Vehicle(registration_number="TN 38 AB 1234", city_id=chennai.id, status="ACTIVE")
        vehicle_b = Vehicle(registration_number="TN 38 AB 5678", city_id=chennai.id, status="ACTIVE")
        db.add_all([vehicle_a, vehicle_b])
        await db.flush()

        user_a = User(email="operator.a@fleet.safepath.ai", phone="+919840088801", full_name="Karthik Selvam", password_hash=hash_password(OPERATOR_PASSWORD), role=UserRole.FLEET_OPERATOR)
        user_b = User(email="operator.b@fleet.safepath.ai", phone="+919840088802", full_name="Divya Menon", password_hash=hash_password(OPERATOR_PASSWORD), role=UserRole.FLEET_OPERATOR)
        db.add_all([user_a, user_b])
        await db.flush()

        profile_a = FleetOperatorProfile(user_id=user_a.id, operator_code=OPERATOR_A_CODE, city_id=chennai.id, zone_name="Chennai South", assigned_vehicle_id=vehicle_a.id, is_active=True)
        profile_b = FleetOperatorProfile(user_id=user_b.id, operator_code=OPERATOR_B_CODE, city_id=chennai.id, zone_name="Chennai South", assigned_vehicle_id=vehicle_b.id, is_active=True)
        db.add_all([profile_a, profile_b])

        await db.commit()
        await db.refresh(existing_hazard)
        await db.refresh(vehicle_a)
        await db.refresh(vehicle_b)
        await db.refresh(profile_a)
        await db.refresh(profile_b)

        return {
            "city_id": chennai.id,
            "hazard_id": existing_hazard.id,
            "hazard_location": (near_lat, near_lon),
            "vehicle_a_id": vehicle_a.id,
            "vehicle_b_id": vehicle_b.id,
        }


async def _login(client: AsyncClient, operator_code: str) -> dict:
    response = await client.post("/fleet/auth/login", json={"operator_code": operator_code, "password": OPERATOR_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()


@pytest_asyncio.fixture
async def operator_a_headers(client: AsyncClient, fleet_setup):
    body = await _login(client, OPERATOR_A_CODE)
    return {"Authorization": f"Bearer {body['tokens']['access_token']}"}


@pytest_asyncio.fixture
async def operator_b_headers(client: AsyncClient, fleet_setup):
    body = await _login(client, OPERATOR_B_CODE)
    return {"Authorization": f"Bearer {body['tokens']['access_token']}"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _start_session(client: AsyncClient, headers: dict) -> str:
    response = await client.post("/fleet/sessions", json={"start_latitude": 13.0, "start_longitude": 80.2}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------


async def test_login_success(client: AsyncClient, fleet_setup):
    body = await _login(client, OPERATOR_A_CODE)
    assert body["operator"]["operator_code"] == OPERATOR_A_CODE
    assert body["operator"]["vehicle"]["registration_number"] == "TN 38 AB 1234"


async def test_login_wrong_password(client: AsyncClient, fleet_setup):
    response = await client.post("/fleet/auth/login", json={"operator_code": OPERATOR_A_CODE, "password": "wrong-password"})
    assert response.status_code == 401


async def test_login_unknown_operator_code(client: AsyncClient, fleet_setup):
    response = await client.post("/fleet/auth/login", json={"operator_code": "OP-9999", "password": OPERATOR_PASSWORD})
    assert response.status_code == 401


async def test_me_returns_operator_and_vehicle(client: AsyncClient, operator_a_headers):
    response = await client.get("/fleet/me/", headers=operator_a_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["operator"]["operator_code"] == OPERATOR_A_CODE
    assert body["operator"]["vehicle"]["registration_number"] == "TN 38 AB 1234"
    assert body["today_target"]["target_km"] > 0


# --------------------------------------------------------------------------
# Sessions
# --------------------------------------------------------------------------


async def test_start_and_get_current_session(client: AsyncClient, operator_a_headers):
    session_id = await _start_session(client, operator_a_headers)
    response = await client.get("/fleet/sessions/current", headers=operator_a_headers)
    assert response.status_code == 200
    assert response.json()["id"] == session_id


async def test_cannot_start_second_active_session(client: AsyncClient, operator_a_headers):
    await _start_session(client, operator_a_headers)
    response = await client.post("/fleet/sessions", json={}, headers=operator_a_headers)
    assert response.status_code == 409


async def test_session_start_idempotent_on_client_session_id(client: AsyncClient, operator_a_headers):
    r1 = await client.post("/fleet/sessions", json={"client_session_id": "retry-1"}, headers=operator_a_headers)
    r2 = await client.post("/fleet/sessions", json={"client_session_id": "retry-1"}, headers=operator_a_headers)
    assert r1.status_code == 201 and r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]


async def test_stop_session_returns_trip_summary(client: AsyncClient, operator_a_headers):
    session_id = await _start_session(client, operator_a_headers)
    response = await client.post(f"/fleet/sessions/{session_id}/stop", json={"reported_distance_km": 12.5}, headers=operator_a_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["session"]["status"] in ("VALIDATED", "PARTIALLY_VALIDATED")
    assert body["estimated_earnings"] >= 0


async def test_operator_b_cannot_read_operator_a_session(client: AsyncClient, operator_a_headers, operator_b_headers):
    session_id = await _start_session(client, operator_a_headers)
    response = await client.get(f"/fleet/sessions/{session_id}", headers=operator_b_headers)
    assert response.status_code == 404


async def test_operator_b_cannot_stop_operator_a_session(client: AsyncClient, operator_a_headers, operator_b_headers):
    session_id = await _start_session(client, operator_a_headers)
    response = await client.post(f"/fleet/sessions/{session_id}/stop", json={"reported_distance_km": 5}, headers=operator_b_headers)
    assert response.status_code == 404


async def test_client_supplied_vehicle_id_must_match_assignment(client: AsyncClient, operator_a_headers, fleet_setup):
    response = await client.post("/fleet/sessions", json={"vehicle_id": str(fleet_setup["vehicle_b_id"])}, headers=operator_a_headers)
    assert response.status_code == 403


# --------------------------------------------------------------------------
# Observations + hazard association (sections 13/26/32/60)
# --------------------------------------------------------------------------


async def test_observation_near_existing_hazard_associates(client: AsyncClient, operator_a_headers, fleet_setup):
    session_id = await _start_session(client, operator_a_headers)
    lat, lon = fleet_setup["hazard_location"]
    response = await client.post(
        "/fleet/observations",
        json={"client_observation_id": "obs-1", "session_id": session_id, "latitude": lat, "longitude": lon, "observed_at": _now_iso(), "confidence": 0.93},
        headers=operator_a_headers,
    )
    assert response.status_code == 201, response.text
    assert response.json()["hazard_id"] == str(fleet_setup["hazard_id"])


async def test_observation_far_from_hazard_creates_new_candidate(client: AsyncClient, operator_a_headers, fleet_setup):
    session_id = await _start_session(client, operator_a_headers)
    response = await client.post(
        "/fleet/observations",
        json={"client_observation_id": "obs-2", "session_id": session_id, "latitude": 13.05, "longitude": 80.30, "observed_at": _now_iso(), "confidence": 0.8},
        headers=operator_a_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["hazard_id"] != str(fleet_setup["hazard_id"])


async def test_duplicate_observation_via_batch_is_not_recreated(client: AsyncClient, operator_a_headers, fleet_setup):
    session_id = await _start_session(client, operator_a_headers)
    lat, lon = fleet_setup["hazard_location"]
    item = {"client_observation_id": "obs-dup", "session_id": session_id, "latitude": lat, "longitude": lon, "observed_at": _now_iso(), "confidence": 0.9}
    r1 = await client.post("/fleet/observations/batch", json={"items": [item]}, headers=operator_a_headers)
    r2 = await client.post("/fleet/observations/batch", json={"items": [item]}, headers=operator_a_headers)
    assert r1.json()["results"][0]["status"] == "ACCEPTED"
    assert r2.json()["results"][0]["status"] == "DUPLICATE"
    assert r1.json()["results"][0]["observation_id"] == r2.json()["results"][0]["observation_id"]


async def test_batch_mixed_results(client: AsyncClient, operator_a_headers, fleet_setup):
    session_id = await _start_session(client, operator_a_headers)
    lat, lon = fleet_setup["hazard_location"]
    payload = {
        "items": [
            {"client_observation_id": "batch-1", "session_id": session_id, "latitude": lat, "longitude": lon, "observed_at": _now_iso(), "confidence": 0.9},
            {"client_observation_id": "batch-2", "session_id": "00000000-0000-0000-0000-000000000000", "latitude": lat, "longitude": lon, "observed_at": _now_iso(), "confidence": 0.9},
        ]
    }
    response = await client.post("/fleet/observations/batch", json=payload, headers=operator_a_headers)
    results = {r["client_observation_id"]: r["status"] for r in response.json()["results"]}
    assert results["batch-1"] == "ACCEPTED"
    assert results["batch-2"] == "FAILED"


async def test_operator_b_cannot_submit_against_operator_a_session(client: AsyncClient, operator_a_headers, operator_b_headers, fleet_setup):
    session_id = await _start_session(client, operator_a_headers)
    lat, lon = fleet_setup["hazard_location"]
    response = await client.post(
        "/fleet/observations",
        json={"client_observation_id": "cross-op", "session_id": session_id, "latitude": lat, "longitude": lon, "observed_at": _now_iso(), "confidence": 0.9},
        headers=operator_b_headers,
    )
    assert response.status_code == 404


async def test_operator_b_cannot_read_operator_a_observation(client: AsyncClient, operator_a_headers, operator_b_headers, fleet_setup):
    session_id = await _start_session(client, operator_a_headers)
    lat, lon = fleet_setup["hazard_location"]
    create = await client.post(
        "/fleet/observations",
        json={"client_observation_id": "obs-owned", "session_id": session_id, "latitude": lat, "longitude": lon, "observed_at": _now_iso(), "confidence": 0.9},
        headers=operator_a_headers,
    )
    observation_id = create.json()["id"]
    response = await client.get(f"/fleet/observations/{observation_id}", headers=operator_b_headers)
    assert response.status_code == 404


# --------------------------------------------------------------------------
# Earnings (sections 40/85) — backend-computed only
# --------------------------------------------------------------------------


async def test_earnings_reflect_validated_session(client: AsyncClient, operator_a_headers):
    session_id = await _start_session(client, operator_a_headers)
    await client.post(f"/fleet/sessions/{session_id}/stop", json={"reported_distance_km": 0.0}, headers=operator_a_headers)
    response = await client.get("/fleet/earnings", headers=operator_a_headers)
    assert response.status_code == 200
    body = response.json()
    assert "today" in body and "this_week" in body and "this_month" in body


async def test_earnings_isolated_per_operator(client: AsyncClient, operator_a_headers, operator_b_headers):
    session_id = await _start_session(client, operator_a_headers)
    await client.post(f"/fleet/sessions/{session_id}/stop", json={"reported_distance_km": 20.0}, headers=operator_a_headers)

    a_earnings = (await client.get("/fleet/earnings", headers=operator_a_headers)).json()
    b_earnings = (await client.get("/fleet/earnings", headers=operator_b_headers)).json()
    assert a_earnings["today"] >= 0
    assert b_earnings["today"] == 0.0
