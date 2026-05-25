"""
PaperTradingEngine — in-memory paper trading simulator.

Executes decisions from the MetaAgent against synthetic prices.
Maintains a simple position ledger: cash + shares per symbol.
All state is in-memory (resets on server restart).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class Fill:
    symbol: str
    side: str          # BUY | SELL | HOLD
    quantity: float
    price: float
    fee: float
    timestamp: str
    pnl: float = 0.0


@dataclass
class Position:
    symbol: str
    quantity: float = 0.0
    average_price: float = 0.0
    realized_pnl: float = 0.0


class PaperTradingEngine:
    """
    Simple paper trading engine.

    Attributes
    ----------
    initial_cash : float
        Starting cash balance (default $100 000).
    commission_bps : float
        Commission rate in basis points (default 2 bps).
    """

    def __init__(self, initial_cash: float = 100_000.0, commission_bps: float = 2.0):
        self._initial_cash = initial_cash
        self._cash = initial_cash
        self._commission_bps = commission_bps
        self._positions: dict[str, Position] = {}
        self.trades: list[dict[str, Any]] = []

    # ── Public API ────────────────────────────────────────────────────────────

    def execute_decision(self, decision: Any, latest_price: float) -> dict[str, Any]:
        """
        Execute a MetaAgent decision and return the fill summary.

        Parameters
        ----------
        decision : Decision
            The decision returned by MetaAgent.decide().
        latest_price : float
            Current market price (e.g. from the last OHLCV bar close).
        """
        symbol = decision.symbol
        action = decision.action
        position_size = decision.position_size  # shares to buy

        if action == "HOLD" or latest_price <= 0:
            return self._fill_record(symbol, "HOLD", 0.0, latest_price, 0.0, 0.0)

        if action == "BUY":
            return self._execute_buy(symbol, position_size, latest_price)
        if action == "SELL":
            return self._execute_sell(symbol, latest_price)

        return self._fill_record(symbol, "HOLD", 0.0, latest_price, 0.0, 0.0)

    def snapshot(self) -> dict[str, Any]:
        """Return current portfolio state."""
        equity = self._cash
        positions_out: dict[str, Any] = {}

        for sym, pos in self._positions.items():
            if pos.quantity > 0:
                positions_out[sym] = pos.quantity
                # We don't have live prices here — use average price as proxy
                equity += pos.quantity * pos.average_price

        return {
            "cash": round(self._cash, 2),
            "equity": round(equity, 2),
            "gross_exposure": round(equity - self._cash, 2),
            "trade_count": len(self.trades),
            "positions": positions_out,
            "pnl": round(equity - self._initial_cash, 2),
        }

    def reset(self) -> None:
        """Reset to initial state (useful for testing)."""
        self._cash = self._initial_cash
        self._positions.clear()
        self.trades.clear()

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _execute_buy(self, symbol: str, quantity: float, price: float) -> dict[str, Any]:
        if quantity <= 0:
            quantity = self._cash * 0.10 / price  # default: 10% of cash

        notional = quantity * price
        fee = notional * self._commission_bps / 10_000

        if self._cash < notional + fee:
            # Scale down to available cash
            affordable = self._cash / (price * (1 + self._commission_bps / 10_000))
            if affordable < 0.01:
                return self._fill_record(symbol, "HOLD", 0.0, price, 0.0, 0.0)
            quantity = affordable
            notional = quantity * price
            fee = notional * self._commission_bps / 10_000

        self._cash -= notional + fee

        pos = self._positions.setdefault(symbol, Position(symbol=symbol))
        total_qty = pos.quantity + quantity
        pos.average_price = (
            (pos.average_price * pos.quantity + price * quantity) / total_qty
            if total_qty > 0 else price
        )
        pos.quantity = total_qty

        fill = self._fill_record(symbol, "BUY", quantity, price, fee, 0.0)
        self.trades.append(fill)
        logger.info(f"PAPER BUY  {quantity:.2f} {symbol} @ {price:.2f}  fee={fee:.2f}")
        return fill

    def _execute_sell(self, symbol: str, price: float) -> dict[str, Any]:
        pos = self._positions.get(symbol)
        if not pos or pos.quantity <= 0:
            return self._fill_record(symbol, "HOLD", 0.0, price, 0.0, 0.0)

        quantity = pos.quantity
        notional = quantity * price
        fee = notional * self._commission_bps / 10_000
        pnl = (price - pos.average_price) * quantity - fee

        self._cash += notional - fee
        pos.realized_pnl += pnl
        pos.quantity = 0.0
        pos.average_price = 0.0

        fill = self._fill_record(symbol, "SELL", quantity, price, fee, pnl)
        self.trades.append(fill)
        logger.info(f"PAPER SELL {quantity:.2f} {symbol} @ {price:.2f}  pnl={pnl:.2f}")
        return fill

    @staticmethod
    def _fill_record(
        symbol: str, side: str, quantity: float,
        price: float, fee: float, pnl: float,
    ) -> dict[str, Any]:
        return {
            "symbol": symbol,
            "side": side,
            "quantity": round(quantity, 4),
            "price": round(price, 4),
            "fee": round(fee, 4),
            "pnl": round(pnl, 4),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
