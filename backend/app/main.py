"""
QuantumTrade AI — FastAPI backend.

Demo mode: runs instantly with zero configuration.
  uvicorn backend.app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.app.database import engine
from backend.app.logging_config import configure_logging
from backend.app.models import Base
from backend.app.routers import (
    agents, alerts, auth, backtests, chat,
    market_data, news, paper_trading, portfolio, websocket,
)

configure_logging()
settings = get_settings()

app = FastAPI(
    title="QuantumTrade AI",
    version="0.3.0",
    description=(
        "AI-native institutional trading OS. "
        "**Demo mode** — all endpoints work without authentication. "
        "No API keys required."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — open for demo. Restrict allowed_origins env var in production.
origins = settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=origins != ["*"],  # credentials=True requires explicit origin list
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Create all tables and seed demo user on first boot."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Eagerly create demo user so first request is instant
    from backend.app.database import AsyncSessionLocal
    from backend.app.middleware.auth import _get_or_create_demo_user
    async with AsyncSessionLocal() as db:
        await _get_or_create_demo_user(db)


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router,          prefix="/api")
app.include_router(market_data.router,   prefix="/api", tags=["market-data"])
app.include_router(agents.router,        prefix="/api", tags=["agents"])
app.include_router(backtests.router,     prefix="/api", tags=["backtesting"])
app.include_router(portfolio.router,     prefix="/api", tags=["portfolio"])
app.include_router(chat.router,          prefix="/api", tags=["chat"])
app.include_router(paper_trading.router, prefix="/api", tags=["paper-trading"])
app.include_router(alerts.router,        prefix="/api", tags=["alerts"])
app.include_router(news.router,          prefix="/api", tags=["news"])
app.include_router(websocket.router,     tags=["websocket"])


@app.get("/health", tags=["meta"])
async def health():
    return {
        "status": "ok",
        "service": "quantumtrade-ai",
        "version": "0.3.0",
        "mode": "demo",
        "auth": "disabled",
        "ai": "mock",
    }
