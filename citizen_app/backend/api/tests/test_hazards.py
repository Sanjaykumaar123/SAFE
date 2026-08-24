"""Proves the PostGIS radius query actually filters by distance server-side
(section 27/43) rather than returning everything for the app to filter."""
from httpx import AsyncClient


async def test_nearby_returns_hazards_within_radius_only(client: AsyncClient, seeded_hazard):
    response = await client.get("/hazards/nearby", params={"latitude": 13.0827, "longitude": 80.2707, "radius": 10000})
    assert response.status_code == 200
    body = response.json()
    ids = [item["id"] for item in body["items"]]
    assert str(seeded_hazard["near"].id) in ids
    assert str(seeded_hazard["far"].id) not in ids, "a hazard 450km away must never appear in a 10km radius search"


async def test_nearby_result_includes_distance_sorted_ascending(client: AsyncClient, seeded_hazard):
    response = await client.get("/hazards/nearby", params={"latitude": 13.0827, "longitude": 80.2707, "radius": 50000})
    body = response.json()
    distances = [item["distance_meters"] for item in body["items"]]
    assert distances == sorted(distances)


async def test_nearby_zero_radius_excludes_a_hazard_a_few_km_away(client: AsyncClient, seeded_hazard):
    response = await client.get("/hazards/nearby", params={"latitude": 13.0827, "longitude": 80.2707, "radius": 100})
    body = response.json()
    assert body["items"] == []


async def test_get_hazard_detail_returns_404_for_unknown_id(client: AsyncClient, seeded_hazard):
    response = await client.get("/hazards/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


async def test_get_hazard_detail_returns_friendly_verification_copy(client: AsyncClient, seeded_hazard):
    response = await client.get(f"/hazards/{seeded_hazard['near'].id}")
    assert response.status_code == 200
    body = response.json()
    # Never leak backend/fleet/admin language to citizens (section 46).
    assert "fleet" not in (body["verification_note"] or "").lower()
    assert "postgis" not in (body["verification_note"] or "").lower()
