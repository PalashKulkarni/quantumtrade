# API Documentation

## REST

- `GET /health` checks service availability.
- `GET /api/market-data/{symbol}?timeframe=1d&limit=200` returns normalized OHLCV bars.
- `GET /api/indicators/{symbol}` returns latest technical indicators.
- `POST /api/decisions` returns meta-agent decision, specialist agent outputs, confidence, sentiment, regime, and explanation.
- `POST /api/backtests` runs a chronological no-lookahead backtest with costs and slippage.
- `GET /api/portfolio` returns paper trading cash, positions, equity, and exposure.
- `POST /api/paper-trading/step` generates and executes a simulated decision.
- `GET /api/paper-trading/trades` returns simulated trade history.

## WebSocket

Connect to `ws://localhost:8000/ws/live`.

Messages include:

```json
{
  "type": "market_tick",
  "symbol": "AAPL",
  "price": 187.42,
  "decision": {},
  "portfolio": {}
}
```

