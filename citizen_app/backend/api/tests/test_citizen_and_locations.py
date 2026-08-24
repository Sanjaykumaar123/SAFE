"""Home dashboard (single optimized payload, section 42), saved locations
CRUD, and notification read/unread behavior."""
from httpx import AsyncClient


async def test_home_dashboard_returns_one_payload_with_everything(client: AsyncClient, auth_headers, seeded_hazard):
    response = await client.get("/citizen/home", params={"latitude": 13.0827, "longitude": 80.2707, "radius": 10000}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    for key in ("greeting", "user_name", "city_name", "stats", "nearby_hazards", "map_markers"):
        assert key in body
    assert body["stats"]["nearby_count"] >= 1


async def test_home_dashboard_requires_auth(client: AsyncClient):
    response = await client.get("/citizen/home", params={"latitude": 13.0827, "longitude": 80.2707})
    assert response.status_code == 401


async def test_saved_locations_crud(client: AsyncClient, auth_headers):
    create_response = await client.post(
        "/locations/",
        json={"label": "HOME", "address": "12 Anna Nagar, Chennai", "latitude": 13.085, "longitude": 80.21},
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    location_id = create_response.json()["id"]

    list_response = await client.get("/locations/", headers=auth_headers)
    assert any(loc["id"] == location_id for loc in list_response.json())

    delete_response = await client.delete(f"/locations/{location_id}", headers=auth_headers)
    assert delete_response.status_code == 204

    list_after_delete = await client.get("/locations/", headers=auth_headers)
    assert all(loc["id"] != location_id for loc in list_after_delete.json())


async def test_saved_locations_are_scoped_to_the_owner(client: AsyncClient, auth_headers, client_second_user):
    create_response = await client.post(
        "/locations/",
        json={"label": "WORK", "address": "Some Office", "latitude": 13.0, "longitude": 80.2},
        headers=auth_headers,
    )
    location_id = create_response.json()["id"]

    other_headers = {"Authorization": f"Bearer {client_second_user['access_token']}"}
    delete_response = await client.delete(f"/locations/{location_id}", headers=other_headers)
    assert delete_response.status_code == 404


async def test_notifications_list_and_unread_count(client: AsyncClient, auth_headers):
    response = await client.get("/notifications/", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "items" in body and "unread_count" in body
