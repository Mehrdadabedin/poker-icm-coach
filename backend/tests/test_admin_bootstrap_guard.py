"""The startup Admin bootstrap has no shipped default password.

admin_bootstrap_password used to default to "admin1234", so every deployment
that did not override it got an Admin with a public password. Blank or short
values now skip creating Admin and log a warning that never contains the value.
"""
from __future__ import annotations

import logging

import pytest

from app.core.config import Settings
from app.services.user_registry import UserRegistry
from app.services.user_registry_admin import ADMIN_BOOTSTRAP_MIN_LENGTH, bootstrap_admin

LOGGER = "app.services.user_registry_admin"


def test_default_bootstrap_password_is_blank(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ADMIN_BOOTSTRAP_PASSWORD", raising=False)
    assert Settings(_env_file=None).admin_bootstrap_password == ""  # type: ignore[call-arg]


@pytest.mark.parametrize("password", ["", "Short-pass1"])
def test_blank_or_short_password_skips_admin(password: str, caplog: pytest.LogCaptureFixture) -> None:
    assert len(password) < ADMIN_BOOTSTRAP_MIN_LENGTH
    registry = UserRegistry()
    with caplog.at_level(logging.WARNING, logger=LOGGER):
        assert bootstrap_admin(registry, password) is False
    assert "Admin" not in dict(registry.account_snapshot()), "Admin created with a weak bootstrap password"
    warnings = [r for r in caplog.records if r.name == LOGGER and r.levelno == logging.WARNING]
    assert len(warnings) == 1
    message = warnings[0].getMessage()
    assert "Admin bootstrap skipped" in message
    if password:
        assert password not in message


def test_settings_default_skips_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.services.user_registry_admin as admin_module

    monkeypatch.setattr(admin_module, "settings", Settings(_env_file=None))  # type: ignore[call-arg]
    registry = UserRegistry()
    assert bootstrap_admin(registry) is False
    assert "Admin" not in dict(registry.account_snapshot())


def test_long_enough_password_creates_admin() -> None:
    registry = UserRegistry()
    assert bootstrap_admin(registry, "Bootstrap-Pass-12") is True
    assert registry.is_admin("Admin")
    assert registry.requires_password_change("Admin")
