"""Google availability: what the probe reports when credentials are missing.

The names of the unset variables are reported, never their values, so a
deployment that forgot one can be diagnosed from outside the process.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

FRONTEND = "https://icm-master-frontend.onrender.com"
PROVIDERS_PATH = "/api/auth/providers"
START_PATH = "/api/auth/google/start"
CLIENT_ID = "test-client-id.apps.googleusercontent.com"
CLIENT_SECRET = "test-client-secret-not-a-real-credential"
NOT_CONFIGURED = "google sign-in is not configured: missing"


def _configure(monkeypatch: pytest.MonkeyPatch, client_id: str = CLIENT_ID, client_secret: str = CLIENT_SECRET) -> None:
    monkeypatch.setattr(settings, "google_client_id", client_id)
    monkeypatch.setattr(settings, "google_client_secret", client_secret)


def test_providers_names_the_missing_variables_without_their_values(monkeypatch) -> None:
    _configure(monkeypatch, client_id="", client_secret="")
    client = TestClient(app)
    body = client.get(PROVIDERS_PATH)
    assert body.json() == {
        "google": False,
        "apple": False,
        "phone": False,
        "google_missing": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    }
    assert CLIENT_SECRET not in body.text
    _configure(monkeypatch, client_secret="")  # an id alone is not enough
    assert client.get(PROVIDERS_PATH).json()["google_missing"] == ["GOOGLE_CLIENT_SECRET"]
    _configure(monkeypatch)
    body = client.get(PROVIDERS_PATH)
    assert body.json() == {"google": True, "apple": False, "phone": False, "google_missing": []}
    assert CLIENT_ID not in body.text and CLIENT_SECRET not in body.text


def test_start_names_the_missing_variables_and_refuses_untrusted_origins(monkeypatch) -> None:
    _configure(monkeypatch, client_id="", client_secret="")
    client = TestClient(app)
    offline = client.get(START_PATH, params={"redirect_uri": FRONTEND}, follow_redirects=False)
    assert (offline.status_code, offline.json()) == (
        503,
        {"detail": f"{NOT_CONFIGURED} GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"},
    )
    _configure(monkeypatch, client_secret="")
    half = client.get(START_PATH, params={"redirect_uri": FRONTEND}, follow_redirects=False)
    assert half.json() == {"detail": f"{NOT_CONFIGURED} GOOGLE_CLIENT_SECRET"}
    assert CLIENT_ID not in half.text
    _configure(monkeypatch)
    for bad in ("https://evil.example.com/", f"{FRONTEND}.evil.xyz", "not-a-url"):
        refused = client.get(START_PATH, params={"redirect_uri": bad}, follow_redirects=False)
        assert (refused.status_code, refused.json()) == (400, {"detail": "redirect_uri is not allowed"})
