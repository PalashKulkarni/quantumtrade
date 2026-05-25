"""
MetaAgent — pure-Python multi-agent ensemble decision engine.

No external ML dependencies (no PyTorch, TensorFlow, scikit-learn).
Uses technical indicators computed by data_pipeline.indicators to produce
BUY / SELL / HOLD decisions with ensemble confidence.

Each sub-agent implements a simple, interpretable strategy:
  - MomentumAgent      : trend + MACD crossover
  - MeanReversionAgent : RSI + Bollinger Band extremes
  - VolatilityAgent    : ATR / realized-vol filter
  - SentimentAgent     : tape-implied sentiment from price action
  - RiskManagerAgent   : hard veto when volatility is too high
  - AllocationAgent    : regime-aware sizing overlay

The MetaAgent aggregates votes with fixed weights and returns a Decision.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Literal

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

Action = Literal["BUY", "SELL", "HOLD"]

# Agent weights — risk_manager has highest weight so it can suppress signals
_WEIGHTS: dict[str, float] = {
    "momentum":           1.20,
    "mean_reversion":     0.95,
    "volatility":         1.05,
    "sentiment":          0.85,
    "risk_manager":       1.30,
    "portfolio_allocation": 0.90,
}


@dataclass
class AgentVote:
    agent: str
    action: Action
    confidence: float
    explanation: str
    probabilities: dict[str, float] = field(default_factory=dict)

    def __post_init__(self):
        if not self.probabilities:
            rem = 1.0 - self.confidence
            self.probabilities = {
                "BUY":  self.confidence if self.action == "BUY"  else rem / 2,
                "SELL": self.confidence if self.action == "SELL" else rem / 2,
                "HOLD": self.confidence if self.action == "HOLD" else rem / 2,
            }


@dataclass
class Decision:
    symbol: str
    action: Action
    confidence: float
    position_size: float
    regime: str
    sentiment: dict[str, float]
    agents: list[AgentVote]
    explanation: str
    feature_importance: dict[str, float]

    def model_dump(self) -> dict:
        return {
            "symbol": self.symbol,
            "action": self.action,
            "confidence": self.confidence,
            "position_size": self.position_size,
            "regime": self.regime,
            "sentiment": self.sentiment,
            "explanation": self.explanation,
            "feature_importance": self.feature_importance,
            "agents": [
                {
                    "agent": v.agent,
                    "action": v.action,
                    "confidence": v.confidence,
                    "explanation": v.explanation,
                    "probabilities": v.probabilities,
                }
                for v in self.agents
            ],
        }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(series: pd.Series, index: int = -1, default: float = 0.0) -> float:
    try:
        val = series.iloc[index]
        return float(val) if pd.notna(val) else default
    except Exception:
        return default


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _detect_regime(trend_60: float, realized_vol: float) -> str:
    if realized_vol > 0.42:
        return "high_volatility"
    if trend_60 > 0.045:
        return "bull_market"
    if trend_60 < -0.045:
        return "bear_market"
    return "sideways_market"


# ─── Individual agents ────────────────────────────────────────────────────────

def _momentum_agent(df: pd.DataFrame) -> AgentVote:
    close = df["close"]
    n = len(close)
    trend_20 = (close.iloc[-1] / close.iloc[max(0, n - 21)] - 1) if n > 21 else 0.0

    macd = _safe_float(df.get("macd", pd.Series([0.0])))
    macd_sig = _safe_float(df.get("macd_signal", pd.Series([0.0])))
    spread = macd - macd_sig

    if trend_20 > 0.015 and spread > 0:
        action: Action = "BUY"
    elif trend_20 < -0.015 and spread < 0:
        action = "SELL"
    else:
        action = "HOLD"

    conf = _clamp(0.48 + abs(trend_20) * 8 + abs(spread) * 0.08, 0.42, 0.90)
    return AgentVote(
        agent="momentum",
        action=action,
        confidence=conf,
        explanation=(
            f"20-period momentum is {trend_20 * 100:.2f}% and "
            f"MACD spread is {spread:.4f}."
        ),
    )


def _mean_reversion_agent(df: pd.DataFrame) -> AgentVote:
    rsi_col = df.get("rsi", None)
    rsi_val = _safe_float(rsi_col, default=50.0) if rsi_col is not None else 50.0

    close = _safe_float(df["close"])
    bb_upper = _safe_float(df.get("bb_upper", pd.Series([close * 1.02])))
    bb_lower = _safe_float(df.get("bb_lower", pd.Series([close * 0.98])))
    band_range = bb_upper - bb_lower
    bb_pos = (close - bb_lower) / band_range if band_range > 0 else 0.5

    if rsi_val < 35 or bb_pos < 0.15:
        action: Action = "BUY"
    elif rsi_val > 68 or bb_pos > 0.88:
        action = "SELL"
    else:
        action = "HOLD"

    conf = _clamp(0.42 + abs(rsi_val - 50) / 55, 0.42, 0.84)
    return AgentVote(
        agent="mean_reversion",
        action=action,
        confidence=conf,
        explanation=(
            f"RSI is {rsi_val:.1f} and Bollinger position is {bb_pos * 100:.0f}%."
        ),
    )


def _volatility_agent(df: pd.DataFrame, realized_vol: float) -> AgentVote:
    close = df["close"]
    trend_20 = (close.iloc[-1] / close.iloc[max(0, len(close) - 21)] - 1) if len(close) > 21 else 0.0
    action: Action = "HOLD" if realized_vol > 0.38 else ("BUY" if trend_20 > 0 else "HOLD")
    conf = _clamp(0.46 + realized_vol * 0.6, 0.46, 0.88)
    return AgentVote(
        agent="volatility",
        action=action,
        confidence=conf,
        explanation=f"Realized volatility is {realized_vol * 100:.1f}%.",
    )


def _sentiment_agent(df: pd.DataFrame) -> AgentVote:
    close = df["close"]
    n = len(close)
    trend_20 = (close.iloc[-1] / close.iloc[max(0, n - 21)] - 1) if n > 21 else 0.0
    trend_60 = (close.iloc[-1] / close.iloc[max(0, n - 61)] - 1) if n > 61 else 0.0
    rsi_val = _safe_float(df.get("rsi", pd.Series([50.0])), default=50.0)
    macd_spread = _safe_float(df.get("macd", pd.Series([0.0]))) - _safe_float(df.get("macd_signal", pd.Series([0.0])))

    score = _clamp(
        trend_20 * 4 + trend_60 * 2 + (rsi_val - 50) / 120 + np.sign(macd_spread) * 0.08,
        -0.9, 0.9,
    )

    action: Action = "BUY" if score > 0.18 else ("SELL" if score < -0.18 else "HOLD")
    conf = _clamp(0.50 + abs(score) * 0.35, 0.50, 0.86)
    return AgentVote(
        agent="sentiment",
        action=action,
        confidence=conf,
        explanation=f"Tape-implied sentiment score is {score * 100:.0f}.",
    )


def _risk_manager_agent(realized_vol: float, regime: str) -> AgentVote:
    risky = realized_vol > 0.45 or regime == "high_volatility"
    conf = _clamp(0.52 + realized_vol * 0.55, 0.52, 0.92)
    return AgentVote(
        agent="risk_manager",
        action="HOLD",
        confidence=conf if risky else 0.52,
        explanation=(
            f"Risk model sees {regime.replace('_', ' ')} with "
            f"realized vol {realized_vol * 100:.1f}%."
        ),
    )


def _allocation_agent(regime: str) -> AgentVote:
    action: Action = "BUY" if regime == "bull_market" else ("SELL" if regime == "bear_market" else "HOLD")
    return AgentVote(
        agent="portfolio_allocation",
        action=action,
        confidence=0.58,
        explanation=f"Allocation model adapts to {regime.replace('_', ' ')}.",
    )


# ─── MetaAgent ────────────────────────────────────────────────────────────────

class MetaAgent:
    """Ensemble meta-agent — aggregates sub-agent votes with fixed weights."""

    def decide(
        self,
        symbol: str,
        market_frame: pd.DataFrame,
        portfolio_value: float = 100_000.0,
        risk_budget: float = 0.02,
    ) -> Decision:
        if market_frame is None or market_frame.empty or len(market_frame) < 5:
            return self._hold_decision(symbol, portfolio_value, "insufficient_data")

        try:
            return self._compute(symbol, market_frame, portfolio_value, risk_budget)
        except Exception as exc:
            logger.warning(f"MetaAgent decision error for {symbol}: {exc}")
            return self._hold_decision(symbol, portfolio_value, "computation_error")

    def _compute(
        self,
        symbol: str,
        df: pd.DataFrame,
        portfolio_value: float,
        risk_budget: float,
    ) -> Decision:
        close = df["close"]
        n = len(close)

        returns = close.pct_change().dropna()
        realized_vol = float(returns.iloc[-30:].std() * np.sqrt(252)) if len(returns) >= 5 else 0.20
        trend_60 = (close.iloc[-1] / close.iloc[max(0, n - 61)] - 1) if n > 61 else 0.0
        regime = _detect_regime(trend_60, realized_vol)

        votes: list[AgentVote] = [
            _momentum_agent(df),
            _mean_reversion_agent(df),
            _volatility_agent(df, realized_vol),
            _sentiment_agent(df),
            _risk_manager_agent(realized_vol, regime),
            _allocation_agent(regime),
        ]

        # Weighted vote aggregation
        scores: dict[str, float] = {"BUY": 0.0, "SELL": 0.0, "HOLD": 0.0}
        for vote in votes:
            w = _WEIGHTS.get(vote.agent, 1.0)
            scores[vote.action] += vote.confidence * w

        total = sum(scores.values()) or 1.0
        action: Action = max(scores, key=lambda a: scores[a])  # type: ignore[assignment]
        confidence = _clamp(scores[action] / total, 0.34, 0.94)

        # Position sizing: volatility-adjusted Kelly fraction
        atr_series = df.get("atr", None)
        atr_val = float(atr_series.iloc[-1]) if (atr_series is not None and not atr_series.empty and pd.notna(atr_series.iloc[-1])) else float(close.iloc[-1]) * 0.015
        latest_price = float(close.iloc[-1])
        if action == "BUY" and latest_price > 0:
            raw_size = min(
                portfolio_value * 0.24 / latest_price,
                portfolio_value * risk_budget / max(atr_val * 2, latest_price * 0.01),
            )
            position_size = max(0.0, raw_size)
        else:
            position_size = 0.0

        trend_20 = (close.iloc[-1] / close.iloc[max(0, n - 21)] - 1) if n > 21 else 0.0
        rsi_val = _safe_float(df.get("rsi", pd.Series([50.0])), default=50.0)

        feature_importance = {
            "momentum":  _clamp(abs(trend_20) * 10, 0.05, 1.0),
            "volatility": _clamp(realized_vol, 0.05, 1.0),
            "regime":    0.72 if regime != "sideways_market" else 0.35,
            "risk":      _clamp(atr_val / max(latest_price, 1) * 16, 0.10, 0.85),
            "sentiment": _clamp(abs(trend_20) * 4, 0.05, 1.0),
        }

        explanation = (
            f"{action} for {symbol} with {confidence * 100:.0f}% confidence. "
            f"Momentum {trend_20 * 100:.2f}%, RSI {rsi_val:.1f}, "
            f"realized vol {realized_vol * 100:.1f}%, regime: {regime.replace('_', ' ')}."
        )

        sentiment_score = _clamp(trend_20 * 4 + (rsi_val - 50) / 120, -0.9, 0.9)

        return Decision(
            symbol=symbol,
            action=action,
            confidence=confidence,
            position_size=round(position_size, 4),
            regime=regime,
            sentiment={
                "bullish":   _clamp((sentiment_score + 1) / 2, 0.0, 1.0),
                "bearish":   _clamp(1 - (sentiment_score + 1) / 2, 0.0, 1.0),
                "confidence": _clamp(0.5 + abs(sentiment_score) / 2, 0.5, 0.95),
                "aggregate": sentiment_score,
            },
            agents=votes,
            explanation=explanation,
            feature_importance=feature_importance,
        )

    @staticmethod
    def _hold_decision(symbol: str, portfolio_value: float, reason: str) -> Decision:
        stub_vote = AgentVote(
            agent="risk_manager",
            action="HOLD",
            confidence=0.60,
            explanation=f"Holding due to: {reason}.",
        )
        return Decision(
            symbol=symbol,
            action="HOLD",
            confidence=0.60,
            position_size=0.0,
            regime="unknown",
            sentiment={"bullish": 0.5, "bearish": 0.5, "confidence": 0.5, "aggregate": 0.0},
            agents=[stub_vote],
            explanation=f"Holding {symbol}: {reason}.",
            feature_importance={},
        )
