from fastapi import APIRouter, Depends

from backend.app.middleware.auth import require_auth
from backend.app.models import User
from backend.app.schemas import DecisionRequest, DecisionResponse
from backend.app.services import market_data_service, meta_agent

router = APIRouter()


@router.post("/decisions", response_model=DecisionResponse)
async def create_decision(
    payload: DecisionRequest,
    current_user: User = Depends(require_auth),
):
    frame = await market_data_service.get_enriched_ohlcv(payload.symbol, payload.timeframe, limit=240)
    decision = meta_agent.decide(
        symbol=payload.symbol,
        market_frame=frame,
        portfolio_value=payload.portfolio_value,
        risk_budget=payload.risk_budget,
    )
    return decision.model_dump()


@router.get("/agents/status")
async def agent_status(_: User = Depends(require_auth)):
    return {
        "agents": ["momentum", "mean_reversion", "volatility", "sentiment", "risk_manager", "portfolio_allocation"],
        "meta_agent": "online",
    }
