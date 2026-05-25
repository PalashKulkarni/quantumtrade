"""
WebSocket live feed.
Accepts symbol as a query param: ws://host/ws/live?symbol=RELIANCE.NS
Sends market ticks every 4 seconds.
"""
import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from backend.app.services import market_data_service, meta_agent, paper_trading_engine

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/live")
async def live_feed(
    websocket: WebSocket,
    symbol: str = Query(default="RELIANCE.NS"),
):
    await websocket.accept()
    logger.info(f"WebSocket connected: {symbol}")

    try:
        while True:
            frame = await market_data_service.get_enriched_ohlcv(symbol, "1d", limit=120)
            if frame.empty:
                await asyncio.sleep(4)
                continue

            last = frame.iloc[-1]
            decision = meta_agent.decide(
                symbol, frame,
                portfolio_value=100_000,
                risk_budget=0.02,
            )

            await websocket.send_json({
                "type": "market_tick",
                "symbol": symbol,
                "price": float(last["close"]),
                "change_pct": float(
                    (last["close"] - frame.iloc[-2]["close"]) / frame.iloc[-2]["close"] * 100
                    if len(frame) >= 2 else 0
                ),
                "volume": float(last.get("volume", 0)),
                "decision": {
                    "action": decision.action,
                    "confidence": round(decision.confidence, 4),
                    "regime": decision.regime,
                },
                "portfolio": paper_trading_engine.snapshot(),
            })
            await asyncio.sleep(4)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {symbol}")
    except Exception as exc:
        logger.error(f"WebSocket error for {symbol}: {exc}")
        await websocket.close(code=1011)
