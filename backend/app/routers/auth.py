"""
Auth router — Demo mode.
All endpoints return the demo user. No passwords, no JWT, no registration required.
Kept for API compatibility and Swagger documentation.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_session
from backend.app.middleware.auth import require_auth, DEMO_USER_EMAIL, DEMO_USER_NAME
from backend.app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class DemoUserResponse(BaseModel):
    id: int
    email: str
    name: str
    plan: str
    onboarding_complete: bool
    preferred_currency: str
    preferred_markets: str
    avatar_url: str | None = None
    mode: str = "demo"


def _user_out(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "plan": user.plan,
        "onboarding_complete": user.onboarding_complete,
        "preferred_currency": user.preferred_currency,
        "preferred_markets": user.preferred_markets,
        "avatar_url": user.avatar_url,
        "mode": "demo",
    }


@router.get("/me", response_model=DemoUserResponse)
async def me(current_user: User = Depends(require_auth)):
    """Returns the demo user profile."""
    return _user_out(current_user)


@router.post("/demo")
async def get_demo_access(db: AsyncSession = Depends(get_session)):
    """Instant demo access — no credentials required."""
    from backend.app.middleware.auth import _get_or_create_demo_user
    user = await _get_or_create_demo_user(db)
    return {
        "access_token": "demo-mode-no-token-required",
        "token_type": "demo",
        "user": _user_out(user),
    }
