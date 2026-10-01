"""A02 read-only registered-account helpers for the future Admin layer.

Backed by UserRegistry's safe (username, provider) snapshot. Never touches
credential fields, users.json writes, auth state, or session data; safe for
repeated calls. Authorization is NOT provided here (A03 exposes these through
protected Admin APIs).
"""
from __future__ import annotations

from dataclasses import dataclass

from app.services.user_registry import UserRegistry, auth_registry

LOCAL = "local"
GOOGLE = "google"


@dataclass(frozen=True, slots=True)
class RegisteredAccount:
    """Safe Admin-facing account view (A02): usernames and account type only.

    No password, hash, salt, OAuth subject, email, token or session material.
    """

    username: str
    provider: str  # "local" or "google"


def _provider_name(provider: str | None) -> str:
    """Map the stored provider value to the safe account-type label."""
    return GOOGLE if provider == "google" else LOCAL


def _snapshot(registry: UserRegistry | None) -> list[tuple[str, str | None]]:
    return list((registry or auth_registry).account_snapshot())


def total_registered_accounts(registry: UserRegistry | None = None) -> int:
    """Total persistent accounts currently in UserRegistry (local + Google).

    This is the permanent core metric, never a today/active/returning count.
    """
    return len(_snapshot(registry))


def account_summary(registry: UserRegistry | None = None) -> dict[str, int]:
    """Provider-aware counts: {total, local, google}."""
    counts: dict[str, int] = {"total": 0, LOCAL: 0, GOOGLE: 0}
    for _name, provider in _snapshot(registry):
        counts["total"] += 1
        counts[_provider_name(provider)] += 1
    return counts


def list_registered_accounts(
    registry: UserRegistry | None = None,
) -> list[RegisteredAccount]:
    """Safe enumeration for the future Admin Users API (A03)."""
    return [
        RegisteredAccount(username=name, provider=_provider_name(provider))
        for name, provider in _snapshot(registry)
    ]
