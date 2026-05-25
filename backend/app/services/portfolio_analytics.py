"""
Portfolio analytics — calculates risk metrics for a set of holdings.

IMPORTANT: Does NOT import from backend.app.services to avoid circular imports.
The market_data_service is passed in as a parameter from the router.
"""
from __future__ import annotations

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


async def calculate_analytics(
    holdings: list,
    current_prices: dict[str, float],
    market_data_service=None,   # injected by router to avoid circular import
) -> dict:
    if not holdings:
        return {
            "total_value": 0.0,
            "unrealized_pnl": 0.0,
            "unrealized_pnl_percent": 0.0,
            "beta": 1.0,
            "sharpe_ratio": 0.0,
            "sector_exposure": {},
            "asset_class_exposure": {},
            "correlations": {},
            "stress_tests": {"2008 Crash": 0.0, "COVID Shock": 0.0, "Rate Hike": 0.0},
            "health_score": 50.0,
            "recommendations": ["Add holdings to analyse portfolio."],
        }

    total_value = 0.0
    total_cost = 0.0
    sector_exposure: dict[str, float] = {}
    asset_class_exposure: dict[str, float] = {}

    for h in holdings:
        price = current_prices.get(h.ticker, h.average_price)
        value = h.quantity * price
        cost = h.quantity * h.average_price
        total_value += value
        total_cost += cost

        sector = h.sector or "Unknown"
        sector_exposure[sector] = sector_exposure.get(sector, 0.0) + value

        ac = h.asset_class or "Equity"
        asset_class_exposure[ac] = asset_class_exposure.get(ac, 0.0) + value

    # Normalise to percentages
    for k in sector_exposure:
        sector_exposure[k] = (sector_exposure[k] / total_value * 100) if total_value > 0 else 0.0
    for k in asset_class_exposure:
        asset_class_exposure[k] = (asset_class_exposure[k] / total_value * 100) if total_value > 0 else 0.0

    unrealized_pnl = total_value - total_cost
    unrealized_pnl_percent = (unrealized_pnl / total_cost * 100) if total_cost > 0 else 0.0

    # ── Risk metrics (requires live data) ────────────────────────────────────
    beta = 1.0
    sharpe_ratio = 0.0
    correlations: dict[str, dict[str, float]] = {}

    if market_data_service is not None:
        try:
            returns_df = pd.DataFrame()

            spy_data = await market_data_service.get_ohlcv("SPY", "1d", 252)
            if not spy_data.empty:
                returns_df["SPY"] = spy_data["close"].pct_change().dropna()

            tickers = [h.ticker for h in holdings]
            for t in tickers:
                try:
                    data = await market_data_service.get_ohlcv(t, "1d", 252)
                    if not data.empty:
                        returns_df[t] = data["close"].pct_change().dropna()
                except Exception:
                    pass

            returns_df = returns_df.dropna()

            if not returns_df.empty and "SPY" in returns_df.columns and total_value > 0:
                weights = {
                    h.ticker: (h.quantity * current_prices.get(h.ticker, h.average_price)) / total_value
                    for h in holdings
                }
                port_returns = pd.Series(0.0, index=returns_df.index)
                for t in tickers:
                    if t in returns_df.columns:
                        port_returns += returns_df[t] * weights.get(t, 0.0)

                cov = np.cov(port_returns, returns_df["SPY"])
                if cov[1, 1] > 0:
                    beta = float(cov[0, 1] / cov[1, 1])

                mean_ret = port_returns.mean() * 252
                vol = port_returns.std() * np.sqrt(252)
                if vol > 0:
                    sharpe_ratio = float((mean_ret - 0.04) / vol)

                if len(tickers) > 1:
                    ticker_cols = [t for t in tickers if t in returns_df.columns]
                    if ticker_cols:
                        corr = returns_df[ticker_cols].corr()
                        for t1 in ticker_cols:
                            correlations[t1] = {
                                t2: round(float(corr.loc[t1, t2]), 2) if not pd.isna(corr.loc[t1, t2]) else (1.0 if t1 == t2 else 0.0)
                                for t2 in ticker_cols
                            }

        except Exception as exc:
            logger.warning(f"Risk metric calculation failed: {exc}")

    # ── Stress tests ──────────────────────────────────────────────────────────
    tech_pct = sector_exposure.get("Technology", 0.0)
    stress_tests = {
        "2008 Crash":   round(total_value * -0.38 * beta, 2),
        "COVID Shock":  round(total_value * -0.22 * beta, 2),
        "Rate Hike":    round(total_value * -0.08 * (beta * 1.2), 2),
        "Tech Selloff": round(total_value * (-0.15 if tech_pct > 30 else -0.05), 2),
    }

    # ── Health score ──────────────────────────────────────────────────────────
    health_score = 100.0
    recommendations: list[str] = []

    max_sector = max(sector_exposure.values()) if sector_exposure else 0.0
    if max_sector > 40:
        health_score -= 15
        recommendations.append("High concentration: >40% in one sector. Consider diversifying.")

    if len(holdings) < 5:
        health_score -= 20
        recommendations.append("Portfolio has fewer than 5 assets — consider adding more for diversification.")
    elif len(holdings) >= 15:
        health_score += 5

    if beta > 1.5:
        health_score -= 10
        recommendations.append("High portfolio beta — elevated volatility vs the market.")

    if 0.0 < sharpe_ratio < 1.0:
        recommendations.append("Sharpe ratio below 1.0 — consider adding uncorrelated assets to improve risk-adjusted returns.")

    if not recommendations:
        recommendations.append("Portfolio exhibits strong diversification and healthy risk-adjusted metrics.")

    return {
        "total_value": round(total_value, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
        "unrealized_pnl_percent": round(unrealized_pnl_percent, 4),
        "beta": round(beta, 4),
        "sharpe_ratio": round(sharpe_ratio, 4),
        "sector_exposure": {k: round(v, 2) for k, v in sector_exposure.items()},
        "asset_class_exposure": {k: round(v, 2) for k, v in asset_class_exposure.items()},
        "correlations": correlations,
        "stress_tests": stress_tests,
        "health_score": round(min(100.0, max(0.0, health_score)), 2),
        "recommendations": recommendations,
    }
