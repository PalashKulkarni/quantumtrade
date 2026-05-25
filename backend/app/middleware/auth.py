"""
Auth middleware — DEMO MODE.

All routes use DEMO_USER_ID = 1 automatically.
No JWT validation, no bearer tokens, no login required.

The full auth implementation is preserved below (commented out)
so it can be re-enabled by swapping the dependency functions.
"""
from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from backend.app.database import get_session
from backend.app.models import User

logger = logging.getLogger(__name__)

DEMO_USER_ID = 1
DEMO_USER_EMAIL = "demo@quantumtrade.ai"
DEMO_USER_NAME = "Demo Trader"


async def _get_or_create_demo_user(db: AsyncSession) -> User:
    """Return the demo user, creating it on first boot if necessary."""
    result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(
        id=DEMO_USER_ID,
        email=DEMO_USER_EMAIL,
        name=DEMO_USER_NAME,
        provider="demo",
        is_verified=True,
        is_active=True,
        plan="pro",
        onboarding_complete=True,
        preferred_currency="INR",
        preferred_markets="NSE,NASDAQ",
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
        logger.info("Demo user created (id=1)")
    except Exception:
        await db.rollback()
        # Already exists (race condition) — just fetch it
        result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
        user = result.scalar_one()
    return user


async def require_auth(db: AsyncSession = Depends(get_session)) -> User:
    """
    Demo mode: always returns the demo user. No token required.
    Swagger UI works immediately — no lock icon, no bearer token needed.
    """
    return await _get_or_create_demo_user(db)


async def optional_auth(db: AsyncSession = Depends(get_session)) -> User | None:
    """Demo mode: always returns the demo user."""
    return await _get_or_create_demo_user(db)


def require_plan(*plans: str):
    """Demo mode: plan check always passes (demo user has 'pro' plan)."""
    async def _check(current_user: User = Depends(require_auth)) -> User:
        return current_user
    return _check


# ─── Password utils (kept for completeness, not used in demo mode) ────────────

def hash_password(plain: str) -> str:
    import bcrypt
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    import bcrypt
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(user_id: int, email: str, plan: str) -> str:
    """Kept for API compatibility — not used in demo mode."""
    return f"demo-token-{user_id}"
