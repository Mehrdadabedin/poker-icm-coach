"""The version surface has one source, and the sdist carries no credentials."""
from __future__ import annotations

import tomllib
from importlib.metadata import PackageNotFoundError
from pathlib import Path

import pytest

from app.core import version as version_module
from app.main import app
from tests.api_helpers import login_client


def test_version_comes_from_distribution_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(version_module, "distribution_version", lambda _name: "1.4.0")
    assert version_module.app_version() == "1.4.0"


def test_unstamped_checkout_reports_dev(monkeypatch: pytest.MonkeyPatch) -> None:
    def missing(_name: str) -> str:
        raise PackageNotFoundError(_name)

    monkeypatch.setattr(version_module, "distribution_version", missing)
    assert version_module.app_version() == "0.0.0+dev"


def test_health_reports_the_same_version_as_the_openapi_document() -> None:
    reported = login_client().get("/api/health").json()["version"]
    assert reported == app.version
    assert reported == version_module.app_version()


def test_sdist_packs_an_allowlist_not_the_working_tree() -> None:
    """Hatchling reads only a .gitignore under backend/, so the repo rule that
    hides backend/data/ does not protect an sdist. Without this allowlist the
    sdist packs data/users.json and data/sessions.json."""
    config = tomllib.loads(
        (Path(__file__).resolve().parents[1] / "pyproject.toml").read_text()
    )
    include = config["tool"]["hatch"]["build"]["targets"]["sdist"]["include"]
    assert include == ["app", "alembic", "alembic.ini", "pyproject.toml"]
