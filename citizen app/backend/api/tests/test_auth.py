"""Register -> login -> me -> refresh -> logout, plus the edge cases that
matter for a citizen-facing auth flow."""
from httpx import AsyncClient


async def test_register_returns_user_and_tokens(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={
            "full_name": "Priya Sharma",
            "email": "priya@example.com",
            "phone": "+919876500001",
            "password": "SafePath@123",
            "city": "Chennai",
            "accepted_terms": True,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "priya@example.com"
    assert body["user"]["city"] == "Chennai"
    assert body["tokens"]["access_token"]
    assert body["tokens"]["refresh_token"]


async def test_register_rejects_duplicate_email(client: AsyncClient, registered_user):
    response = await client.post(
        "/auth/register",
        json={**registered_user["payload"], "phone": "+919876500099"},
    )
    assert response.status_code == 409


async def test_register_requires_accepted_terms(client: AsyncClient):
    response = await client.post(
        "/auth/register",
        json={
            "full_name": "No Terms",
            "email": "noterms@example.com",
            "phone": "+919876500002",
            "password": "SafePath@123",
            "city": "Chennai",
            "accepted_terms": False,
        },
    )
    assert response.status_code == 422


async def test_login_with_correct_password_succeeds(client: AsyncClient, registered_user):
    response = await client.post(
        "/auth/login",
        json={"identifier": registered_user["payload"]["email"], "password": registered_user["payload"]["password"]},
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == registered_user["payload"]["email"]


async def test_login_with_wrong_password_is_rejected(client: AsyncClient, registered_user):
    response = await client.post(
        "/auth/login",
        json={"identifier": registered_user["payload"]["email"], "password": "WrongPassword123"},
    )
    assert response.status_code == 401


async def test_me_requires_a_valid_token(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_me_returns_current_user(client: AsyncClient, auth_headers, registered_user):
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == registered_user["payload"]["email"]


async def test_refresh_rotates_the_token_and_old_one_stops_working(client: AsyncClient, registered_user):
    first_refresh = registered_user["refresh_token"]

    response = await client.post("/auth/refresh", json={"refresh_token": first_refresh})
    assert response.status_code == 200
    new_tokens = response.json()
    assert new_tokens["access_token"] != registered_user["access_token"]

    reuse_response = await client.post("/auth/refresh", json={"refresh_token": first_refresh})
    assert reuse_response.status_code == 401


async def test_logout_revokes_the_refresh_token(client: AsyncClient, registered_user):
    logout_response = await client.post("/auth/logout", json={"refresh_token": registered_user["refresh_token"]})
    assert logout_response.status_code == 204

    refresh_response = await client.post("/auth/refresh", json={"refresh_token": registered_user["refresh_token"]})
    assert refresh_response.status_code == 401
