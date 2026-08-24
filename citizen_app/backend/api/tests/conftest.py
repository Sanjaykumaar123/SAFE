"""
Integration test fixtures. Runs against a real Postgres+PostGIS database
(`safepath_test`, same docker-compose instance as dev — see
docker-compose.yml) — not sqlite, not mocks, because the whole point of
these tests is proving the PostGIS-backed queries actually work.

Each test function gets its own async engine (bound to that test's own
event loop — asyncpg connections aren't safe to share across event loops,
which is exactly what a module-level engine would do under pytest-asyncio's
default function-scoped loops) and a clean schema: `create_all` before,
`drop_all` after. The app's `get_db` dependency is overridden to use this
per-test session instead of the app's own global engine.
"""
import os
import uuid
from datetime import datetime, timezone

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://safepath:safepath@localhost:5433/safepath_test")
os.environ.setdefault("DATABASE_URL_SYNC", "postgresql+psycopg://safepath:safepath@localhost:5433/safepath_test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.geo import make_point_wkt  # noqa: E402
from app.models.hazard import Hazard  # noqa: E402
from app.models.enums import HazardSource, HazardStatus, HazardType, Severity  # noqa: E402

TEST_DATABASE_URL = os.environ["DATABASE_URL"]


@pytest_asyncio.fixture
async def db_session_factory():
    """Fresh engine per test, bound to this test's event loop; schema is
    created before the test and dropped after."""
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    yield session_factory

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session_factory):
    async def _get_db_override():
        async with db_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api") as ac:
        yield ac
    app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient):
    payload = {
        "full_name": "Test Citizen",
        "email": f"test.{uuid.uuid4().hex[:8]}@example.com",
        "phone": f"+9198{uuid.uuid4().int % 10**8:08d}",
        "password": "TestPass@123",
        "city": "Chennai",
        "accepted_terms": True,
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    return {"payload": payload, "user": body["user"], "access_token": body["tokens"]["access_token"], "refresh_token": body["tokens"]["refresh_token"]}


@pytest_asyncio.fixture
async def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest_asyncio.fixture
async def client_second_user(client: AsyncClient):
    """A second, distinct registered user — for tests proving one citizen
    can't read/act on another citizen's data."""
    payload = {
        "full_name": "Second Citizen",
        "email": f"second.{uuid.uuid4().hex[:8]}@example.com",
        "phone": f"+9197{uuid.uuid4().int % 10**8:08d}",
        "password": "TestPass@123",
        "city": "Chennai",
        "accepted_terms": True,
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    return {"payload": payload, "user": body["user"], "access_token": body["tokens"]["access_token"]}


@pytest_asyncio.fixture
async def seeded_hazard(db_session_factory):
    async with db_session_factory() as db:
        city = City(name="Chennai", state="Tamil Nadu", center_latitude=13.0827, center_longitude=80.2707)
        db.add(city)
        await db.flush()

        hazard = Hazard(
            type=HazardType.POTHOLE,
            latitude=13.0604,
            longitude=80.2496,
            location=make_point_wkt(13.0604, 80.2496),
            location_text="Anna Salai, near Gemini Flyover",
            road_name="Anna Salai",
            severity=Severity.HIGH,
            status=HazardStatus.ACTIVE,
            ai_confidence=0.91,
            source=HazardSource.CITIZEN_REPORT,
            city_id=city.id,
            last_observed_at=datetime.now(timezone.utc),
        )
        db.add(hazard)

        far_hazard = Hazard(
            type=HazardType.POTHOLE,
            latitude=9.9252,
            longitude=78.1198,  # Madurai — ~450km from Chennai, must never show up in a Chennai radius search
            location=make_point_wkt(9.9252, 78.1198),
            location_text="Test Road, Madurai",
            severity=Severity.LOW,
            status=HazardStatus.ACTIVE,
            source=HazardSource.CITIZEN_REPORT,
            last_observed_at=datetime.now(timezone.utc),
        )
        db.add(far_hazard)
        await db.commit()
        await db.refresh(hazard)
        await db.refresh(far_hazard)
        return {"near": hazard, "far": far_hazard, "city_id": city.id}
