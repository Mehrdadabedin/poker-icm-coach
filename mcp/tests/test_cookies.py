"""Cookie/session transport inspection."""
from __future__ import annotations

import diagnostics.cookies as cookies_module
from diagnostics.cookies import check_cookie_configuration


def test_this_app_has_no_cookie_session(clean_env):
    report = check_cookie_configuration()
    assert report["cookie_based_session"] is False
    assert report["backend_cookie_api_usage"] == []
    assert report["frontend_document_cookie_usage"] == []
    assert set(report["cookie_attributes"].values()) == {"not_applicable"}
    assert report["session_values_exposed"] is False


def test_token_transport_is_reported(clean_env):
    report = check_cookie_configuration()
    assert "Bearer" in report["token_transport"]["scheme"]
    assert report["token_transport"]["client_storage_keys"]
    assert report["token_transport"]["browser_storage"] == "localStorage"


def test_notes_explain_why_attributes_do_not_apply(clean_env):
    report = check_cookie_configuration()
    joined = " ".join(report["notes"])
    assert "no cookie is written" in joined
    assert "Secure/HttpOnly/SameSite do not apply" in joined


def test_a_backend_that_does_write_cookies_is_reported(tmp_path, monkeypatch, clean_env):
    app_dir = tmp_path / "backend" / "app"
    app_dir.mkdir(parents=True)
    (app_dir / "routes.py").write_text(
        "def handler(response):\n    response.set_cookie('sid', 'x', httponly=True, samesite='lax')\n"
    )
    monkeypatch.setattr(cookies_module, "BACKEND_DIR", tmp_path / "backend")
    report = check_cookie_configuration()
    assert report["cookie_based_session"] is True
    assert report["backend_cookie_api_usage"]
    assert report["cookie_attributes"]["httponly"] == "present in source, value not read"
    assert "lax" not in str(report)


def test_frontend_cookie_usage_is_detected(tmp_path, monkeypatch, clean_env):
    src = tmp_path / "frontend" / "src"
    src.mkdir(parents=True)
    (src / "x.ts").write_text("document.cookie = 'a=1';\n")
    monkeypatch.setattr(cookies_module, "FRONTEND_DIR", tmp_path / "frontend")
    report = check_cookie_configuration()
    assert report["cookie_based_session"] is True
