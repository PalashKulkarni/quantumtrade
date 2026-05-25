"""
Singleton service instances — imported by all routers.
Redis is optional: app works fully with in-memory caching.
"""
import logging
from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

from data_pipeline.ingestion import MarketDataService
market_data_service = MarketDataService(redis_url=settings.redis_url)  # None = in-memory cache

from ml_engine.meta_agent import MetaAgent
meta_agent = MetaAgent()

from paper_trading.engine import PaperTradingEngine
paper_trading_engine = PaperTradingEngine()

from backtesting.engine import BacktestEngine
backtest_engine = BacktestEngine(
    market_data_service=market_data_service,
    meta_agent=meta_agent,
)

logger.info("All services initialised (demo mode — Redis optional).")
