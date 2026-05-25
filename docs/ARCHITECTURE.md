# Architecture

QuantumTrade AI separates research, execution, serving, and visualization into deployable modules.

- `data_pipeline` owns provider abstraction, retries, cache behavior, validation, and indicators.
- `ml_engine` owns forecasting, sentiment, regime detection, RL environments, risk, portfolio optimization, and agent orchestration.
- `backtesting` owns chronological simulation and metrics.
- `paper_trading` owns simulated execution and live portfolio state.
- `backend` exposes REST and WebSocket APIs.
- `frontend` provides the trading research dashboard.

The default build intentionally supports offline deterministic data so demos and CI remain reliable without market-data credentials.

