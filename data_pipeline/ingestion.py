"""
MarketDataService with:
  - Smart provider chain: NSE → Yahoo → Synthetic
  - Redis caching (TTL varies by timeframe)
  - In-memory fallback cache when Redis is unavailable
"""
from __future__ import annotations

import json
import time
import logging
from typing import Optional

import pandas as pd

from data_pipeline.indicators import add_technical_indicators
from data_pipeline.providers import (
    NSEIndiaProvider,
    ProviderRequest,
    SyntheticProvider,
    YahooFinanceProvider,
    is_indian_symbol,
)
from data_pipeline.validation import validate_ohlcv

logger = logging.getLogger(__name__)

# Cache TTL by timeframe (seconds)
_CACHE_TTL: dict[str, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 600,
    "1h": 1800,
    "1d": 3600,
}


class MarketDataService:
    def __init__(self, redis_url: Optional[str] = None):
        self._nse_provider = NSEIndiaProvider()
        self._yahoo_provider = YahooFinanceProvider()
        self._synthetic_provider = SyntheticProvider()

        # In-memory fallback cache: {key: (timestamp, dataframe)}
        self._mem_cache: dict[str, tuple[float, pd.DataFrame]] = {}

        # Redis is optional — if not configured, in-memory cache is used
        self._redis = None
        if redis_url:
            try:
                import redis.asyncio as aioredis  # type: ignore[import]
                self._redis = aioredis.from_url(redis_url, decode_responses=True)
                logger.info("Redis cache connected: %s", redis_url)
            except Exception as e:
                logger.info("Redis unavailable (using in-memory cache): %s", e)

    def _cache_key(self, symbol: str, timeframe: str, limit: int) -> str:
        return f"qt:ohlcv:{symbol.upper()}:{timeframe}:{limit}"

    def _ttl(self, timeframe: str) -> int:
        return _CACHE_TTL.get(timeframe, 3600)

    async def _cache_get(self, key: str) -> pd.DataFrame | None:
        ttl = self._ttl(key.split(":")[3] if ":" in key else "1d")

        # Try Redis first
        if self._redis:
            try:
                raw = await self._redis.get(key)
                if raw:
                    records = json.loads(raw)
                    df = pd.DataFrame(records)
                    df.index = pd.to_datetime(df.index)
                    return df
            except Exception:
                pass

        # In-memory fallback
        entry = self._mem_cache.get(key)
        if entry and (time.time() - entry[0]) < ttl:
            return entry[1].copy()

        return None

    async def _cache_set(self, key: str, df: pd.DataFrame, timeframe: str) -> None:
        ttl = self._ttl(timeframe)

        # Store in-memory always
        self._mem_cache[key] = (time.time(), df.copy())

        # Try Redis
        if self._redis:
            try:
                records = df.copy()
                records.index = records.index.astype(str)
                await self._redis.setex(key, ttl, json.dumps(records.to_dict(orient="index")))
            except Exception:
                pass

    async def get_ohlcv(self, symbol: str, timeframe: str = "1d", limit: int = 240) -> pd.DataFrame:
        sym = symbol.upper().strip()
        key = self._cache_key(sym, timeframe, limit)

        # Cache hit
        cached = await self._cache_get(key)
        if cached is not None:
            logger.debug(f"Cache hit: {key}")
            return cached

        # Provider chain — Indian symbols get NSE first
        if is_indian_symbol(sym):
            providers = [self._nse_provider, self._yahoo_provider, self._synthetic_provider]
        else:
            providers = [self._yahoo_provider, self._synthetic_provider]

        request = ProviderRequest(symbol=sym, timeframe=timeframe, limit=limit)
        last_error: Exception | None = None

        for provider in providers:
            try:
                frame = validate_ohlcv(await provider.fetch(request))
                result = frame.tail(limit)
                await self._cache_set(key, result, timeframe)
                logger.info(f"Fetched {sym} from {provider.__class__.__name__}")
                return result.copy()
            except Exception as exc:
                last_error = exc
                logger.debug(f"{provider.__class__.__name__} failed for {sym}: {exc}")

        raise RuntimeError(f"All providers failed for {sym}: {last_error}")

    async def get_enriched_ohlcv(self, symbol: str, timeframe: str = "1d", limit: int = 240) -> pd.DataFrame:
        df = await self.get_ohlcv(symbol, timeframe, limit)
        return add_technical_indicators(df)
