"""
Background task worker.

Celery is optional — if not installed, a no-op stub is used so the app boots.
To enable real background tasks:
    pip install celery
    celery -A backend.app.worker.celery_app worker --loglevel=INFO
"""
import logging

from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

try:
    from celery import Celery  # type: ignore[import]

    celery_app = Celery(
        "quantumtrade_ai",
        broker=settings.redis_url,
        backend=settings.redis_url,
    )

    @celery_app.task
    def refresh_market_cache(symbol: str, timeframe: str = "1d") -> dict:
        return {"symbol": symbol, "timeframe": timeframe, "status": "queued"}

    logger.info("Celery worker initialised.")

except ImportError:
    logger.info("Celery not installed — background tasks disabled. Run: pip install celery")

    class _StubCelery:
        """Minimal stub so imports of celery_app don't crash."""
        def task(self, fn=None, **kwargs):
            if fn is not None:
                return fn
            def decorator(f):
                return f
            return decorator

    celery_app = _StubCelery()  # type: ignore[assignment]

    def refresh_market_cache(symbol: str, timeframe: str = "1d") -> dict:
        return {"symbol": symbol, "timeframe": timeframe, "status": "celery_not_installed"}
