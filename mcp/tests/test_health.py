"""Backend health tool: reachable, unreachable, and refused hosts."""
from __future__ import annotations

import pytest

from diagnostics.health import check_backend_health


async def test_healthy_backend_reports_ok(healthy_backend, clean_env):
    report = await check_backend_health("http://127.0.0.1:8000")
    assert report["status"] == "ok"
    assert report["backend_reachable"] is True
    assert report["http_status"] == 200
    assert report["health"] == {"status": "ok"}
    assert report["providers"]["google"] is True
    assert report["read_only"] is True


async def test_unreachable_backend_reports_error(unreachable_backend, clean_env):
    report = await check_backend_health("http://127.0.0.1:8000")
    assert report["status"] == "error"
    assert report["backend_reachable"] is False
    assert "failed" in report["details"]
    assert report["providers"]["available"] is False


async def test_provider_facts_carry_names_not_values(fake_backend, clean_env):
    def handler(base_url, path):
        if path.endswith("/health"):
            return {"ok": True, "http_status": 200, "json": {"status": "ok"}}
        return {
            "ok": True,
            "http_status": 200,
            "json": {"google": False, "google_missing": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]},
        }

    fake_backend(handler)
    report = await check_backend_health()
    assert report["providers"]["google"] is False
    assert report["providers"]["google_missing"] == ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]


async def test_host_outside_the_allowlist_is_refused(clean_env):
    report = await check_backend_health("http://example.invalid:8000")
    assert report["status"] == "error"
    assert report["backend_reachable"] is False
    assert "allowlist" in report["details"]


@pytest.mark.parametrize("bad", ["not-a-url", "ftp://127.0.0.1", "http://"])
async def test_malformed_base_url_is_refused(bad, clean_env):
    report = await check_backend_health(bad)
    assert report["status"] == "error"
    assert report["backend_reachable"] is False


async def test_empty_base_url_falls_back_to_the_configured_default(clean_env, unreachable_backend):
    """An empty string means "not given", so it must not reach the network
    with an empty host."""
    report = await check_backend_health("")
    assert report["base_url"] == "http://127.0.0.1:8000"
    assert report["status"] == "error"


async def test_backend_url_from_the_environment_is_used(clean_env, unreachable_backend):
    clean_env.setenv("ICM_MCP_BACKEND_URL", "http://localhost:9001")
    report = await check_backend_health()
    assert report["base_url"] == "http://localhost:9001"


async def test_extra_allowed_host_can_be_configured(clean_env, unreachable_backend):
    clean_env.setenv("ICM_MCP_ALLOWED_HOSTS", "backend.example")
    report = await check_backend_health("https://backend.example")
    assert report["base_url"] == "https://backend.example"


async def test_non_json_health_body_is_an_error(fake_backend, clean_env):
    def handler(base_url, path):
        return {"ok": False, "http_status": 200, "url": base_url + path}

    fake_backend(handler)
    report = await check_backend_health()
    assert report["status"] == "error"
