# Institutional Terminal Upgrade

QuantumTrade AI now presents as an AI-native trading operating system rather than a simple dashboard.

## Added Experience Layers

- Premium command-palette market search with NSE, NASDAQ, NYSE, LSE, TSE, Euronext, ETF, and crypto examples.
- Currency display controls with INR as the default.
- Advanced chart stack with candles, EMA, SMA, VWAP, Bollinger bands, volume, execution markers, RSI, MACD, timeframe controls, and fullscreen mode.
- Live terminal-style market log for agent activity, regime changes, risk alerts, and simulated execution events.
- Animated multi-agent orchestration graph with Momentum, Mean Reversion, Sentiment, Volatility, Risk, Allocation, Macro, and Forecasting agents.
- Explainability panel with feature contribution bars, confidence pulse, and reasoning-tree modal.
- AI market commentary, market heatmap, unusual volume, breadth, news impact, and volatility forecast panels.
- Portfolio factor exposure and scenario stress testing views.
- Integrated Quantum Copilot chat with context-aware finance, risk, sentiment, and decision explanations.

## Production Direction

The frontend is structured around reusable terminal modules in `frontend/components` and deterministic demo data in `frontend/lib/terminal-data.ts`. Backend live data, broker integration, and hosted AI inference can replace the current simulation contracts without changing the dashboard composition.

## Live Data Upgrade

- `frontend/app/api/market-data/[symbol]/route.ts` now proxies Yahoo Finance chart data directly from the Next.js app.
- `frontend/lib/quant-engine.ts` computes regime, agent votes, feature contributions, position sizing, risk, stress tests, heatmaps, and commentary from the returned OHLCV bars.
- The dashboard displays provider and sync status so users can see whether the terminal is using live data.
- Performance analytics now derive Sharpe, drawdown, win rate, and equity curve from loaded market bars instead of fixed demo values.
