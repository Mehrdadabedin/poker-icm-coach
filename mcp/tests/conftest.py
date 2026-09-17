"""Shared fixtures. No network, no real credentials, no real OAuth login."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

MCP_ROOT = Path(__file__).resolve().parents[1]
if str(MCP_ROOT) not in sys.path:
    sys.path.insert(0, str(MCP_ROOT))

import config  # noqa: E402
import diagnostics.callback as callback_module  # noqa: E402
import diagnostics.cookies as cookies_module  # noqa: E402
import diagnostics.health as health_module  # noqa: E402
import diagnostics.oauth_routes as routes_module  # noqa: E402

SECRET_SENTINEL = "sentinel-client-secret-value-1234567890"


@pytest.fixture
def clean_env(monkeypatch):
    """Environment without any Google or CORS setting, so presence is decided
    by the test and not by the shell that runs it."""
    for name in (
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REDIRECT_URI",
        "CORS_ORIGINS",
        "ICM_MCP_BACKEND_URL",
        "ICM_MCP_ALLOWED_HOSTS",
    ):
        monkeypatch.delenv(name, raising=False)
    return monkeypatch


@pytest.fixture
def isolated_env_file(tmp_path, monkeypatch):
    """backend/.env and frontend/.env.production pointed at empty temp files."""
    backend_env = tmp_path / "backend.env"
    backend_env.write_text("")
    frontend_env = tmp_path / "frontend.env"
    monkeypatch.setattr(config, "BACKEND_ENV_FILE", backend_env)
    monkeypatch.setattr(config, "FRONTEND_PROD_ENV_FILE", frontend_env)
    return backend_env, frontend_env


def _ok(payload: dict, status: int = 200) -> dict:
    return {"ok": True, "http_status": status, "latency_ms": 1.0, "json": payload}


@pytest.fixture
def fake_backend(monkeypatch):
    """Replace the HTTP seam with a callable the test controls."""

    def install(handler):
        async def fake_get_json(base_url: str, path: str) -> dict:
            return handler(base_url, path)

        monkeypatch.setattr(health_module, "get_json", fake_get_json)
        monkeypatch.setattr(routes_module, "get_json", fake_get_json)
        return fake_get_json

    return install


@pytest.fixture
def healthy_backend(fake_backend):
    """A backend that answers health, providers and OpenAPI."""

    def handler(base_url, path):
        if path.endswith("/health"):
            return _ok({"status": "ok"})
        if path.endswith("/providers"):
            return _ok({"google": True, "apple": False, "phone": False, "google_missing": []})
        paths = {"/api/auth/google/start": {}, "/api/auth/google/callback": {}}
        return _ok({"paths": paths})

    return fake_backend(handler)


@pytest.fixture
def unreachable_backend(fake_backend):
    def handler(base_url, path):
        return {"ok": False, "error": "ConnectError: connection refused", "url": base_url + path}

    return fake_backend(handler)


def result_text(result) -> str:
    """Text of a CallToolResult, for leak assertions."""
    return json.dumps([block.text for block in result.content], default=str)
