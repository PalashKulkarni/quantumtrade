"""
Market data providers for QuantumTrade AI.

Provider chain (tried in order):
  1. YahooFinanceProvider  — global equities, ETFs, crypto via yfinance
  2. NSEIndiaProvider      — Indian equities via yfinance .NS / .BO suffix routing
  3. SyntheticProvider     — deterministic fallback (never fails)

NSE/BSE routing:
  Any symbol matching known Indian exchange patterns (RELIANCE, NIFTY, etc.)
  or ending in .NS / .BO is automatically routed correctly. The provider
  normalises the symbol so callers can pass "RELIANCE" or "RELIANCE.NS"
  interchangeably.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import numpy as np
import pandas as pd
from tenacity import retry, stop_after_attempt, wait_exponential


@dataclass(frozen=True)
class ProviderRequest:
    symbol: str
    timeframe: str
    limit: int


class MarketDataProvider:
    async def fetch(self, request: ProviderRequest) -> pd.DataFrame:
        raise NotImplementedError


# ─── NSE/BSE Detection ────────────────────────────────────────────────────────

# Well-known Nifty 50 + common NSE tickers that users will type without suffix
_NSE_TICKERS = frozenset({
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "HINDUNILVR",
    "WIPRO", "SBIN", "BAJFINANCE", "MARUTI", "TITAN", "NESTLEIND",
    "ADANIENT", "ADANIPORTS", "ASIANPAINT", "AXISBANK", "BAJAJFINSV",
    "BHARTIARTL", "BPCL", "BRITANNIA", "CIPLA", "COALINDIA", "DIVISLAB",
    "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH", "HDFCLIFE", "HEROMOTOCO",
    "HINDALCO", "INDUSINDBK", "ITC", "JSWSTEEL", "KOTAKBANK", "LT",
    "M&M", "NTPC", "ONGC", "POWERGRID", "SBILIFE", "SHREECEM",
    "SUNPHARMA", "TATACONSUM", "TATAMOTORS", "TATASTEEL", "TECHM",
    "ULTRACEMCO", "UPL", "VEDL", "HAVELLS", "PIDILITIND",
    # Indices
    "NIFTY50", "NIFTY", "BANKNIFTY", "SENSEX",
})

# Nifty indices — yfinance tickers
_NIFTY_MAP = {
    "NIFTY50": "^NSEI",
    "NIFTY": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
}


def _resolve_nse_symbol(symbol: str) -> str | None:
    """
    Return the correct yfinance ticker for an Indian symbol, or None if not Indian.
    """
    s = symbol.upper().strip()

    # Already suffixed
    if s.endswith(".NS"):
        return s
    if s.endswith(".BO"):
        return s

    # Index map
    if s in _NIFTY_MAP:
        return _NIFTY_MAP[s]

    # Known NSE ticker
    if s in _NSE_TICKERS:
        return f"{s}.NS"

    return None


def is_indian_symbol(symbol: str) -> bool:
    return _resolve_nse_symbol(symbol) is not None


# ─── Providers ────────────────────────────────────────────────────────────────

class NSEIndiaProvider(MarketDataProvider):
    """
    Routes Indian equities and indices through yfinance with correct .NS / .BO suffixes.
    Only accepts symbols it can map — raises ValueError otherwise so the chain moves on.
    """

    @retry(wait=wait_exponential(multiplier=1, min=1, max=8), stop=stop_after_attempt(3))
    async def fetch(self, request: ProviderRequest) -> pd.DataFrame:
        import yfinance as yf

        yf_symbol = _resolve_nse_symbol(request.symbol)
        if not yf_symbol:
            raise ValueError(f"{request.symbol} is not a known Indian instrument")

        interval = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "1d": "1d"}.get(request.timeframe)
        if not interval:
            raise ValueError(f"Unsupported timeframe: {request.timeframe}")

        period = "7d" if interval.endswith("m") else "2y"
        raw = yf.download(yf_symbol, period=period, interval=interval, progress=False, auto_adjust=True)
        if raw.empty:
            raise ValueError(f"Empty response for {yf_symbol}")

        frame = raw.tail(request.limit).copy()
        frame.columns = [c.lower() if isinstance(c, str) else c[0].lower() for c in frame.columns]
        if "adj close" in frame.columns:
            frame = frame.rename(columns={"adj close": "close"})
        frame.index = pd.to_datetime(frame.index, utc=True)
        return frame[["open", "high", "low", "close", "volume"]].dropna()


class YahooFinanceProvider(MarketDataProvider):
    """Global equities, ETFs, crypto, forex via yfinance."""

    @retry(wait=wait_exponential(multiplier=1, min=1, max=8), stop=stop_after_attempt(3))
    async def fetch(self, request: ProviderRequest) -> pd.DataFrame:
        import yfinance as yf

        interval = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "1d": "1d"}.get(request.timeframe)
        if not interval:
            raise ValueError(f"Unsupported timeframe: {request.timeframe}")

        period = "7d" if interval.endswith("m") else "2y"
        raw = yf.download(request.symbol, period=period, interval=interval, progress=False, auto_adjust=True)
        if raw.empty:
            raise ValueError(f"Empty Yahoo Finance response for {request.symbol}")

        frame = raw.tail(request.limit).copy()
        # Handle MultiIndex columns from newer yfinance versions
        if isinstance(frame.columns, pd.MultiIndex):
            frame.columns = [c[0].lower() for c in frame.columns]
        else:
            frame.columns = [c.lower() for c in frame.columns]
        if "adj close" in frame.columns:
            frame = frame.rename(columns={"adj close": "close"})
        frame.index = pd.to_datetime(frame.index, utc=True)
        return frame[["open", "high", "low", "close", "volume"]].dropna()


class SyntheticProvider(MarketDataProvider):
    """Deterministic synthetic OHLCV — always succeeds, used as final fallback."""

    async def fetch(self, request: ProviderRequest) -> pd.DataFrame:
        return _build_synthetic_ohlcv(request.symbol, request.timeframe, request.limit)


def _build_synthetic_ohlcv(symbol: str, timeframe: str, limit: int) -> pd.DataFrame:
    minutes = {"1m": 1, "5m": 5, "15m": 15, "1h": 60, "1d": 1440}.get(timeframe, 1440)
    now = datetime.now(UTC).replace(second=0, microsecond=0)
    index = [now - timedelta(minutes=minutes * i) for i in range(limit)][::-1]
    seed = abs(hash((symbol, timeframe))) % 2**32
    rng = np.random.default_rng(seed)
    trend = np.linspace(0, rng.normal(3, 1), limit)
    shocks = rng.normal(0, 1.2, limit).cumsum()
    base = 100 + (seed % 80) + trend + shocks
    close = np.maximum(base, 1.0)
    open_ = close + rng.normal(0, 0.35, limit)
    high = np.maximum(open_, close) + rng.uniform(0.1, 1.1, limit)
    low = np.minimum(open_, close) - rng.uniform(0.1, 1.1, limit)
    volume = rng.integers(100_000, 4_000_000, limit).astype(float)
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": close, "volume": volume},
        index=pd.DatetimeIndex(index, name="timestamp"),
    )
