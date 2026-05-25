from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "QuantumTrade AI"
    environment: str = "development"

    # Database — defaults to SQLite, zero setup required
    database_url: str = "sqlite+aiosqlite:///./quantumtrade.db"

    # Redis — optional, app runs fine without it (in-memory cache used)
    redis_url: str | None = None

    # Market data providers — all optional
    alpha_vantage_api_key: str | None = None
    polygon_api_key: str | None = None

    # AI — not needed in demo mode (mock AI used by default)
    anthropic_api_key: str | None = None

    # CORS — wildcard for demo/dev; restrict to your domains in production
    allowed_origins: str = "*"

    # Backtesting defaults
    default_commission_bps: float = 2.0
    default_slippage_bps: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        raw = self.allowed_origins.strip()
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
