from fastapi import APIRouter

from backend.app.schemas import DecisionRequest
from backend.app.services import market_data_service, meta_agent, paper_trading_engine

router = APIRouter()


@router.post("/paper-trading/step")
async def paper_trading_step(payload: DecisionRequest):
    frame = await market_data_service.get_enriched_ohlcv(payload.symbol, payload.timeframe, limit=240)
    decision = meta_agent.decide(payload.symbol, frame, payload.portfolio_value, payload.risk_budget)
    fill = paper_trading_engine.execute_decision(decision=decision, latest_price=float(frame.iloc[-1]["close"]))
    return {"decision": decision.model_dump(), "fill": fill, "portfolio": paper_trading_engine.snapshot()}


@router.get("/paper-trading/trades")
async def trade_history():
    return paper_trading_engine.trades

