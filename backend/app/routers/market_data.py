from fastapi import APIRouter, Query

from backend.app.schemas import MarketBarDTO
from backend.app.services import market_data_service

router = APIRouter()


@router.get("/market-data/{symbol}", response_model=list[MarketBarDTO])
async def get_market_data(symbol: str, timeframe: str = "1d", limit: int = Query(200, le=1000)):
    frame = await market_data_service.get_ohlcv(symbol=symbol, timeframe=timeframe, limit=limit)
    return frame.reset_index().rename(columns={"index": "timestamp"}).to_dict("records")


@router.get("/indicators/{symbol}")
async def get_indicators(symbol: str, timeframe: str = "1d"):
    frame = await market_data_service.get_enriched_ohlcv(symbol=symbol, timeframe=timeframe, limit=240)
    latest = frame.iloc[-1].replace({float("inf"): 0, float("-inf"): 0}).fillna(0)
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "rsi": float(latest["rsi"]),
        "macd": float(latest["macd"]),
        "ema_20": float(latest["ema_20"]),
        "atr": float(latest["atr"]),
        "vwap": float(latest["vwap"]),
        "volatility": float(latest["volatility_20"]),
    }

