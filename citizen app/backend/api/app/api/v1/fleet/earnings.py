"""§40-42/85/86 — GET-only; the mobile app never posts earnings, it only
reads what `app/services/fleet/earnings.py` already computed at session
stop time (§85: backend is authoritative)."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.collection_session import CollectionSession
from app.models.earning_record import EarningRecord
from app.schemas.fleet import EarningsBreakdownOut, EarningsSummaryOut, PaymentListResponse, PaymentOut
from app.services.fleet.authorization import FleetContext, get_fleet_context

router = APIRouter(prefix="", tags=["fleet"])


async def _sum_earnings(db: AsyncSession, operator_id: uuid.UUID, since: datetime) -> float:
    result = await db.execute(
        select(func.coalesce(func.sum(EarningRecord.total_amount), 0.0))
        .join(CollectionSession, CollectionSession.id == EarningRecord.session_id)
        .where(EarningRecord.operator_id == operator_id, CollectionSession.start_time >= since)
    )
    return result.scalar_one() or 0.0


@router.get("/earnings", response_model=EarningsSummaryOut)
async def get_earnings(ctx: FleetContext = Depends(get_fleet_context), db: AsyncSession = Depends(get_db)) -> EarningsSummaryOut:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    today_total = await _sum_earnings(db, ctx.profile.id, today_start)
    week_total = await _sum_earnings(db, ctx.profile.id, week_start)
    month_total = await _sum_earnings(db, ctx.profile.id, month_start)

    breakdown_result = await db.execute(
        select(
            func.coalesce(func.sum(EarningRecord.coverage_amount), 0.0),
            func.coalesce(func.sum(EarningRecord.observation_amount), 0.0),
            func.coalesce(func.sum(EarningRecord.quality_bonus_amount), 0.0),
        )
        .join(CollectionSession, CollectionSession.id == EarningRecord.session_id)
        .where(EarningRecord.operator_id == ctx.profile.id, CollectionSession.start_time >= today_start)
    )
    coverage, observation, quality = breakdown_result.one()

    return EarningsSummaryOut(
        today=today_total,
        this_week=week_total,
        this_month=month_total,
        breakdown_today=EarningsBreakdownOut(
            coverage_amount=coverage, observation_amount=observation, quality_bonus_amount=quality, total_amount=today_total
        ),
    )


@router.get("/payments", response_model=PaymentListResponse)
async def list_payments(ctx: FleetContext = Depends(get_fleet_context), db: AsyncSession = Depends(get_db), limit: int = 20, offset: int = 0) -> PaymentListResponse:
    result = await db.execute(
        select(EarningRecord)
        .where(EarningRecord.operator_id == ctx.profile.id)
        .order_by(EarningRecord.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = list(result.scalars().all())
    total_result = await db.execute(select(EarningRecord.id).where(EarningRecord.operator_id == ctx.profile.id))
    total = len(total_result.all())
    return PaymentListResponse(items=[PaymentOut.model_validate(p) for p in items], total=total)


@router.get("/payments/{payment_id}", response_model=PaymentOut)
async def get_payment(payment_id: uuid.UUID, ctx: FleetContext = Depends(get_fleet_context), db: AsyncSession = Depends(get_db)) -> PaymentOut:
    result = await db.execute(select(EarningRecord).where(EarningRecord.id == payment_id, EarningRecord.operator_id == ctx.profile.id))
    payment = result.scalar_one_or_none()
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found.")
    return PaymentOut.model_validate(payment)
