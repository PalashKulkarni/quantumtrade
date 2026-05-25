<div align="center">

```
 ██████  ██    ██  █████  ███    ██ ████████ ██    ██ ███    ███
██    ██ ██    ██ ██   ██ ████   ██    ██    ██    ██ ████  ████
██    ██ ██    ██ ███████ ██ ██  ██    ██    ██    ██ ██ ████ ██
██ ▄▄ ██ ██    ██ ██   ██ ██  ██ ██    ██    ██    ██ ██  ██  ██
 ██████   ██████  ██   ██ ██   ████    ██     ██████  ██      ██
    ▀▀                         TRADE  AI
```

**An AI-native institutional trading operating system.**  
Multi-agent decisioning. Explainable AI. Real-time risk intelligence.  
Built for the terminal. Runs in your browser.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

</div>

---

## What is this?

QuantumTrade AI is a full-stack, production-grade trading intelligence platform that brings institutional-level tooling to individual investors. It combines a six-agent AI ensemble, a live market data pipeline, a quantitative backtesting engine, a portfolio risk suite, and a conversational AI copilot — all running locally, instantly, with zero setup friction.

No paid APIs. No login walls. No bloat. Just open it and trade smarter.

---

## Features

### 🤖 Six-Agent AI Ensemble
The core of QuantumTrade is a `MetaAgent` — a weighted ensemble of six independent sub-agents that each analyse the market from a different lens and vote on a final decision.

| Agent | Strategy |
|---|---|
| **Momentum** | Trend direction + MACD crossover signal |
| **Mean Reversion** | RSI extremes + Bollinger Band position |
| **Volatility** | ATR-filtered regime suppression |
| **Sentiment** | Tape-implied sentiment from price action |
| **Risk Manager** | Hard veto on high-volatility regimes |
| **Allocation** | Regime-aware position sizing overlay |

Every decision comes with a confidence score, per-agent vote breakdown, feature importance weights, market regime classification, and a plain-English explanation.

### 📈 Live Market Data
Real-time OHLCV data via Yahoo Finance with automatic NSE/BSE routing. Type `RELIANCE`, `TCS`, `INFY` — no `.NS` suffix needed. The data pipeline resolves 50+ Nifty tickers automatically, with a synthetic fallback that keeps the app functional even when Yahoo rate-limits.

Supported: NSE · BSE · NASDAQ · NYSE · Crypto · Forex

### 💬 AI Copilot — Streaming Chat
A conversational AI analyst built into the dashboard. Ask it anything about your portfolio, market conditions, or investment strategy and get back institutional-quality, streaming responses word by word — complete with animated tool-call badges showing what it's "doing" behind the scenes.

The copilot understands nine analytical domains:

- Portfolio drop analysis & attribution
- Market crash / stress scenario modelling
- Sharpe ratio improvement pathways
- Sector exposure & concentration risk
- Full risk breakdown (beta, VaR, drawdown, Sortino)
- Stock purchase decision framework
- Diversification quality analysis
- Volatility regime assessment
- Portfolio optimisation (Mean-Variance, Black-Litterman concepts)

### 🔬 Strategy Backtester
Replay the AI meta-agent's decisions against real historical data. Configure symbol, timeframe, initial capital (up to $1M), commission, and slippage — then get back:

- **Equity curve** — area chart with reference line at initial capital
- **Drawdown chart** — peak-to-trough loss over time
- **Monthly returns heatmap** — 24-month bar chart, green/red coloured
- **Full trade log** — every BUY/SELL with quantity, price, and fee
- **Risk metrics** — Sharpe, Sortino, CAGR, alpha, beta, profit factor, win rate, max drawdown

### 🏦 Portfolio Risk Engine
Upload your holdings via CSV or add them manually. The engine computes:

- **Unrealised P&L** with live prices fetched concurrently across all tickers
- **Portfolio beta** vs SPY benchmark
- **Sharpe ratio** on actual historical return distribution
- **Sector & asset class exposure** breakdown
- **Correlation matrix** across all holdings
- **Four stress tests** — 2008 crash, COVID shock, rate hike cycle, tech selloff
- **Health score** — composite rating with specific, actionable recommendations

All 48 tickers fetch in parallel. Cold cache takes ~4–6s. Warm cache (subsequent loads): instant.

### 📰 News Intelligence
Holdings-linked news from Yahoo Finance RSS, sentiment-scored in real time. Every article gets a keyword sentiment score (positive / negative / neutral) displayed as a micro-bar. The panel shows a live sentiment distribution bar across your entire portfolio and filters by sentiment category.

### 🔔 Price Alerts
Set above/below threshold alerts on any supported symbol. Alerts are stored per-session and can be evaluated on-demand. Triggered alerts appear as a dismissible banner with the actual price vs target.

### 📊 Explainability Panel
The dashboard surfaces the AI's reasoning at every level — confidence pulse (animated bar), feature importance chart, regime classification, per-agent vote percentages, and a full plain-English explanation for every decision. Nothing is a black box.

### 🖥️ Live Terminal Feed
A scrolling event feed on the dashboard shows every market event, agent decision, and system message in real time — styled like a Bloomberg terminal, updating on every 12-second polling cycle.

### 📄 Paper Trading Engine
An in-memory paper trading engine tracks position entries, exits, realised P&L, cash balance, and total equity against simulated fills with commission and slippage applied. The WebSocket endpoint pushes live portfolio snapshots to the frontend.

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend                                                        │
│  Next.js 15 · TypeScript · Tailwind CSS · Framer Motion         │
│  Recharts · Zustand · cmdk · React Markdown                      │
├─────────────────────────────────────────────────────────────────┤
│  Backend                                                         │
│  FastAPI · SQLAlchemy 2 (async) · SQLite / PostgreSQL            │
│  Alembic · Pydantic v2 · Uvicorn                                 │
├─────────────────────────────────────────────────────────────────┤
│  AI & Quant Engine                                               │
│  Custom 6-agent MetaAgent (NumPy + Pandas, no ML frameworks)     │
│  Mock AI copilot (45+ institutional responses, SSE streaming)    │
│  Backtesting engine with Sharpe, Sortino, alpha, beta, CAGR      │
├─────────────────────────────────────────────────────────────────┤
│  Data                                                            │
│  Yahoo Finance (yfinance) · NSE/BSE auto-routing                 │
│  In-memory cache (4h TTL for daily bars)                         │
│  Synthetic fallback provider (always available)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

No API keys. No environment variables. No Docker. Just Python and Node.

### Backend

```bash
cd quantumtrade

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\Activate.ps1       # Windows PowerShell

# Install dependencies
pip install -r backend/requirements.txt

# Start
python -m uvicorn backend.app.main:app --reload --port 8000
```

→ API live at `http://localhost:8000`  
→ Interactive docs at `http://localhost:8000/docs` — no auth token needed

### Frontend

```bash
cd quantumtrade/frontend
npm install
npm run dev
```

→ Dashboard at `http://localhost:3000` — opens directly, no login

### Sample Portfolio

A sample CSV with 48 real holdings (35 NSE + 13 US stocks) is included:

```
quantumtrade/sample-portfolio.csv
```

Open the dashboard → **Manage Portfolio** → drag and drop the file.

---

## Project Structure

```
quantumtrade/
│
├── backend/app/
│   ├── main.py                     Entry point, CORS, startup seeding
│   ├── models.py                   SQLAlchemy ORM models
│   ├── middleware/auth.py          Demo mode — auto demo user, no JWT
│   ├── routers/
│   │   ├── agents.py               POST /api/decisions
│   │   ├── backtests.py            POST /api/backtests/run
│   │   ├── chat.py                 POST /api/chat/stream (SSE)
│   │   ├── portfolio.py            GET/POST /api/portfolio
│   │   ├── alerts.py               CRUD /api/alerts
│   │   ├── news.py                 GET /api/news
│   │   ├── market_data.py          GET /api/market-data/{symbol}
│   │   └── websocket.py            WS /ws/live
│   └── services/
│       ├── mock_ai.py              AI copilot — 9 categories, 45+ responses
│       ├── portfolio_analytics.py  Beta, Sharpe, stress tests, correlations
│       └── news.py                 Yahoo RSS + keyword sentiment scoring
│
├── ml_engine/
│   └── meta_agent.py               6-agent ensemble decision engine
│
├── data_pipeline/
│   ├── providers.py                NSE + Yahoo + Synthetic fallback chain
│   └── ingestion.py                In-memory cached MarketDataService
│
├── backtesting/
│   ├── engine.py                   Historical strategy simulation
│   └── metrics.py                  Sharpe, Sortino, CAGR, alpha, beta
│
├── paper_trading/
│   └── engine.py                   In-memory paper trading with P&L
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                Main dashboard
│   │   ├── backtests/page.tsx      Strategy backtesting lab
│   │   └── alerts/page.tsx         Price alert management
│   ├── components/
│   │   ├── ai-chat-panel.tsx       Streaming AI chat (SSE consumer)
│   │   ├── news-intelligence.tsx   News feed with sentiment scoring
│   │   ├── portfolio-manager.tsx   Holdings CRUD + CSV import
│   │   ├── agent-orchestration.tsx Agent vote visualisation
│   │   └── explainability-panel.tsx Decision breakdown + feature importance
│   ├── lib/
│   │   ├── quant-engine.ts         Client-side quant analysis
│   │   ├── markets.ts              Symbol universe + currency conversion
│   │   └── config.ts               API base URL (env var aware)
│   └── store/
│       └── use-dashboard-store.ts  Zustand global state
│
├── sample-portfolio.csv            48 real holdings ready to import
└── alembic/                        DB migrations (production use)
```

---

## API Reference

All endpoints are available at `http://localhost:8000/docs` with no authentication required.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/portfolio` | Get current holdings |
| `POST` | `/api/portfolio/holdings` | Save holdings + return analytics |
| `GET` | `/api/portfolio/analytics` | Full risk analytics |
| `POST` | `/api/decisions` | Run AI meta-agent on a symbol |
| `POST` | `/api/chat/stream` | SSE streaming AI chat |
| `GET` | `/api/chat/history` | Load conversation history |
| `POST` | `/api/backtests/run` | Run historical backtest |
| `GET` | `/api/news` | Sentiment-scored news feed |
| `GET/POST/DELETE` | `/api/alerts` | Price alert management |
| `POST` | `/api/alerts/check` | Evaluate alerts against live prices |
| `WS` | `/ws/live?symbol=X` | Live market tick WebSocket |

---

## Deployment

### Frontend → Vercel

```bash
# Set in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

vercel --prod
```

### Backend → Railway

```bash
# Railway auto-detects nixpacks.toml
# Set environment variable:
ALLOWED_ORIGINS=https://your-app.vercel.app

# Start command (already in railway.json):
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Optional environment variables for production:

```env
DATABASE_URL=postgresql+asyncpg://...   # Upgrade from SQLite
ANTHROPIC_API_KEY=sk-ant-...            # Enable real Claude AI
ALLOWED_ORIGINS=https://yourapp.com     # Restrict CORS
```

---

## Contributor

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/palashkulkarni.png" width="80" style="border-radius:50%" onerror="this.src='https://ui-avatars.com/api/?name=Palash+Kulkarni&background=0d1117&color=3ddbda&size=80'"/><br/>
      <strong>Palash Kulkarni</strong><br/>
      <sub>Author & Maintainer</sub>
    </td>
  </tr>
</table>

---

<div align="center">

Built with obsessive attention to detail by **Palash Kulkarni**

*No AI was harmed in the making of this AI trading platform.*

</div>