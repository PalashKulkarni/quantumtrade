from __future__ import annotations

import pandas as pd

from backtesting.metrics import performance_metrics


class BacktestEngine:
    def __init__(self, market_data_service, meta_agent):
        self.market_data_service = market_data_service
        self.meta_agent = meta_agent

    async def run(
        self,
        symbol: str,
        timeframe: str,
        initial_cash: float,
        commission_bps: float,
        slippage_bps: float,
    ) -> dict:
        frame = await self.market_data_service.get_enriched_ohlcv(symbol, timeframe, limit=500)
        cash = initial_cash
        shares = 0.0
        trades: list[dict] = []
        equity_points: list[dict] = []

        for index in range(80, len(frame)):
            historical = frame.iloc[: index + 1].copy()
            row = historical.iloc[-1]
            price = float(row["close"])
            decision = self.meta_agent.decide(symbol, historical, cash + shares * price, risk_budget=0.02)
            execution_price = price * (1 + slippage_bps / 10_000 if decision.action == "BUY" else 1 - slippage_bps / 10_000)

            if decision.action == "BUY" and cash > execution_price:
                quantity = min(decision.position_size, cash / execution_price)
                notional = quantity * execution_price
                fee = notional * commission_bps / 10_000
                cash -= notional + fee
                shares += quantity
                trades.append({"timestamp": row.name.isoformat(), "side": "BUY", "quantity": quantity, "price": execution_price, "fee": fee})
            elif decision.action == "SELL" and shares > 0:
                quantity = shares
                notional = quantity * execution_price
                fee = notional * commission_bps / 10_000
                cash += notional - fee
                shares = 0.0
                trades.append({"timestamp": row.name.isoformat(), "side": "SELL", "quantity": quantity, "price": execution_price, "fee": fee})

            equity = cash + shares * price
            equity_points.append({"timestamp": row.name.isoformat(), "equity": equity, "cash": cash, "position": shares})

        equity_series = pd.Series({point["timestamp"]: point["equity"] for point in equity_points})
        metrics = performance_metrics(equity_series)
        return {"metrics": metrics, "equity_curve": equity_points, "trades": trades}

