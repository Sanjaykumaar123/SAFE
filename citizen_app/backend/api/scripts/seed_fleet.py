"""
Seeds Fleet Operator app demo data on top of whatever `seed.py`/
`seed_municipality.py` already put in the database (safe to run before,
after, or on its own — everything here upserts by natural key).

Creates:
  - One fleet operator login (OP-0042 / Karthik Selvam) assigned to one
    vehicle (TN 38 AB 1234) in Chennai South.
  - Two completed, validated collection sessions (yesterday + two days ago)
    with matching approved earning records, so the Earnings screen has
    non-zero "this week"/"this month" totals on first launch.
  - Two fleet observations attached to the PTH-1029 demo hazard from
    `seed_municipality.py` (if present) using the new FK columns, so the
    §90 demo scenario's "backend finds PTH-1029 nearby" step has existing
    evidence to show alongside whatever the live app run adds.

Run:
    cd backend/api && ../.venv/Scripts/python scripts/seed_fleet.py   (Windows)
    cd backend/api && ./.venv/bin/python scripts/seed_fleet.py        (macOS/Linux)
"""
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.collection_session import CollectionSession  # noqa: E402
from app.models.earning_record import EarningRecord  # noqa: E402
from app.models.enums import CollectionSessionStatus, EarningStatus, FleetOperatorRole, ObservationState, Severity, VehicleStatus  # noqa: E402
from app.models.fleet_observation import FleetObservation  # noqa: E402
from app.models.fleet_operator_profile import FleetOperatorProfile  # noqa: E402
from app.models.geo import make_point_wkt  # noqa: E402
from app.models.hazard import Hazard  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.vehicle import Vehicle  # noqa: E402
from app.services.fleet.earnings import compute_earnings  # noqa: E402

OPERATOR_EMAIL = "operator@fleet.safepath.ai"
OPERATOR_PASSWORD = "SafePath@123"
OPERATOR_CODE = "OP-0042"
VEHICLE_REG = "TN 38 AB 1234"

now = datetime.now(timezone.utc)


def days_ago(d: int, hours_offset: int = 0) -> datetime:
    return now - timedelta(days=d, hours=hours_offset)


async def get_or_create_city(db) -> City:
    result = await db.execute(select(City).where(City.name == "Chennai"))
    city = result.scalar_one_or_none()
    if city is None:
        city = City(name="Chennai", state="Tamil Nadu", country="India", center_latitude=13.0827, center_longitude=80.2707, code="CHN")
        db.add(city)
        await db.flush()
        print("Created city: Chennai (CHN)")
    return city


async def seed_session(db, operator: FleetOperatorProfile, vehicle: Vehicle, city: City, day_offset: int, distance_km: float, observation_count: int) -> None:
    client_session_id = f"seed-session-{day_offset}"
    existing = await db.execute(select(CollectionSession).where(CollectionSession.client_session_id == client_session_id))
    if existing.scalar_one_or_none() is not None:
        return

    start = days_ago(day_offset, hours_offset=2)
    end = start + timedelta(hours=2, minutes=15)
    valid_count = max(1, observation_count - 1)
    session = CollectionSession(
        operator_id=operator.id,
        vehicle_id=vehicle.id,
        city_id=city.id,
        zone_name=operator.zone_name,
        status=CollectionSessionStatus.VALIDATED.value,
        start_time=start,
        end_time=end,
        start_latitude=13.0067,
        start_longitude=80.2206,
        end_latitude=13.0355,
        end_longitude=80.2470,
        reported_distance_km=distance_km,
        validated_distance_km=distance_km,
        observation_count=observation_count,
        valid_observation_count=valid_count,
        data_quality_score=94.0,
        client_session_id=client_session_id,
    )
    db.add(session)
    await db.flush()

    breakdown = compute_earnings(session)
    db.add(
        EarningRecord(
            operator_id=operator.id,
            session_id=session.id,
            status=EarningStatus.APPROVED.value,
            coverage_amount=breakdown.coverage_amount,
            observation_amount=breakdown.observation_amount,
            quality_bonus_amount=breakdown.quality_bonus_amount,
            total_amount=breakdown.total_amount,
            computed_at=end,
        )
    )
    print(f"Created session {client_session_id}: {distance_km}km, Rs.{breakdown.total_amount}")


async def seed_pth1029_observations(db, operator: FleetOperatorProfile, vehicle: Vehicle) -> None:
    hazard_result = await db.execute(select(Hazard).where(Hazard.hazard_code == "PTH-1029"))
    hazard = hazard_result.scalar_one_or_none()
    if hazard is None:
        print("PTH-1029 not found — run scripts/seed_municipality.py first for the full demo. Skipping fleet observation seed for it.")
        return

    for i, (mins_ago, confidence) in enumerate([(90, 0.92), (45, 0.95)]):
        client_observation_id = f"seed-pth1029-obs-{i}"
        existing = await db.execute(select(FleetObservation.id).where(FleetObservation.client_observation_id == client_observation_id))
        if existing.scalar_one_or_none() is not None:
            continue
        observed_at = now - timedelta(minutes=mins_ago)
        db.add(
            FleetObservation(
                hazard_id=hazard.id,
                vehicle_id=str(vehicle.id),
                operator_id=operator.operator_code,
                observed_at=observed_at,
                confidence=confidence,
                location=make_point_wkt(hazard.latitude, hazard.longitude),
                latitude=hazard.latitude,
                longitude=hazard.longitude,
                road_id=hazard.road_id,
                observation_state=ObservationState.DETECTED.value,
                severity=Severity.HIGH.value,
                image_url=f"https://picsum.photos/seed/{client_observation_id}/600/450",
                data_quality="HIGH",
                session_id=None,
                vehicle_ref_id=vehicle.id,
                operator_ref_id=operator.id,
                client_observation_id=client_observation_id,
                hazard_type="POTHOLE",
                model_name="YOLO26n",
                model_version="safepath-pothole-v1",
                gps_accuracy=5.0,
            )
        )
    print(f"Seeded fleet observations for PTH-1029 (hazard id: {hazard.id})")


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        city = await get_or_create_city(db)

        user_result = await db.execute(select(User).where(User.email == OPERATOR_EMAIL))
        user = user_result.scalar_one_or_none()
        if user is None:
            user = User(
                email=OPERATOR_EMAIL,
                phone="+919840088888",
                full_name="Karthik Selvam",
                password_hash=hash_password(OPERATOR_PASSWORD),
                role=UserRole.FLEET_OPERATOR,
            )
            db.add(user)
            await db.flush()
            print(f"Created fleet operator user: {OPERATOR_EMAIL} / {OPERATOR_PASSWORD}")

        vehicle_result = await db.execute(select(Vehicle).where(Vehicle.registration_number == VEHICLE_REG))
        vehicle = vehicle_result.scalar_one_or_none()
        if vehicle is None:
            vehicle = Vehicle(registration_number=VEHICLE_REG, city_id=city.id, status=VehicleStatus.ACTIVE.value, vehicle_type="SEDAN")
            db.add(vehicle)
            await db.flush()
            print(f"Created vehicle: {VEHICLE_REG}")

        profile_result = await db.execute(select(FleetOperatorProfile).where(FleetOperatorProfile.user_id == user.id))
        profile = profile_result.scalar_one_or_none()
        if profile is None:
            profile = FleetOperatorProfile(
                user_id=user.id,
                operator_code=OPERATOR_CODE,
                city_id=city.id,
                zone_name="Chennai South",
                assigned_vehicle_id=vehicle.id,
                operator_role=FleetOperatorRole.DRIVER.value,
                is_active=True,
            )
            db.add(profile)
            await db.flush()
            print(f"Created fleet operator profile: {OPERATOR_CODE} -> {VEHICLE_REG} (Chennai South)")

        await seed_session(db, profile, vehicle, city, day_offset=1, distance_km=42.8, observation_count=21)
        await seed_session(db, profile, vehicle, city, day_offset=2, distance_km=31.5, observation_count=14)
        await seed_pth1029_observations(db, profile, vehicle)

        await db.commit()
        print(f"Fleet demo data ready. Login with operator code {OPERATOR_CODE} and password {OPERATOR_PASSWORD}.")


if __name__ == "__main__":
    asyncio.run(seed())
