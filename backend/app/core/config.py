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
    history_dir: str = "data/history"
    auth_users_file: str = "data/users.json"
    auth_sessions_file: str = "data/sessions.json"

    # Google sign-in. Only read from the environment; never logged or returned.
    # Both values are required before the provider is advertised as available.
    google_client_id: str = ""
    google_client_secret: str = ""
    # Public backend callback override. Blank derives it from the request
    # (X-Forwarded-Proto/Host), which is what Render's proxy needs.
    google_redirect_uri: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
