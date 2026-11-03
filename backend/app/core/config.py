"""Application configuration loaded from environment variables."""
from __future__ import annotations

from typing import Annotated, Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def sqlalchemy_url(url: str) -> str:
    """Render hands out `postgres://` / `postgresql://` URLs, which SQLAlchemy maps
    to psycopg2. Only psycopg 3 is installed, so name that driver explicitly."""
    for scheme in ("postgres://", "postgresql://"):
        if url.startswith(scheme):
            return "postgresql+psycopg://" + url[len(scheme):]
    return url


# "5/900" is 5 requests per 900 seconds (plan 109).
RateText = Annotated[str, Field(pattern=r"^[1-9][0-9]*/[1-9][0-9]*$")]


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
    # Saved hand history per user and tournament (plan 076). "auto" saves it in
    # the database when accounts live there (AUTH_STORAGE=database).
    history_storage: Literal["auto", "database", "off"] = "auto"
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

    # Rate limits (plan 109). Off until TRUSTED_PROXY_HOPS is right for the host.
    rate_limits_enabled: bool = False
    # How many proxies sit in front of the app. 0 ignores X-Forwarded-For.
    trusted_proxy_hops: int = Field(default=0, ge=0, le=10)
    rate_limit_log_client_ip: bool = False
    rate_limit_coach_mode: Literal["log", "enforce"] = "log"
    rate_limit_login_pair: RateText = "5/900"
    rate_limit_login_ip: RateText = "30/900"
    rate_limit_signup_attempts: RateText = "20/3600"
    rate_limit_signup_hour: RateText = "5/3600"
    rate_limit_signup_day: RateText = "20/86400"
    rate_limit_google: RateText = "30/60"
    rate_limit_coach_table: RateText = "120/60"
    rate_limit_coach_page_minute: RateText = "30/60"
    rate_limit_coach_page_day: RateText = "1000/86400"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
