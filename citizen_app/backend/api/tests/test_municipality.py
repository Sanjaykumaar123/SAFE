"""
Municipality app backend tests (product-spec section 85/86). Runs against
the same real Postgres+PostGIS test database as the rest of the suite (see
conftest.py) — these are the tests that matter most for this app:
city-level authorization must be enforced server-side, and a hazard must
disappear from the active map on resolution while staying in history.

Note: these tests hit the raw FastAPI backend directly (httpx against the
ASGI app), which speaks plain Pydantic snake_case both ways — the
camelCase you'd see from the mobile app is produced by its own client-side
interceptor (services/api/client.ts), not by this backend.
"""
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.ai_analysis import AIAnalysis
from app.models.citizen_report import CitizenReport
from app.models.city import City
from app.models.enums import (
    AIProvider,
    HazardSource,
    HazardStatus,
    HazardType,
    MunicipalityOfficerRole,
    Severity,
)
from app.models.fleet_observation import FleetObservation
from app.models.geo import make_point_wkt
from app.models.hazard import Hazard
from app.models.municipality import Municipality, MunicipalityCityAccess
from app.models.municipality_profile import MunicipalityProfile
from app.models.user import User, UserRole
from app.models.ward import Ward

OFFICER_EMAIL = "officer@chennai.gov.in"
OFFICER_PASSWORD = "SafePath@123"


@pytest_asyncio.fixture
async def municipality_setup(db_session_factory):
    """Chennai (authorized) + Coimbatore (NOT authorized) cities, one
    municipality scoped to Chennai only, one active officer login."""
    async with db_session_factory() as db:
        chennai = City(name="Chennai", state="Tamil Nadu", code="CHN", center_latitude=13.0827, center_longitude=80.2707)
        coimbatore = City(name="Coimbatore", state="Tamil Nadu", code="CBE", center_latitude=11.0168, center_longitude=76.9558)
        db.add_all([chennai, coimbatore])
        await db.flush()

        ward = Ward(city_id=chennai.id, code="W2", name="Ward 2 - Velachery")
        db.add(ward)
        await db.flush()

        municipality = Municipality(code="MUN-CHN", name="Greater Chennai Corporation", primary_city_id=chennai.id)
        db.add(municipality)
        await db.flush()
        db.add(MunicipalityCityAccess(municipality_id=municipality.id, city_id=chennai.id))

        officer = User(
            email=OFFICER_EMAIL, phone="+919840011111", full_name="Priya Raghavan",
            password_hash=hash_password(OFFICER_PASSWORD), role=UserRole.MUNICIPALITY,
        )
        db.add(officer)
        await db.flush()
        db.add(
            MunicipalityProfile(
                user_id=officer.id, municipality_id=municipality.id,
                officer_role=MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value,
                default_city_id=chennai.id, is_active=True,
            )
        )

        citizen = User(email="citizen@example.com", phone="+919840022222", full_name="Arun Kumar", password_hash=hash_password("SafePath@123"))
        db.add(citizen)
        await db.flush()

        await db.commit()
        return {"chennai_id": chennai.id, "coimbatore_id": coimbatore.id, "ward_id": ward.id, "municipality_id": municipality.id, "citizen_id": citizen.id}


@pytest_asyncio.fixture
async def officer_headers(client: AsyncClient, municipality_setup):
    response = await client.post(
        "/municipality/auth/login",
        json={"municipality_code": "MUN-CHN", "email": OFFICER_EMAIL, "password": OFFICER_PASSWORD},
    )
    assert response.status_code == 200, response.text
    token = response.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def pth1029(db_session_factory, municipality_setup):
    """The exact section 65/86 demo hazard: ACTIVE, citizen + AI evidence,
    5 fleet observations (2 detected, 3 clear)."""
    async with db_session_factory() as db:
        lat, lon = 12.9784, 80.2205
        hazard = Hazard(
            type=HazardType.POTHOLE, latitude=lat, longitude=lon, location=make_point_wkt(lat, lon),
            location_text="Velachery Main Road, near MRTS Station", road_name="Velachery Main Road",
            severity=Severity.HIGH, status=HazardStatus.ACTIVE, ai_confidence=0.94,
            source=HazardSource.CITIZEN_REPORT, city_id=municipality_setup["chennai_id"], ward_id=municipality_setup["ward_id"],
            hazard_code="PTH-1029", verified_by_admin=True, last_observed_at=datetime.now(timezone.utc),
        )
        db.add(hazard)
        await db.flush()

        analysis = AIAnalysis(provider=AIProvider.MOCK, image_url="https://example.com/pth1029.jpg", detected=True, hazard_type=HazardType.POTHOLE, confidence=0.94, severity=Severity.HIGH, processing_time_ms=400, model_version="mock-v1")
        db.add(analysis)
        await db.flush()
        db.add(
            CitizenReport(
                report_code="PTH-1029", user_id=municipality_setup["citizen_id"], hazard_id=hazard.id,
                hazard_type=HazardType.POTHOLE, severity=Severity.HIGH, status=HazardStatus.ACTIVE,
                latitude=lat, longitude=lon, location=make_point_wkt(lat, lon), location_text=hazard.location_text,
                city_id=municipality_setup["chennai_id"], ai_analysis_id=analysis.id, client_timestamp=datetime.now(timezone.utc),
            )
        )

        now = datetime.now(timezone.utc)
        observations = [("FLEET-01", 20, "DETECTED"), ("FLEET-02", 15, "DETECTED"), ("FLEET-03", 10, "CLEAR"), ("FLEET-04", 6, "CLEAR"), ("FLEET-05", 2, "CLEAR")]
        for vehicle_id, mins_ago, state in observations:
            db.add(
                FleetObservation(
                    hazard_id=hazard.id, vehicle_id=vehicle_id, observed_at=now - timedelta(minutes=mins_ago),
                    confidence=0.85, latitude=lat, longitude=lon, location=make_point_wkt(lat, lon),
                    observation_state=state, data_quality="HIGH",
                )
            )

        await db.commit()
        await db.refresh(hazard)
        return hazard


# --- Login ---


async def test_login_succeeds_with_correct_municipality_email_and_password(client: AsyncClient, municipality_setup):
    response = await client.post("/municipality/auth/login", json={"municipality_code": "MUN-CHN", "email": OFFICER_EMAIL, "password": OFFICER_PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["officer"]["municipality_code"] == "MUN-CHN"
    assert body["officer"]["permissions"]


async def test_login_rejects_wrong_password(client: AsyncClient, municipality_setup):
    response = await client.post("/municipality/auth/login", json={"municipality_code": "MUN-CHN", "email": OFFICER_EMAIL, "password": "WrongPassword"})
    assert response.status_code == 401


async def test_login_rejects_wrong_municipality_code(client: AsyncClient, municipality_setup):
    response = await client.post("/municipality/auth/login", json={"municipality_code": "MUN-XXX", "email": OFFICER_EMAIL, "password": OFFICER_PASSWORD})
    assert response.status_code == 401


async def test_citizen_account_cannot_use_municipality_endpoints(client: AsyncClient, auth_headers):
    """A citizen JWT (from the shared `/auth/login`) must never pass the
    municipality role check (section 08/70)."""
    response = await client.get("/municipality/me/", headers=auth_headers)
    assert response.status_code == 403


# --- City authorization (section 04/52/85's critical security test) ---


async def test_officer_can_read_own_city_dashboard(client: AsyncClient, officer_headers, municipality_setup):
    response = await client.get("/municipality/dashboard/", params={"city_id": str(municipality_setup["chennai_id"])}, headers=officer_headers)
    assert response.status_code == 200
    assert response.json()["city_name"] == "Chennai"


async def test_officer_cannot_read_unauthorized_city_dashboard(client: AsyncClient, officer_headers, municipality_setup):
    response = await client.get("/municipality/dashboard/", params={"city_id": str(municipality_setup["coimbatore_id"])}, headers=officer_headers)
    assert response.status_code == 403


async def test_officer_cannot_list_unauthorized_city_hazards(client: AsyncClient, officer_headers, municipality_setup):
    response = await client.get("/municipality/hazards/", params={"city_id": str(municipality_setup["coimbatore_id"])}, headers=officer_headers)
    assert response.status_code == 403


async def test_hazard_endpoints_require_auth(client: AsyncClient, municipality_setup):
    response = await client.get("/municipality/hazards/", params={"city_id": str(municipality_setup["chennai_id"])})
    assert response.status_code == 401


# --- Hazard detail / verification / timeline ---


async def test_hazard_list_includes_pth1029_by_default(client: AsyncClient, officer_headers, municipality_setup, pth1029):
    response = await client.get("/municipality/hazards/", params={"city_id": str(municipality_setup["chennai_id"])}, headers=officer_headers)
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert str(pth1029.id) in ids


async def test_hazard_detail_reports_citizen_and_fleet_source(client: AsyncClient, officer_headers, pth1029):
    response = await client.get(f"/municipality/hazards/{pth1029.id}", headers=officer_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["source_summary"] == "CITIZEN_AND_FLEET"
    assert len(body["citizen_reports"]) == 1
    assert len(body["latest_fleet_observations"]) == 5
    assert body["priority"]["label"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")


async def test_verification_uses_at_most_five_most_relevant_observations(client: AsyncClient, officer_headers, pth1029):
    response = await client.get(f"/municipality/hazards/{pth1029.id}/verification", headers=officer_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["observations"]) == 5
    assert body["detected_count"] == 2
    assert body["clear_count"] == 3
    # Never a naive "5 vehicles passed = automatically clear" — mixed
    # evidence must not be reported as full confidence (section 27).
    assert body["state"] != "CONFIRMED_CLEAR" or body["confidence"] < 100


async def test_officer_from_another_city_cannot_read_this_hazard(client: AsyncClient, municipality_setup, pth1029, db_session_factory):
    """A hazard belonging to an authorized city must still 404 (not 200) for
    an officer whose municipality isn't authorized for THAT city at all."""
    async with db_session_factory() as db:
        other_municipality = Municipality(code="MUN-CBE", name="Coimbatore Corporation", primary_city_id=municipality_setup["coimbatore_id"])
        db.add(other_municipality)
        await db.flush()
        db.add(MunicipalityCityAccess(municipality_id=other_municipality.id, city_id=municipality_setup["coimbatore_id"]))
        other_officer = User(email="officer@coimbatore.gov.in", phone="+919840033333", full_name="Karthik S", password_hash=hash_password("SafePath@123"), role=UserRole.MUNICIPALITY)
        db.add(other_officer)
        await db.flush()
        db.add(MunicipalityProfile(user_id=other_officer.id, municipality_id=other_municipality.id, officer_role=MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value, default_city_id=municipality_setup["coimbatore_id"], is_active=True))
        await db.commit()

    login = await client.post("/municipality/auth/login", json={"municipality_code": "MUN-CBE", "email": "officer@coimbatore.gov.in", "password": "SafePath@123"})
    assert login.status_code == 200
    other_headers = {"Authorization": f"Bearer {login.json()['tokens']['access_token']}"}

    response = await client.get(f"/municipality/hazards/{pth1029.id}", headers=other_headers)
    assert response.status_code == 404


# --- Repair -> inspect -> resolve loop (section 86's full scenario) ---


async def test_full_assign_repair_inspect_resolve_loop(client: AsyncClient, officer_headers, municipality_setup, pth1029):
    # 1. Assign repair
    assign_response = await client.post(
        "/municipality/repairs/",
        json={"hazard_id": str(pth1029.id), "department": "Road Maintenance", "team": "Zone 4 Road Maintenance Team", "priority": "HIGH"},
        headers=officer_headers,
    )
    assert assign_response.status_code == 201, assign_response.text
    repair = assign_response.json()
    assert repair["status"] == "ASSIGNED"
    repair_id = repair["id"]

    # A second repair on the same hazard while one is open must be rejected
    # (section 54: one active repair at a time).
    duplicate_response = await client.post(
        "/municipality/repairs/", json={"hazard_id": str(pth1029.id), "department": "Road Maintenance"}, headers=officer_headers,
    )
    assert duplicate_response.status_code == 409

    hazard_after_assign = await client.get(f"/municipality/hazards/{pth1029.id}", headers=officer_headers)
    assert hazard_after_assign.json()["status"] == "UNDER_REPAIR"

    # 2. Log progress
    progress_response = await client.post(f"/municipality/repairs/{repair_id}/progress", json={"note": "Surface leveled."}, headers=officer_headers)
    assert progress_response.status_code == 201

    # Cannot resolve before the repair has passed inspection.
    premature_resolve = await client.post(
        f"/municipality/hazards/{pth1029.id}/resolve",
        json={"resolution_notes": "too early", "repair_id": repair_id, "verification_method": "MUNICIPAL_INSPECTION"},
        headers=officer_headers,
    )
    assert premature_resolve.status_code == 409

    # 3. Mark ready for inspection
    ready_response = await client.post(f"/municipality/repairs/{repair_id}/ready-for-inspection", headers=officer_headers)
    assert ready_response.status_code == 200
    assert ready_response.json()["status"] == "READY_FOR_INSPECTION"

    # 4. Inspector approves
    inspection_response = await client.post(
        "/municipality/inspections/", json={"repair_id": repair_id, "decision": "APPROVED", "notes": "Looks good."}, headers=officer_headers,
    )
    assert inspection_response.status_code == 201
    assert inspection_response.json()["decision"] == "APPROVED"

    # 5. Confirm resolution
    resolve_response = await client.post(
        f"/municipality/hazards/{pth1029.id}/resolve",
        json={"resolution_notes": "Road surface repaired and inspected.", "repair_id": repair_id, "verification_method": "MUNICIPAL_INSPECTION"},
        headers=officer_headers,
    )
    assert resolve_response.status_code == 200

    # 6. Resolved hazard disappears from the default active list...
    active_list = await client.get("/municipality/hazards/", params={"city_id": str(municipality_setup["chennai_id"])}, headers=officer_headers)
    active_ids = [item["id"] for item in active_list.json()["items"]]
    assert str(pth1029.id) not in active_ids

    # ...but remains in resolved history (section 43/87 — never deleted).
    resolved_list = await client.get("/municipality/hazards/", params={"city_id": str(municipality_setup["chennai_id"]), "status": "RESOLVED"}, headers=officer_headers)
    resolved_ids = [item["id"] for item in resolved_list.json()["items"]]
    assert str(pth1029.id) in resolved_ids

    hazard_detail = await client.get(f"/municipality/hazards/{pth1029.id}", headers=officer_headers)
    assert hazard_detail.json()["status"] == "RESOLVED"
    assert hazard_detail.json()["resolution_state"] == "RESOLVED"


async def test_inspection_rework_sends_repair_back_without_resolving_hazard(client: AsyncClient, officer_headers, pth1029):
    assign_response = await client.post("/municipality/repairs/", json={"hazard_id": str(pth1029.id), "department": "Road Maintenance"}, headers=officer_headers)
    repair_id = assign_response.json()["id"]
    await client.post(f"/municipality/repairs/{repair_id}/ready-for-inspection", headers=officer_headers)

    rework_response = await client.post(
        "/municipality/inspections/", json={"repair_id": repair_id, "decision": "REWORK_REQUESTED", "notes": "Edge not finished."}, headers=officer_headers,
    )
    assert rework_response.status_code == 201

    repair_detail = await client.get(f"/municipality/repairs/{repair_id}", headers=officer_headers)
    assert repair_detail.json()["status"] == "REWORK_REQUIRED"

    hazard_detail = await client.get(f"/municipality/hazards/{pth1029.id}", headers=officer_headers)
    assert hazard_detail.json()["status"] == "UNDER_REPAIR"  # not resolved


async def test_reopen_requires_hazard_to_already_be_resolved(client: AsyncClient, officer_headers, pth1029):
    response = await client.post(f"/municipality/hazards/{pth1029.id}/reopen", json={"note": "still broken"}, headers=officer_headers)
    assert response.status_code == 409
