"""Which Google credentials are configured, reported by NAME and never by value.

Kept apart from the OAuth flow so that diagnosing a deployment that forgot a
variable does not require reading the authorization-code implementation.
"""
from __future__ import annotations

from app.core.config import Settings

# Environment variable names, reported (never their values) when unset, so a
# deployment that forgot one can be diagnosed from outside the process.
REQUIRED_SETTINGS = ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")


def missing_configuration(config: Settings) -> list[str]:
    """Names of the required variables that are blank. Never returns a value."""
    values = {
        "GOOGLE_CLIENT_ID": config.google_client_id,
        "GOOGLE_CLIENT_SECRET": config.google_client_secret,
    }
    return [name for name in REQUIRED_SETTINGS if not values[name]]


def is_configured(config: Settings) -> bool:
    """Google sign-in needs both credentials; a lone client_id stays disabled."""
    return not missing_configuration(config)
