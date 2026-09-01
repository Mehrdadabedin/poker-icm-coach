"""Application configuration loaded from environment variables."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Overridable via environment variables (see .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://poker:poker@localhost:5433/poker_icm_coach"
    cors_origins: str = "http://localhost:5173,http://localhost:4173,http://localhost:8080,https://icm-master-frontend.onrender.com"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    starting_stack: int = 45_000
    starting_small_blind: int = 100
    starting_big_blind: int = 100
    blind_level_minutes: int = 20
    fast_mode: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
