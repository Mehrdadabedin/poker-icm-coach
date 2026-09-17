"""Redirect URI derivation: sources, overrides, and honest "unknown"."""
from __future__ import annotations

from diagnostics.callback import check_google_callback_configuration


def test_derived_from_base_url_and_production_env(clean_env, isolated_env_file):
    _, frontend_env = isolated_env_file
    frontend_env.write_text("VITE_API_URL=https://backend.onrender.com\n")
    report = check_google_callback_configuration("http://127.0.0.1:8000")
    assert report["callback_path"] == "/api/auth/google/callback"
    assert report["expected_redirect_uri"] == "http://127.0.0.1:8000/api/auth/google/callback"
    assert report["redirect_uri_source"] == "derived_from_base_url"
    assert report["environments"]["production"]["expected_redirect_uri"] == (
        "https://backend.onrender.com/api/auth/google/callback"
    )
    assert report["override_present"] is False


def test_override_from_process_env_is_reported_with_source(clean_env, isolated_env_file):
    clean_env.setenv("GOOGLE_REDIRECT_URI", "https://backend.onrender.com/api/auth/google/callback")
    report = check_google_callback_configuration()
    assert report["override_present"] is True
    assert "GOOGLE_REDIRECT_URI" in report["redirect_uri_source"]
    assert report["expected_redirect_uri"] == "https://backend.onrender.com/api/auth/google/callback"


def test_override_from_the_env_file_is_reported_with_source(clean_env, isolated_env_file):
    backend_env, _ = isolated_env_file
    backend_env.write_text("GOOGLE_REDIRECT_URI=https://from-file.example/api/auth/google/callback\n")
    report = check_google_callback_configuration()
    assert report["override_present"] is True
    assert "backend/.env" in report["redirect_uri_source"]


def test_without_a_production_url_the_answer_says_unknown(clean_env, isolated_env_file):
    report = check_google_callback_configuration()
    assert report["environments"]["production"]["expected_redirect_uri"] is None
    assert report["environments"]["production"]["source"] == "unknown"
    assert any("frontend/.env.production" in note for note in report["notes"])


def test_missing_callback_route_cannot_be_derived(tmp_path, monkeypatch, clean_env, isolated_env_file):
    import diagnostics.oauth_routes as routes_module

    other = tmp_path / "routes_other.py"
    other.write_text('router = APIRouter(prefix="/api/other")\n')
    monkeypatch.setattr(routes_module, "ROUTES_FILE", other)
    report = check_google_callback_configuration()
    assert report["callback_path"] is None
    assert report["determinable"] is False
    assert any("callback route not found" in note for note in report["notes"])


def test_frontend_return_target_is_reported(clean_env, isolated_env_file):
    report = check_google_callback_configuration()
    assert report["frontend_return_target"] is not None
    assert "#/auth/callback" in report["frontend_return_target"]
