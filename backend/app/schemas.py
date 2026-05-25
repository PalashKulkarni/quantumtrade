from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Action = Literal["BUY", "SELL", "HOLD"]


class MarketBarDTO(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class DecisionRequest(BaseModel):
    symbol: str = Field(default="RELIANCE.NS", examples=["RELIANCE.NS", "AAPL", "BTC-USD"])
    timeframe: str = "1d"
    portfolio_value: float = 100_000
    risk_budget: float = 0.02


class AgentDecisionDTO(BaseModel):
    agent: str
    action: Action
    confidence: float
    probabilities: dict[str, float]
    explanation: str


class DecisionResponse(BaseModel):
    symbol: str
    action: Action
    confidence: float
    position_size: float
    regime: str
    sentiment: dict[str, float]
    agents: list[AgentDecisionDTO]
    explanation: str
    feature_importance: dict[str, float]


class BacktestRequest(BaseModel):
    symbol: str = "RELIANCE.NS"
    timeframe: str = "1d"
    initial_cash: float = 100_000
    commission_bps: float = 2.0
    slippage_bps: float = 1.0


class BacktestResponse(BaseModel):
    metrics: dict[str, float]
    equity_curve: list[dict[str, Any]]
    trades: list[dict[str, Any]]


class HoldingDTO(BaseModel):
    id: int | None = None
    ticker: str
    quantity: float
    average_price: float
    sector: str | None = None
    asset_class: str | None = None


class PortfolioDTO(BaseModel):
    id: int | None = None
    user_id: str
    cash_balance: float = 100_000.0
    holdings: list[HoldingDTO] = []


class PortfolioAnalyticsDTO(BaseModel):
    total_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    beta: float
    sharpe_ratio: float
    sector_exposure: dict[str, float]
    asset_class_exposure: dict[str, float]
    correlations: dict[str, dict[str, float]]
    stress_tests: dict[str, float]
    health_score: float
    recommendations: list[str]


class ChatMessageRequest(BaseModel):
    message: str
    context: dict[str, Any] = {}


class ChatMessageResponse(BaseModel):
    role: str = "assistant"
    content: str
    tool_calls: list[str] | None = None
    confidence: float | None = None
