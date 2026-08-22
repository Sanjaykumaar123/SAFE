"""Human-friendly repair/hazard IDs like `R-1042` / `PTH-1029` (section 33) —
mirrors `app/services/report_code.py`'s pattern exactly."""
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hazard import Hazard
from app.models.repair import Repair

REPAIR_PREFIX = "R"
HAZARD_PREFIX = "PTH"


async def generate_repair_code(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"{REPAIR_PREFIX}-{random.randint(1000, 9999)}"
        existing = await db.execute(select(Repair.id).where(Repair.repair_code == candidate))
        if existing.scalar_one_or_none() is None:
            return candidate
    return f"{REPAIR_PREFIX}-{random.randint(10000, 99999)}"


async def generate_hazard_code(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"{HAZARD_PREFIX}-{random.randint(1000, 9999)}"
        existing = await db.execute(select(Hazard.id).where(Hazard.hazard_code == candidate))
        if existing.scalar_one_or_none() is None:
            return candidate
    return f"{HAZARD_PREFIX}-{random.randint(10000, 99999)}"
