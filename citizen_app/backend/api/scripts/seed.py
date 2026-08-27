"""
Seeds realistic Chennai demo data (section 41) — a demo citizen account plus
a handful of hazards spread across real Chennai roads/coordinates, so the
whole app (map, home dashboard, hazard details, nearby search) has
something real to show without waiting on live citizen reports.

Run:
    cd backend/api && ../.venv/Scripts/python scripts/seed.py   (Windows)
    cd backend/api && ./.venv/bin/python scripts/seed.py         (macOS/Linux)

Safe to re-run — it upserts by natural key (email / report_code) instead of
blindly inserting duplicates.
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
from app.models.citizen_profile import CitizenProfile  # noqa: E402
from app.models.enums import HazardSource, HazardStatus, HazardType, Severity  # noqa: E402
from app.models.geo import make_point_wkt  # noqa: E402
from app.models.hazard import Hazard  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.enums import NotificationType  # noqa: E402
from app.models.user import User  # noqa: E402

DEMO_USER_EMAIL = "demo.citizen@safepath.ai"
DEMO_USER_PASSWORD = "SafePath@123"

CHENNAI_CENTER = (13.0827, 80.2707)

# (report_code, type, road, location_text, lat, lon, severity, status, ai_confidence)
HAZARDS = [
    ("PTH-1029", HazardType.POTHOLE, "Velachery Main Road", "Velachery Main Road, near MRTS Station", 12.9784, 80.2205, Severity.HIGH, HazardStatus.ACTIVE, 0.94),
    ("PTH-1030", HazardType.FLOODING, "OMR", "OMR Toll Plaza, Sholinganallur", 12.9010, 80.2279, Severity.MEDIUM, HazardStatus.VERIFIED, 0.87),
    ("PTH-1031", HazardType.POTHOLE, "GST Road", "GST Road, near Guindy Industrial Estate", 13.0100, 80.2121, Severity.CRITICAL, HazardStatus.ACTIVE, 0.96),
    ("PTH-1032", HazardType.ROAD_DAMAGE, "Anna Salai", "Anna Salai, near Gemini Flyover", 13.0604, 80.2496, Severity.HIGH, HazardStatus.UNDER_REVIEW, 0.91),
    ("PTH-1033", HazardType.POTHOLE, "ECR", "East Coast Road, near Thiruvanmiyur", 12.9829, 80.2594, Severity.MEDIUM, HazardStatus.REPORTED, 0.78),
    ("PTH-1034", HazardType.DEBRIS, "Mount Road", "Mount Road, near LIC Building", 13.0569, 80.2508, Severity.LOW, HazardStatus.UNDER_REPAIR, 0.66),
    ("PTH-1035", HazardType.BROKEN_PAVEMENT, "T. Nagar", "Pondy Bazaar, T. Nagar", 13.0418, 80.2341, Severity.MEDIUM, HazardStatus.ACTIVE, 0.83),
    ("PTH-1036", HazardType.POTHOLE, "Kilpauk", "Poonamallee High Road, Kilpauk", 13.0827, 80.2437, Severity.HIGH, HazardStatus.RESOLVED, 0.90),
    ("PTH-1037", HazardType.MISSING_MANHOLE, "Luz Church Road", "Luz Church Road, Mylapore", 13.0336, 80.2678, Severity.CRITICAL, HazardStatus.ACTIVE, 0.97),
    ("PTH-1038", HazardType.ROAD_DAMAGE, "LB Road", "Lattice Bridge Road, Adyar", 13.0067, 80.2571, Severity.HIGH, HazardStatus.VERIFIED, 0.92),
    ("PTH-1039", HazardType.FLOODING, "Sterling Road", "Sterling Road Subway, Nungambakkam", 13.0722, 80.2394, Severity.CRITICAL, HazardStatus.ACTIVE, 0.96),
    ("PTH-1040", HazardType.POTHOLE, "100 Feet Road", "100 Feet Road, Koyambedu", 13.0694, 80.1948, Severity.HIGH, HazardStatus.UNDER_REVIEW, 0.90),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        city_result = await db.execute(select(City).where(City.name == "Chennai"))
        city = city_result.scalar_one_or_none()
        if city is None:
            city = City(name="Chennai", state="Tamil Nadu", country="India", center_latitude=CHENNAI_CENTER[0], center_longitude=CHENNAI_CENTER[1])
            db.add(city)
            await db.flush()
            print(f"Created city: {city.name}")

        user_result = await db.execute(select(User).where(User.email == DEMO_USER_EMAIL))
        user = user_result.scalar_one_or_none()
        if user is None:
            user = User(
                email=DEMO_USER_EMAIL,
                phone="+919840000000",
                full_name="Arun Kumar",
                password_hash=hash_password(DEMO_USER_PASSWORD),
            )
            db.add(user)
            await db.flush()
            db.add(CitizenProfile(user_id=user.id, city_id=city.id))
            print(f"Created demo user: {DEMO_USER_EMAIL} / {DEMO_USER_PASSWORD}")

        created_count = 0
        for code, htype, road, location_text, lat, lon, severity, hstatus, confidence in HAZARDS:
            existing = await db.execute(select(Hazard).where(Hazard.location_text == location_text))
            if existing.scalar_one_or_none() is not None:
                continue
            hazard = Hazard(
                type=htype,
                latitude=lat,
                longitude=lon,
                location=make_point_wkt(lat, lon),
                location_text=location_text,
                road_name=road,
                severity=severity,
                status=hstatus,
                ai_confidence=confidence,
                source=HazardSource.CITIZEN_REPORT,
                description=f"{htype.value.replace('_', ' ').title()} reported on {road}.",
                city_id=city.id,
                verified_by_admin=hstatus in (HazardStatus.VERIFIED, HazardStatus.ACTIVE, HazardStatus.RESOLVED),
                resolved_at=datetime.now(timezone.utc) if hstatus == HazardStatus.RESOLVED else None,
                last_observed_at=datetime.now(timezone.utc) - timedelta(minutes=15),
            )
            db.add(hazard)
            created_count += 1

        if created_count and user:
            db.add(
                Notification(
                    user_id=user.id,
                    type=NotificationType.CRITICAL_HAZARD,
                    title="Critical hazard nearby",
                    body="A critical pothole was reported 800m from your saved home location.",
                    is_read=False,
                )
            )
            db.add(
                Notification(
                    user_id=user.id,
                    type=NotificationType.SYSTEM,
                    title="Welcome to SafePath AI",
                    body="Thanks for helping make Chennai's roads safer. Report a hazard to get started.",
                    is_read=True,
                )
            )

        await db.commit()
        print(f"Seeded {created_count} new hazard(s). Demo data ready.")


if __name__ == "__main__":
    asyncio.run(seed())
