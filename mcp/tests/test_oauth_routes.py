"""Route detection against the real router, plus degraded inputs."""
from __future__ import annotations

from diagnostics.oauth_routes import check_oauth_routes, static_scan


async def test_real_router_defines_both_google_routes(unreachable_backend, clean_env):
    report = await check_oauth_routes()
    assert report["routes_found"] is True
    assert report["authorization_route"] == "/api/auth/google/start"
    assert report["callback_route"] == "/api/auth/google/callback"
    assert report["router_prefix"] == "/api/auth"
    assert report["status"] == "ok"


async def test_live_openapi_confirms_the_source_scan(healthy_backend, clean_env):
    report = await check_oauth_routes("http://127.0.0.1:8000")
    assert report["live_check"]["attempted"] is True
    assert report["live_check"]["reachable"] is True
    assert report["live_check"]["routes_match_source"] is True


async def test_missing_router_file_is_reported_not_raised(tmp_path, monkeypatch, unreachable_backend, clean_env):
    import diagnostics.oauth_routes as routes_module

    monkeypatch.setattr(routes_module, "ROUTES_FILE", tmp_path / "absent.py")
    report = await check_oauth_routes()
    assert report["routes_found"] is False
    assert report["status"] == "error"
    assert any("cannot read" in note for note in report["notes"])


async def test_router_without_google_routes_is_not_found(tmp_path, monkeypatch, unreachable_backend, clean_env):
    import diagnostics.oauth_routes as routes_module

    other = tmp_path / "routes_other.py"
    other.write_text(
        'router = APIRouter(prefix="/api/other")\n\n'
        '@router.get("/thing")\ndef thing():\n    return {}\n'
    )
    monkeypatch.setattr(routes_module, "ROUTES_FILE", other)
    report = await check_oauth_routes()
    assert report["routes_found"] is False
    assert report["authorization_route"] is None
    assert report["callback_route"] is None
    assert report["router_prefix"] == "/api/other"


def test_static_scan_reads_the_callback_suffix_constant():
    scan = static_scan()
    assert scan["ok"] is True
    assert scan["callback_suffix_constant"] == "/api/auth/google/callback"
    assert {r["path"] for r in scan["routes"]} >= {
        "/api/auth/providers",
        "/api/auth/google/start",
        "/api/auth/google/callback",
    }
