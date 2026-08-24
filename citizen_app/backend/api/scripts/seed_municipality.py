"""
Seeds Municipality app demo data on top of whatever the citizen `seed.py`
already put in the database (safe to run either before or after it, or on
its own — everything here upserts by natural key).

Creates:
  - Three cities (Chennai/CHN primary, Coimbatore/CBE, Madurai/MDU) so the
    "Chennai officer must not read Coimbatore data" test (section 85) has
    a second city to be denied.
  - Six Chennai wards + a handful of named Roads.
  - One municipality (MUN-CHN, Chennai-only access) and one officer login.
  - ~16 Chennai hazards across those roads/wards/severities/statuses,
    including the exact PTH-1029 / Velachery Main Road demo hazard from
    product-spec section 65/86, seeded at the point in its lifecycle where
    a live demo takes over (ACTIVE, citizen + AI evidence, 5 fleet
    observations already in -> UNDER_VERIFICATION) so the assign-repair ->
    inspect -> resolve loop can be walked through end-to-end in the app.
  - A few repairs pre-seeded at different stages (assigned / in progress /
    ready for inspection / resolved) so every Repair Operations tab has
    something to show without the demo user having to populate it first.

This is a realistic-sized demo dataset, not the literal "327 active hazards"
example numbers from the product spec — those were illustrative; per
section 84, once the app is in real API mode the numbers it shows must be
whatever the real (seeded) data produces, never hardcoded.

Run:
    cd backend/api && ../.venv/Scripts/python scripts/seed_municipality.py   (Windows)
    cd backend/api && ./.venv/bin/python scripts/seed_municipality.py        (macOS/Linux)
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.ai_analysis import AIAnalysis  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.citizen_profile import CitizenProfile  # noqa: E402
from app.models.citizen_report import CitizenReport  # noqa: E402
from app.models.enums import (  # noqa: E402
    AIProvider,
    HazardSource,
    HazardStatus,
    HazardType,
    MunicipalityOfficerRole,
    RepairPriority,
    RepairStatus,
    Severity,
)
from app.models.fleet_observation import FleetObservation  # noqa: E402
from app.models.geo import make_point_wkt  # noqa: E402
from app.models.hazard import Hazard  # noqa: E402
from app.models.municipality import Municipality, MunicipalityCityAccess  # noqa: E402
from app.models.municipality_action import MunicipalityAction  # noqa: E402
from app.models.municipality_profile import MunicipalityProfile  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.enums import NotificationType  # noqa: E402
from app.models.report_media import ReportMedia  # noqa: E402
from app.models.repair import Repair  # noqa: E402
from app.models.repair_progress import RepairProgress  # noqa: E402
from app.models.road import Road  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.ward import Ward  # noqa: E402
from app.services.report_code import PREFIX as REPORT_CODE_PREFIX  # noqa: E402

OFFICER_EMAIL = "officer@chennai.gov.in"
OFFICER_PASSWORD = "SafePath@123"

CITIES = [
    ("Chennai", "CHN", "Tamil Nadu", 13.0827, 80.2707),
    ("Coimbatore", "CBE", "Tamil Nadu", 11.0168, 76.9558),
    ("Madurai", "MDU", "Tamil Nadu", 9.9252, 78.1198),
]

WARDS = [("W1", "Ward 1 - Adyar"), ("W2", "Ward 2 - Velachery"), ("W3", "Ward 3 - T. Nagar"), ("W4", "Ward 4 - Guindy"), ("W5", "Ward 5 - Anna Nagar"), ("W6", "Ward 6 - Sholinganallur")]

ROADS = ["Velachery Main Road", "GST Road", "OMR", "Anna Salai", "ECR", "Mount Road", "Poonamallee High Road", "Pondy Bazaar Road"]

now = datetime.now(timezone.utc)


def minutes_ago(m: int) -> datetime:
    return now - timedelta(minutes=m)


async def get_or_create_city(db, name, code, state, lat, lon) -> City:
    result = await db.execute(select(City).where(City.name == name))
    city = result.scalar_one_or_none()
    if city is None:
        city = City(name=name, state=state, country="India", center_latitude=lat, center_longitude=lon, code=code)
        db.add(city)
        await db.flush()
        print(f"Created city: {name} ({code})")
    elif city.code is None:
        city.code = code
    return city


async def get_or_create_ward(db, city: City, code: str, name: str) -> Ward:
    result = await db.execute(select(Ward).where(Ward.city_id == city.id, Ward.code == code))
    ward = result.scalar_one_or_none()
    if ward is None:
        ward = Ward(city_id=city.id, code=code, name=name)
        db.add(ward)
        await db.flush()
    return ward


async def get_or_create_road(db, city: City, name: str) -> Road:
    result = await db.execute(select(Road).where(Road.city_id == city.id, Road.name == name))
    road = result.scalar_one_or_none()
    if road is None:
        road = Road(city_id=city.id, name=name)
        db.add(road)
        await db.flush()
    return road


async def unique_hazard_code(db, candidate_pool: list[str]) -> str:
    for code in candidate_pool:
        existing = await db.execute(select(Hazard.id).where(Hazard.hazard_code == code))
        if existing.scalar_one_or_none() is None:
            return code
    return f"PTH-{random.randint(10000, 99999)}"


async def unique_repair_code(db, candidate: str) -> str:
    existing = await db.execute(select(Repair.id).where(Repair.repair_code == candidate))
    if existing.scalar_one_or_none() is None:
        return candidate
    return f"R-{random.randint(10000, 99999)}"


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        cities = {}
        for name, code, state, lat, lon in CITIES:
            cities[code] = await get_or_create_city(db, name, code, state, lat, lon)
        chennai = cities["CHN"]

        wards = [await get_or_create_ward(db, chennai, code, name) for code, name in WARDS]
        roads = {name: await get_or_create_road(db, chennai, name) for name in ROADS}

        # --- Municipality + officer ---
        muni_result = await db.execute(select(Municipality).where(Municipality.code == "MUN-CHN"))
        municipality = muni_result.scalar_one_or_none()
        if municipality is None:
            municipality = Municipality(code="MUN-CHN", name="Greater Chennai Corporation", primary_city_id=chennai.id)
            db.add(municipality)
            await db.flush()
            db.add(MunicipalityCityAccess(municipality_id=municipality.id, city_id=chennai.id))
            print("Created municipality: MUN-CHN (Chennai-only access, by design — see section 85's cross-city test)")

        officer_result = await db.execute(select(User).where(User.email == OFFICER_EMAIL))
        officer = officer_result.scalar_one_or_none()
        if officer is None:
            officer = User(email=OFFICER_EMAIL, phone="+919840011111", full_name="Priya Raghavan", password_hash=hash_password(OFFICER_PASSWORD), role=UserRole.MUNICIPALITY)
            db.add(officer)
            await db.flush()
            db.add(MunicipalityProfile(user_id=officer.id, municipality_id=municipality.id, officer_role=MunicipalityOfficerRole.MUNICIPALITY_OFFICER.value, default_city_id=chennai.id, is_active=True))
            print(f"Created municipality officer: {OFFICER_EMAIL} / {OFFICER_PASSWORD} (municipality ID: MUN-CHN)")

        # A citizen to attach citizen_reports/notifications to, independent
        # of whether backend/api/scripts/seed.py has been run.
        citizen_result = await db.execute(select(User).where(User.email == "demo.citizen@safepath.ai"))
        citizen = citizen_result.scalar_one_or_none()
        if citizen is None:
            citizen = User(email="demo.citizen@safepath.ai", phone="+919840000000", full_name="Arun Kumar", password_hash=hash_password("SafePath@123"))
            db.add(citizen)
            await db.flush()
            db.add(CitizenProfile(user_id=citizen.id, city_id=chennai.id))

        # --- PTH-1029: the exact product-spec demo hazard (sections 65/86) ---
        pth1029 = await _seed_pth_1029(db, chennai, wards[1], roads["Velachery Main Road"], citizen)

        # --- Supporting hazards across roads/wards/severities/statuses ---
        await _seed_supporting_hazards(db, chennai, wards, roads, citizen)

        # --- A repair already at each later stage, so every tab in Repair
        # Operations has content on first launch ---
        await _seed_sample_repairs(db, chennai, municipality, officer, wards, roads)

        # --- Notifications for the officer ---
        db.add(Notification(user_id=officer.id, type=NotificationType.CRITICAL_HAZARD, title="Critical pothole detected on GST Road", body="AI confidence 96% — recommend inspection within 4 hours.", is_read=False))
        db.add(Notification(user_id=officer.id, type=NotificationType.SYSTEM, title="Welcome to SafePath Municipality", body="Chennai road intelligence is ready. Start with today's priority roads.", is_read=True))

        await db.commit()
        print(f"Municipality demo data ready. PTH-1029 hazard id: {pth1029.id}")


async def _seed_pth_1029(db, city: City, ward: Ward, road: Road, citizen: User) -> Hazard:
    location_text = "Velachery Main Road, near MRTS Station"
    result = await db.execute(select(Hazard).where(Hazard.location_text == location_text))
    hazard = result.scalar_one_or_none()
    lat, lon = 12.9784, 80.2205

    if hazard is None:
        hazard = Hazard(
            type=HazardType.POTHOLE, latitude=lat, longitude=lon, location=make_point_wkt(lat, lon),
            location_text=location_text, road_name=road.name, road_id=road.id, severity=Severity.HIGH,
            status=HazardStatus.ACTIVE, ai_confidence=0.94, source=HazardSource.CITIZEN_REPORT,
            description="Pothole reported on Velachery Main Road.", city_id=city.id, ward_id=ward.id,
            hazard_code="PTH-1029", verified_by_admin=True, last_observed_at=minutes_ago(14),
        )
        db.add(hazard)
        await db.flush()
    else:
        hazard.hazard_code = hazard.hazard_code or "PTH-1029"
        hazard.ward_id = hazard.ward_id or ward.id
        hazard.road_id = hazard.road_id or road.id
        hazard.status = HazardStatus.ACTIVE

    # Citizen evidence
    existing_report = await db.execute(select(CitizenReport.id).where(CitizenReport.hazard_id == hazard.id))
    if existing_report.scalar_one_or_none() is None:
        analysis = AIAnalysis(
            provider=AIProvider.MOCK, image_url="https://picsum.photos/seed/pth1029/800/600", detected=True,
            hazard_type=HazardType.POTHOLE, confidence=0.94, severity=Severity.HIGH,
            bounding_box={"x": 0.32, "y": 0.41, "width": 0.28, "height": 0.22}, processing_time_ms=420, model_version="mock-v1",
        )
        db.add(analysis)
        await db.flush()

        report = CitizenReport(
            report_code=f"{REPORT_CODE_PREFIX}-1029", user_id=citizen.id, hazard_id=hazard.id,
            hazard_type=HazardType.POTHOLE, severity=Severity.HIGH, status=HazardStatus.ACTIVE,
            description="Large pothole near the MRTS station entrance, growing after the last rain.",
            latitude=lat, longitude=lon, location=make_point_wkt(lat, lon), location_text=location_text, city_id=city.id,
            ai_analysis_id=analysis.id, client_timestamp=minutes_ago(180),
        )
        db.add(report)
        await db.flush()
        db.add(ReportMedia(report_id=report.id, url="https://picsum.photos/seed/pth1029/800/600"))

    # Fleet evidence — exactly the section 26/65 scenario: 2 detected, then
    # 3 clear, landing on UNDER_VERIFICATION when computed live.
    existing_obs = await db.execute(select(FleetObservation.id).where(FleetObservation.hazard_id == hazard.id))
    if existing_obs.scalar_one_or_none() is None:
        observations = [
            ("FLEET-01", 66, "DETECTED", 0.91),
            ("FLEET-02", 61, "DETECTED", 0.88),
            ("FLEET-03", 54, "CLEAR", 0.72),
            ("FLEET-04", 47, "CLEAR", 0.76),
            ("FLEET-05", 40, "CLEAR", 0.81),
        ]
        for vehicle_id, mins_ago, state, confidence in observations:
            jitter_lat, jitter_lon = lat + random.uniform(-0.0006, 0.0006), lon + random.uniform(-0.0006, 0.0006)
            db.add(
                FleetObservation(
                    hazard_id=hazard.id, vehicle_id=vehicle_id, observed_at=minutes_ago(mins_ago),
                    confidence=confidence, latitude=jitter_lat, longitude=jitter_lon,
                    location=make_point_wkt(jitter_lat, jitter_lon), road_id=road.id, operator_id="OP-CHN-04",
                    observation_state=state, severity=Severity.HIGH if state == "DETECTED" else None,
                    image_url=f"https://picsum.photos/seed/{vehicle_id}/600/450", data_quality="HIGH",
                )
            )

    existing_actions = await db.execute(select(MunicipalityAction.id).where(MunicipalityAction.hazard_id == hazard.id))
    if existing_actions.scalar_one_or_none() is None:
        db.add(MunicipalityAction(hazard_id=hazard.id, action_type="HAZARD_CREATED", notes="Citizen report received.", performed_by="System", from_status=None, to_status=HazardStatus.REPORTED.value, created_at=minutes_ago(180)))
        db.add(MunicipalityAction(hazard_id=hazard.id, action_type="CRITICAL_HAZARD", notes="AI confidence 94% — high severity pothole.", performed_by="System", from_status=HazardStatus.REPORTED.value, to_status=HazardStatus.ACTIVE.value, created_at=minutes_ago(170)))
        db.add(MunicipalityAction(hazard_id=hazard.id, action_type="FLEET_UPDATE", notes="5 fleet observations recorded — 2 detected, 3 clear.", performed_by="System", created_at=minutes_ago(40)))

    return hazard


async def _seed_supporting_hazards(db, city: City, wards: list[Ward], roads: dict[str, Road], citizen: User) -> None:
    templates = [
        (HazardType.POTHOLE, "OMR Toll Plaza, Sholinganallur", "OMR", 12.9010, 80.2279, Severity.CRITICAL, HazardStatus.ACTIVE, 0.96),
        (HazardType.ROAD_DAMAGE, "GST Road, near Guindy Industrial Estate", "GST Road", 13.0100, 80.2121, Severity.CRITICAL, HazardStatus.ACTIVE, 0.93),
        (HazardType.FLOODING, "Anna Salai, near Gemini Flyover", "Anna Salai", 13.0604, 80.2496, Severity.HIGH, HazardStatus.VERIFIED, 0.89),
        (HazardType.POTHOLE, "East Coast Road, near Thiruvanmiyur", "ECR", 12.9829, 80.2594, Severity.MEDIUM, HazardStatus.REPORTED, 0.78),
        (HazardType.DEBRIS, "Mount Road, near LIC Building", "Mount Road", 13.0569, 80.2508, Severity.LOW, HazardStatus.UNDER_REVIEW, 0.66),
        (HazardType.BROKEN_PAVEMENT, "Pondy Bazaar, T. Nagar", "Pondy Bazaar Road", 13.0418, 80.2341, Severity.MEDIUM, HazardStatus.ACTIVE, 0.83),
        (HazardType.POTHOLE, "Poonamallee High Road, Kilpauk", "Poonamallee High Road", 13.0827, 80.2437, Severity.HIGH, HazardStatus.RESOLVED, 0.90),
        (HazardType.POTHOLE, "GST Road, near Chrompet", "GST Road", 12.9516, 80.1462, Severity.HIGH, HazardStatus.RESOLVED, 0.92),
        (HazardType.ROAD_DAMAGE, "OMR, near Perungudi", "OMR", 12.9650, 80.2430, Severity.CRITICAL, HazardStatus.RESOLVED, 0.95),
        (HazardType.POTHOLE, "Velachery Main Road, near Phoenix Mall", "Velachery Main Road", 12.9910, 80.2180, Severity.MEDIUM, HazardStatus.ACTIVE, 0.80),
        (HazardType.BROKEN_PAVEMENT, "Anna Salai, near Spencer Plaza", "Anna Salai", 13.0530, 80.2610, Severity.LOW, HazardStatus.VERIFIED, 0.70),
        (HazardType.POTHOLE, "ECR, near Injambakkam", "ECR", 12.9430, 80.2470, Severity.HIGH, HazardStatus.ACTIVE, 0.87),
        (HazardType.DEBRIS, "Mount Road, near Anna Flyover", "Mount Road", 13.0600, 80.2530, Severity.MEDIUM, HazardStatus.REPORTED, 0.74),
        (HazardType.POTHOLE, "Pondy Bazaar, near Panagal Park", "Pondy Bazaar Road", 13.0400, 80.2330, Severity.CRITICAL, HazardStatus.ACTIVE, 0.91),
        (HazardType.ROAD_DAMAGE, "Poonamallee High Road, near Kilpauk Medical College", "Poonamallee High Road", 13.0850, 80.2450, Severity.MEDIUM, HazardStatus.UNDER_REVIEW, 0.77),
    ]

    for index, (htype, location_text, road_name, lat, lon, severity, hstatus, confidence) in enumerate(templates):
        existing = await db.execute(select(Hazard.id).where(Hazard.location_text == location_text))
        if existing.scalar_one_or_none() is not None:
            continue

        ward = wards[index % len(wards)]
        road = roads[road_name]
        hazard_code = await unique_hazard_code(db, [f"PTH-{1030 + index}"])

        # Chronology matters here: `created_at` must precede
        # `resolved_at`/`last_observed_at` or analytics' avg-resolution-time
        # query (resolved_at - created_at) goes negative. Pick the "created"
        # point first, then derive everything else as *more recent* than it.
        created_minutes_ago = random.randint(800, 4000)
        last_observed_minutes_ago = random.randint(5, min(240, created_minutes_ago - 1))
        resolved_minutes_ago = None
        if hstatus == HazardStatus.RESOLVED:
            resolved_today = index % 2 == 0
            upper_bound = min(300 if resolved_today else created_minutes_ago - 1, created_minutes_ago - 1)
            resolved_minutes_ago = random.randint(5, max(6, upper_bound))

        hazard = Hazard(
            type=htype, latitude=lat, longitude=lon, location=make_point_wkt(lat, lon), location_text=location_text,
            road_name=road_name, road_id=road.id, severity=severity, status=hstatus, ai_confidence=confidence,
            source=HazardSource.CITIZEN_REPORT if index % 3 else HazardSource.FLEET_OBSERVATION,
            description=f"{htype.value.replace('_', ' ').title()} reported on {road_name}.", city_id=city.id,
            ward_id=ward.id, hazard_code=hazard_code,
            verified_by_admin=hstatus in (HazardStatus.VERIFIED, HazardStatus.ACTIVE, HazardStatus.RESOLVED),
            created_at=minutes_ago(created_minutes_ago),
            resolved_at=minutes_ago(resolved_minutes_ago) if resolved_minutes_ago is not None else None,
            last_observed_at=minutes_ago(last_observed_minutes_ago),
        )
        db.add(hazard)
        await db.flush()

        # A light scattering of fleet observations for coverage/verification
        # screens beyond just PTH-1029.
        if index % 2 == 0:
            for i in range(random.randint(1, 3)):
                jlat, jlon = lat + random.uniform(-0.0008, 0.0008), lon + random.uniform(-0.0008, 0.0008)
                db.add(
                    FleetObservation(
                        hazard_id=hazard.id, vehicle_id=f"FLEET-{(index + i) % 12 + 1:02d}", observed_at=minutes_ago(random.randint(10, 600)),
                        confidence=round(random.uniform(0.6, 0.95), 2), latitude=jlat, longitude=jlon, location=make_point_wkt(jlat, jlon),
                        road_id=road.id, operator_id=f"OP-CHN-{(index % 5) + 1:02d}",
                        observation_state="DETECTED" if hstatus != HazardStatus.RESOLVED else "CLEAR",
                        severity=severity if hstatus != HazardStatus.RESOLVED else None, data_quality=random.choice(["HIGH", "MEDIUM"]),
                    )
                )


async def _seed_sample_repairs(db, city: City, municipality: Municipality, officer: User, wards: list[Ward], roads: dict[str, Road]) -> None:
    """One repair per later-stage tab (section 35), attached to hazards that
    don't already have an open repair, so Repair Operations isn't empty on
    first launch."""
    candidates_result = await db.execute(
        select(Hazard).where(Hazard.city_id == city.id, Hazard.status == HazardStatus.RESOLVED, Hazard.hazard_code != "PTH-1029").limit(3)
    )
    resolved_hazards = list(candidates_result.scalars().all())

    active_result = await db.execute(
        select(Hazard).where(Hazard.city_id == city.id, Hazard.status.in_([HazardStatus.ACTIVE, HazardStatus.VERIFIED]), Hazard.hazard_code != "PTH-1029").limit(6)
    )
    active_hazards = list(active_result.scalars().all())

    plans = []
    if len(active_hazards) >= 2:
        plans.append((active_hazards[0], RepairStatus.ASSIGNED, "Zone 2 Road Maintenance Team", RepairPriority.HIGH))
        plans.append((active_hazards[1], RepairStatus.IN_PROGRESS, "Zone 3 Road Maintenance Team", RepairPriority.CRITICAL))
    if len(active_hazards) >= 3:
        plans.append((active_hazards[2], RepairStatus.READY_FOR_INSPECTION, "Zone 4 Road Maintenance Team", RepairPriority.MEDIUM))
    if resolved_hazards:
        plans.append((resolved_hazards[0], RepairStatus.RESOLVED, "Zone 1 Road Maintenance Team", RepairPriority.HIGH))

    for hazard, target_status, team, priority in plans:
        existing = await db.execute(select(Repair.id).where(Repair.hazard_id == hazard.id))
        if existing.scalar_one_or_none() is not None:
            continue

        repair_code = await unique_repair_code(db, f"R-{1029 + hash(hazard.id.hex) % 900}")
        started = target_status != RepairStatus.ASSIGNED
        # Same chronology rule as `_seed_supporting_hazards`: created_at
        # must be the earliest timestamp or turnaround-time analytics go
        # negative.
        repair_created_minutes_ago = 900
        repair = Repair(
            repair_code=repair_code, hazard_id=hazard.id, city_id=city.id, municipality_id=municipality.id,
            department="Road Maintenance", zone=team.split(" ")[0] + " " + team.split(" ")[1], team=team,
            assigned_officer_name="Karthik S.", priority=priority, target_date=(now + timedelta(days=2)).date(),
            status=target_status, notes="Seeded demo repair.", created_by=officer.id,
            created_at=minutes_ago(repair_created_minutes_ago),
            started_at=minutes_ago(600) if started else None,
            completed_at=minutes_ago(60) if target_status == RepairStatus.RESOLVED else None,
        )
        db.add(repair)
        await db.flush()

        if target_status != RepairStatus.ASSIGNED:
            db.add(RepairProgress(repair_id=repair.id, note="Surface leveled, base layer curing.", created_by=officer.id, created_by_name=officer.full_name, created_at=minutes_ago(300)))
        if target_status == RepairStatus.RESOLVED:
            hazard.municipality_status = "RESOLVED"

        db.add(MunicipalityAction(hazard_id=hazard.id, action_type="REPAIR_ASSIGNED", notes=f"Assigned to {team}.", performed_by=officer.full_name, performed_by_user_id=officer.id, to_status=HazardStatus.UNDER_REPAIR.value))
        if hazard.status != HazardStatus.RESOLVED:
            hazard.status = HazardStatus.UNDER_REPAIR


if __name__ == "__main__":
    asyncio.run(seed())
