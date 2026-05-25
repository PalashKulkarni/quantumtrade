"""
Price Alerts router.
Supports threshold alerts (above/below price) and signal-change alerts.
A background poller checks alerts every 60 seconds and marks triggered ones.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_session
from backend.app.middleware.auth import require_auth
from backend.app.models import PriceAlert, User
from backend.app.services import market_data_service

router = APIRouter()


class AlertCreate(BaseModel):
    symbol: str
    condition: str          # "above" | "below" | "signal_change"
    target_price: float | None = None
    note: str | None = None


class AlertOut(BaseModel):
    id: int
    symbol: str
    condition: str
    target_price: float | None
    is_active: bool
    triggered_at: str | None
    created_at: str


def _alert_out(a: PriceAlert) -> AlertOut:
    return AlertOut(
        id=a.id,
        symbol=a.symbol,
        condition=a.condition,
        target_price=a.target_price,
        is_active=a.is_active,
        triggered_at=a.triggered_at.isoformat() if a.triggered_at else None,
        created_at=a.created_at.isoformat(),
    )


@router.post("/alerts", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    if payload.condition in ("above", "below") and payload.target_price is None:
        raise HTTPException(status_code=422, detail="target_price required for above/below alerts")

    alert = PriceAlert(
        user_id=current_user.id,
        symbol=payload.symbol.upper(),
        condition=payload.condition,
        target_price=payload.target_price,
        is_active=True,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return _alert_out(alert)


@router.get("/alerts", response_model=list[AlertOut])
async def list_alerts(
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.user_id == current_user.id)
        .order_by(PriceAlert.created_at.desc())
    )
    return [_alert_out(a) for a in result.scalars().all()]


@router.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
    await db.commit()


@router.post("/alerts/check")
async def check_alerts(
    current_user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_session),
):
    """
    Manually trigger alert evaluation for the current user.
    In production this runs as a background task every 60s.
    Returns alerts that were triggered in this check.
    """
    result = await db.execute(
        select(PriceAlert).where(PriceAlert.user_id == current_user.id, PriceAlert.is_active == True)
    )
    alerts = result.scalars().all()
    triggered = []

    for alert in alerts:
        try:
            df = await market_data_service.get_ohlcv(alert.symbol, "1d", 1)
            if df.empty:
                continue
            current_price = float(df.iloc[-1]["close"])

            fired = False
            if alert.condition == "above" and alert.target_price and current_price >= alert.target_price:
                fired = True
            elif alert.condition == "below" and alert.target_price and current_price <= alert.target_price:
                fired = True

            if fired:
                alert.is_active = False
                alert.triggered_at = datetime.now(timezone.utc)
                triggered.append({
                    "id": alert.id,
                    "symbol": alert.symbol,
                    "condition": alert.condition,
                    "target_price": alert.target_price,
                    "current_price": current_price,
                })
        except Exception:
            continue

    if triggered:
        await db.commit()

    return {"triggered": triggered, "checked": len(alerts)}
