"""
Backtests router — run, list, and retrieve saved backtest results.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_session
from backend.app.middleware.auth import require_auth
from backend.app.models import User
from backend.app.schemas import BacktestRequest, BacktestResponse
from backend.app.services import backtest_engine

router = APIRouter()


class SavedBacktest(BaseModel):
    id: int
    symbol: str
    timeframe: str
    created_at: str
    metrics: dict
    trade_count: int


@router.post("/backtests/run", response_model=BacktestResponse)
async def run_backtest(
    request: BacktestRequest,
    _: User = Depends(require_auth),
):
    result = await backtest_engine.run(
        symbol=request.symbol,
        timeframe=request.timeframe,
        initial_cash=request.initial_cash,
        commission_bps=request.commission_bps,
        slippage_bps=request.slippage_bps,
    )
    return result
