"""Report creation end-to-end, plus the privileged-field guarantee from
section 23: a citizen must never be able to set verification/resolution
state directly through the request body."""
from datetime import datetime, timezone

from httpx import AsyncClient

VALID_REPORT_PAYLOAD = {
    "hazard_type": "POTHOLE",
    "severity": "HIGH",
    "description": "Deep pothole near the bus stop",
    "latitude": 13.05,
    "longitude": 80.21,
    "location_text": "Test Road, Chennai",
    "media_urls": [],
    "client_timestamp": datetime.now(timezone.utc).isoformat(),
}


async def test_create_report_requires_auth(client: AsyncClient):
    response = await client.post("/reports/", json=VALID_REPORT_PAYLOAD)
    assert response.status_code == 401


async def test_create_report_returns_a_report_code_and_reported_status(client: AsyncClient, auth_headers):
    response = await client.post("/reports/", json=VALID_REPORT_PAYLOAD, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["report_code"].startswith("PTH-")
    assert body["status"] == "REPORTED"
    assert body["status_history"][0]["status"] == "REPORTED"


async def test_create_report_with_ai_analysis_stores_it(client: AsyncClient, auth_headers):
    payload = {
        **VALID_REPORT_PAYLOAD,
        "ai_analysis": {
            "detected": True,
            "hazard_type": "POTHOLE",
            "confidence": 0.94,
            "severity": "HIGH",
            "bounding_box": {"x": 0.3, "y": 0.4, "width": 0.2, "height": 0.2},
            "processing_time_ms": 1500,
            "model_version": "mock-v1",
        },
    }
    response = await client.post("/reports/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["ai_analysis"]["confidence"] == 0.94
    assert body["ai_analysis"]["model_version"] == "mock-v1"


async def test_client_cannot_set_privileged_fields(client: AsyncClient, auth_headers):
    """`ReportCreateRequest` has no such fields — Pydantic silently ignores
    unknown extras rather than 422ing, so this proves the *response* never
    reflects them back, i.e. they were never applied."""
    payload = {
        **VALID_REPORT_PAYLOAD,
        "status": "RESOLVED",
        "verified_by_admin": True,
        "municipality_status": "REPAIR_SCHEDULED",
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "report_code": "PTH-9999",
    }
    response = await client.post("/reports/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "REPORTED"  # not RESOLVED, no matter what the client sent
    assert body["report_code"] != "PTH-9999"  # server-generated, ignored the client's requested code


async def test_my_reports_lists_only_the_current_users_reports(client: AsyncClient, auth_headers):
    await client.post("/reports/", json=VALID_REPORT_PAYLOAD, headers=auth_headers)
    response = await client.get("/reports/me", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert all("report_code" in item for item in body["items"])


async def test_get_report_by_id_returns_full_detail(client: AsyncClient, auth_headers):
    create_response = await client.post("/reports/", json=VALID_REPORT_PAYLOAD, headers=auth_headers)
    report_id = create_response.json()["id"]

    response = await client.get(f"/reports/{report_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["location_text"] == "Test Road, Chennai"


async def test_get_report_by_id_is_scoped_to_the_owner(client: AsyncClient, auth_headers, client_second_user):
    create_response = await client.post("/reports/", json=VALID_REPORT_PAYLOAD, headers=auth_headers)
    report_id = create_response.json()["id"]

    other_headers = {"Authorization": f"Bearer {client_second_user['access_token']}"}
    response = await client.get(f"/reports/{report_id}", headers=other_headers)
    assert response.status_code == 404
