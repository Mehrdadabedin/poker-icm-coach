"""Application configuration loaded from environment variables."""
from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


def sqlalchemy_url(url: str) -> str:
    """Render hands out `postgres://` / `postgresql://` URLs, which SQLAlchemy maps
    to psycopg2. Only psycopg 3 is installed, so name that driver explicitly."""
    for scheme in ("postgres://", "postgresql://"):
        if url.startswith(scheme):
            return "postgresql+psycopg://" + url[len(scheme):]
    return url


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
    # "database" keeps accounts and logins in PostgreSQL (DATABASE_URL), so they
    # survive redeploys on hosts with an ephemeral disk such as Render. The
    # files above then only seed an empty database once.
    auth_storage: Literal["file", "database"] = "file"
    # Initial Admin identities (A01): comma-separated usernames granted
    # Admin level on this deployment. Usernames only; no secrets.
    admin_usernames: str = ""
    # Bootstrap password for the initial Admin account (created once, hashed,
    # forced to change on first login). No default: blank or shorter than 12
    # characters skips creating Admin. Set per deployment; never logged.
    admin_bootstrap_password: str = ""

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
