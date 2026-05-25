# QuantumTrade AI

**AI-native institutional trading operating system — demo-first, zero setup friction.**

> Opens instantly. No API keys. No login. No paid services required.

---

## Features

| Feature | Description |
|---|---|
| 🤖 **Multi-Agent AI** | 6-agent ensemble (Momentum, Mean Reversion, Volatility, Sentiment, Risk Manager, Allocation) |
| 💬 **AI Copilot** | Streaming chat with institutional-grade analysis — mock engine, real experience |
| 📈 **Live Charts** | Real-time OHLCV from Yahoo Finance with technical indicators |
| 🏦 **Portfolio Risk Engine** | Beta, Sharpe, VaR, stress tests, sector exposure, correlation matrix |
| 🔬 **Strategy Backtester** | Equity curve, drawdown chart, monthly heatmap, full trade log |
| 🔔 **Price Alerts** | Above/below threshold alerts with live evaluation |
| 📰 **News Intelligence** | Holdings-linked news with AI sentiment scoring |
| 🇮🇳 **NSE/BSE Support** | 50+ Nifty tickers routed correctly — no suffix needed |
| 📊 **Explainable AI** | Feature importance, confidence pulse, agent vote breakdown |
| 🗒️ **Paper Trading** | In-memory paper trading engine with P&L tracking |

---

## Demo Mode

QuantumTrade runs entirely in **demo mode** by default:

- ✅ No login required — opens straight to dashboard
- ✅ No Anthropic API key — intelligent mock AI engine
- ✅ No Redis — in-memory caching
- ✅ No PostgreSQL — SQLite (auto-created)
- ✅ No paid services of any kind
- ✅ Market data via Yahoo Finance (free)

The AI Copilot uses a **curated response engine** with 9 categories and 45+ institutional-quality responses. It streams word-by-word, shows tool call badges, and feels indistinguishable from a real AI assistant.

---

## Tech Stack

**Frontend:** Next.js 15 · TypeScript · Tailwind CSS · Framer Motion · Recharts · Zustand

**Backend:** FastAPI · SQLAlchemy 2 async · SQLite/PostgreSQL · Python 3.11+

**AI Engine:** Mock AI (demo) · Anthropic Claude optional (set `ANTHROPIC_API_KEY`)

**Market Data:** Yahoo Finance (free) · NSE/BSE via yfinance

---

## Setup — 3 steps

### 1. Backend

```bash
cd quantumtrade

# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
venv\Scripts\Activate.ps1
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start server
python -m uvicorn backend.app.main:app --reload --port 8000
```

✅ Visit http://localhost:8000/docs — Swagger UI, all endpoints work immediately, no auth required.

### 2. Frontend

```bash
cd quantumtrade/frontend
npm install
npm run dev
```

✅ Visit http://localhost:3000 — dashboard opens directly, no login.

### 3. Done

That's it. No environment variables required for the demo.

---

## Optional Configuration

Create a `.env` file in `quantumtrade/` for any optional features:

```env
# Switch to PostgreSQL (SQLite is default)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/quantumtrade

# Enable real Redis caching (in-memory cache is default)
REDIS_URL=redis://localhost:6379/0

# Enable real Claude AI (mock engine is default)
ANTHROPIC_API_KEY=sk-ant-your-key

# Restrict CORS in production (wildcard is default)
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

---

## Deployment

### Frontend → Vercel

```bash
# In Vercel dashboard, set environment variable:
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Deploy
vercel --prod
```

### Backend → Railway / Render

```bash
# Set environment variables in Railway/Render:
DATABASE_URL=postgresql+asyncpg://...   # Railway provides this
ALLOWED_ORIGINS=https://your-app.vercel.app

# Start command:
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

---

## Project Structure

```
quantumtrade/
├── backend/
│   └── app/
│       ├── middleware/auth.py      # Demo mode — always returns demo user
│       ├── models.py               # SQLAlchemy models
│       ├── routers/                # 10 API routers
│       └── services/
│           ├── mock_ai.py          # Mock AI — 45+ institutional responses
│           ├── news.py             # Yahoo RSS + sentiment scoring
│           └── portfolio_analytics.py
├── data_pipeline/
│   ├── providers.py                # NSE + Yahoo + Synthetic fallback
│   └── ingestion.py                # In-memory cached MarketDataService
├── ml_engine/
│   └── meta_agent.py              # 6-agent ensemble decision engine
├── paper_trading/
│   └── engine.py                  # In-memory paper trading
├── backtesting/
│   └── engine.py                  # Historical strategy simulation
└── frontend/
    ├── app/
    │   ├── page.tsx                # Main dashboard (no auth)
    │   ├── backtests/              # Strategy backtesting lab
    │   └── alerts/                 # Price alert management
    ├── components/
    │   ├── ai-chat-panel.tsx       # Streaming AI chat
    │   └── news-intelligence.tsx   # News + sentiment
    └── store/
        └── use-dashboard-store.ts  # Zustand (no auth state)
```

---

## Roadmap

- [ ] Real Anthropic Claude integration (toggle via env var)
- [ ] Zerodha Kite broker connect
- [ ] Options chain with Greeks
- [ ] Tax P&L tracker (STCG/LTCG for India)
- [ ] Strategy marketplace
- [ ] Shareable portfolio cards (OG image generation)
- [ ] Mobile PWA
