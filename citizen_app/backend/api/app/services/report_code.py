"""Human-friendly report IDs like `PTH-1042` (section 24) — a citizen-facing
label, never used as a primary/foreign key (those stay UUIDs)."""
import random

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.citizen_report import CitizenReport

PREFIX = "PTH"


async def generate_report_code(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = f"{PREFIX}-{random.randint(1000, 9999)}"
        existing = await db.execute(select(CitizenReport.id).where(CitizenReport.report_code == candidate))
        if existing.scalar_one_or_none() is None:
            return candidate
    # Extremely unlikely fallback once the 9000-number space is exhausted.
    candidate = f"{PREFIX}-{random.randint(10000, 99999)}"
    return candidate
