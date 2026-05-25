from fastapi import APIRouter, Depends, Query
from backend.app.middleware.auth import require_auth
from backend.app.models import User
from backend.app.services.news import fetch_news_for_symbols, fetch_market_news

router = APIRouter()


@router.get("/news")
async def get_news(
    symbols: str = Query(default="", description="Comma-separated symbols e.g. RELIANCE.NS,TCS.NS"),
    _: User = Depends(require_auth),
):
    """Fetch news for given symbols. Falls back to general market news if none provided."""
    if symbols.strip():
        symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
        articles = await fetch_news_for_symbols(symbol_list)
    else:
        articles = await fetch_market_news()
    return {"articles": articles, "count": len(articles)}
