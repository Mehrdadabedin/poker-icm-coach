"""Google sign-in: provider probe, OAuth flow, linking rules, regressions.

The exchange goes through the monkeypatched google_oauth._http_post_json seam.
"""
from __future__ import annotations

import base64
import json
import time
import urllib.parse
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import google_oauth
from app.services.user_registry import auth_registry
from tests.api_helpers import TEST_PASSWORD, register_user

FRONTEND = "https://icm-master-frontend.onrender.com"
START_PATH = "/api/auth/google/start"
CALLBACK_PATH = "/api/auth/google/callback"
CLIENT_ID = "test-client-id.apps.googleusercontent.com"
CLIENT_SECRET = "test-client-secret-not-a-real-credential"

def _identity() -> dict[str, str]:
    """A private fake Google account: the user registry is process-wide."""
    token = uuid.uuid4().hex[:10]
    return {"sub": f"sub-{token}", "email": f"guser{token}@example.com", "username": f"guser{token}"}
def _claims(identity: dict[str, str], **overrides: object) -> dict[str, object]:
    base: dict[str, object] = {"sub": identity["sub"], "email": identity["email"], "email_verified": True,
                              "aud": CLIENT_ID, "iss": "https://accounts.google.com", "exp": time.time() + 300}
    return {**base, **overrides}
def _configure(monkeypatch: pytest.MonkeyPatch, on: bool = True, redirect_uri: str = "") -> None:
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID if on else "")
    monkeypatch.setattr(settings, "google_client_secret", CLIENT_SECRET if on else "")
    monkeypatch.setattr(settings, "google_redirect_uri", redirect_uri)
def _token(claims: dict[str, object]) -> str:
    def seg(payload: dict[str, object]) -> str:
        return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    return f"{seg({'alg': 'RS256'})}.{seg(claims)}.signature"
def _exchange(monkeypatch: pytest.MonkeyPatch, claims: dict[str, object] | None = None,
              result: dict[str, object] | None = None, error: str = "") -> list[bytes]:
    """Fake the token endpoint; returns the form bodies it received."""
    bodies: list[bytes] = []
    def fake_post(url: str, body: bytes) -> dict[str, object]:
        assert url == google_oauth.TOKEN_ENDPOINT
        bodies.append(body)
        if error:
            raise OSError(error)
        return result if result is not None else {"id_token": _token(claims or {})}
    monkeypatch.setattr(google_oauth, "_http_post_json", fake_post)
    return bodies
def _ready(monkeypatch: pytest.MonkeyPatch, identity: dict[str, str], **claims: object) -> TestClient:
    """Configured Google sign-in with a fake exchange, ready to sign in."""
    _configure(monkeypatch)
    _exchange(monkeypatch, _claims(identity, **claims))
    return TestClient(app)
def _params(url: str) -> dict[str, list[str]]:
    # Parameters of a redirect, whether they sit in the query or the fragment.
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.parse_qs(parts.query or parts.fragment.partition("?")[2])
def _start(client: TestClient, redirect_uri: str = FRONTEND) -> str:
    response = client.get(START_PATH, params={"redirect_uri": redirect_uri}, follow_redirects=False)
    assert response.status_code == 302, response.text
    return _params(response.headers["location"])["state"][0]
def _sign_in(client: TestClient, code: str | None = "auth-code", state: str | None = None) -> dict[str, list[str]]:
    """Run the callback; return the fragment parameters of the app redirect."""
    query: dict[str, str] = {"state": state or _start(client)}
    if code is not None:
        query["code"] = code
    response = client.get(CALLBACK_PATH, params=query, follow_redirects=False)
    assert response.status_code == 302, response.text
    assert response.headers["location"].startswith(f"{FRONTEND}/#/auth/callback?")
    return _params(response.headers["location"])
def _username(client: TestClient, token: str) -> str:
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, response.text
    return response.json()["username"]

def test_providers_is_public_and_follows_the_two_settings(monkeypatch) -> None:
    _configure(monkeypatch, on=False)
    client = TestClient(app)
    assert client.get("/api/auth/providers").json() == {"google": False, "apple": False, "phone": False}
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)  # an id alone is not enough
    assert client.get("/api/auth/providers").json()["google"] is False
    monkeypatch.setattr(settings, "google_client_secret", CLIENT_SECRET)
    body = client.get("/api/auth/providers")
    assert body.json() == {"google": True, "apple": False, "phone": False} and CLIENT_SECRET not in body.text

def test_start_is_503_unconfigured_and_400_for_an_untrusted_origin(monkeypatch) -> None:
    _configure(monkeypatch, on=False)
    client = TestClient(app)
    offline = client.get(START_PATH, params={"redirect_uri": FRONTEND}, follow_redirects=False)
    assert (offline.status_code, offline.json()) == (503, {"detail": "google sign-in is not configured"})
    _configure(monkeypatch)
    for bad in ("https://evil.example.com/", "https://icm-master-frontend.onrender.com.evil.xyz", "not-a-url"):
        refused = client.get(START_PATH, params={"redirect_uri": bad}, follow_redirects=False)
        assert (refused.status_code, refused.json()) == (400, {"detail": "redirect_uri is not allowed"})

def test_start_redirects_to_google_with_state_and_client_id(monkeypatch) -> None:
    client = _ready(monkeypatch, _identity())
    response = client.get(START_PATH, params={"redirect_uri": f"{FRONTEND}/"}, follow_redirects=False)
    parts = urllib.parse.urlsplit(response.headers["location"])
    query = urllib.parse.parse_qs(parts.query)
    assert response.status_code == 302 and parts[:3] == ("https", "accounts.google.com", "/o/oauth2/v2/auth")
    assert len(query.pop("state")[0]) >= 32 and CLIENT_SECRET not in response.headers["location"]
    assert query == {"client_id": [CLIENT_ID], "response_type": ["code"], "prompt": ["select_account"],
                     "redirect_uri": [f"http://testserver{CALLBACK_PATH}"], "scope": ["openid email profile"]}
    proxy_headers = {"x-forwarded-proto": "https", "x-forwarded-host": "api.example.com"}
    proxied = client.get(START_PATH, params={"redirect_uri": FRONTEND}, follow_redirects=False, headers=proxy_headers)
    assert _params(proxied.headers["location"])["redirect_uri"] == ["https://api.example.com/api/auth/google/callback"]
    _configure(monkeypatch, redirect_uri="https://fixed.example.com/api/auth/google/callback")
    fixed = client.get(START_PATH, params={"redirect_uri": FRONTEND}, follow_redirects=False)
    assert _params(fixed.headers["location"])["redirect_uri"] == ["https://fixed.example.com/api/auth/google/callback"]

def test_callback_rejects_forged_replayed_and_expired_state(monkeypatch) -> None:
    client = _ready(monkeypatch, _identity())
    forged = client.get(CALLBACK_PATH, params={"code": "x", "state": "forged"}, follow_redirects=False)
    assert (forged.status_code, forged.json()) == (400, {"detail": "invalid or expired oauth state"})
    state = _start(client)
    assert _sign_in(client, state=state)["token"][0]  # a fresh state works exactly once
    assert client.get(CALLBACK_PATH, params={"code": "auth-code", "state": state},
                      follow_redirects=False).status_code == 400  # the nonce is single use
    monkeypatch.setattr(google_oauth, "state_store", google_oauth.OAuthStateStore(ttl=-1.0))
    expired = google_oauth.state_store.create(FRONTEND)
    assert client.get(CALLBACK_PATH, params={"code": "x", "state": expired},
                      follow_redirects=False).status_code == 400

def test_callback_mints_a_token_that_require_user_accepts(monkeypatch) -> None:
    identity = _identity()
    client = _ready(monkeypatch, identity)
    bodies = _exchange(monkeypatch, _claims(identity))
    params = _sign_in(client)
    assert params["username"] == [identity["username"]]
    assert _username(client, params["token"][0]) == identity["username"]
    sent = urllib.parse.parse_qs(bodies[0].decode("ascii"))  # the secret only ever travels here
    assert [sent[key] for key in ("code", "grant_type", "redirect_uri", "client_secret")] == [
        ["auth-code"], ["authorization_code"], [f"http://testserver{CALLBACK_PATH}"], [CLIENT_SECRET]]

def test_a_google_account_is_linked_to_one_subject_and_has_no_password(monkeypatch) -> None:
    identity = _identity()
    client = _ready(monkeypatch, identity)
    first = _username(client, _sign_in(client)["token"][0])
    _exchange(monkeypatch, _claims(identity, email=f"changed-{identity['username']}@example.com"))
    assert _username(client, _sign_in(client)["token"][0]) == first == identity["username"]
    assert auth_registry.username_for_external("google", identity["sub"]) == first
    stored = auth_registry._users[first]  # noqa: SLF001
    assert "salt" not in stored and (stored["provider"], stored["subject"]) == ("google", identity["sub"])
    assert "hash" not in stored
    assert auth_registry.verify(first, "anything-at-all") is False
    assert TestClient(app).post("/api/auth/login", json={"username": first, "password": "x"}).status_code == 401

def test_google_sign_in_never_takes_over_an_existing_username(monkeypatch) -> None:
    identity = _identity()
    register_user(identity["username"], TEST_PASSWORD)
    client = _ready(monkeypatch, identity)
    username = _username(client, _sign_in(client)["token"][0])
    assert username != identity["username"] and username.startswith(identity["username"])
    assert len(username) <= 24
    login = {"username": identity["username"], "password": TEST_PASSWORD}
    assert TestClient(app).post("/api/auth/login", json=login).status_code == 200

@pytest.mark.parametrize("mode", ["network_error", "no_id_token", "google_error", "bad_claims"])
def test_a_failed_sign_in_returns_to_the_app_with_an_error(monkeypatch, mode) -> None:
    identity = _identity()
    _configure(monkeypatch)
    client = TestClient(app)
    if mode != "google_error":  # that mode never reaches the token endpoint
        _exchange(monkeypatch, _claims(identity, aud="another-client" if mode == "bad_claims" else CLIENT_ID),
                  result={"error": "invalid_grant"} if mode == "no_id_token" else None,
                  error="network down" if mode == "network_error" else "")
    params = _sign_in(client, code=None if mode == "google_error" else "auth-code")
    assert params == {"error": ["google_signin_failed"]}
    assert auth_registry.username_for_external("google", identity["sub"]) is None
    for override in ({"iss": "evil"}, {"exp": 0}, {"sub": ""}, {"email_verified": False}):
        with pytest.raises(google_oauth.GoogleAuthError):
            google_oauth.validate_claims(_claims(identity, **override), CLIENT_ID)

def test_password_register_and_login_still_work() -> None:
    username = f"pw{uuid.uuid4().hex[:8]}"
    client = TestClient(app)
    registered = client.post("/api/auth/register", json={"username": username, "password": TEST_PASSWORD})
    assert registered.status_code == 200 and registered.json()["username"] == username
    assert _username(client, registered.json()["token"]) == username
    login = client.post("/api/auth/login", json={"username": username, "password": TEST_PASSWORD})
    assert login.status_code == 200 and login.json()["username"] == username
    assert client.post("/api/auth/login", json={"username": username, "password": "wrong-pw"}).status_code == 401

def test_the_suite_writes_no_persisted_auth_file(monkeypatch) -> None:
    """Conftest binds blank paths: a full sign-in must not touch the repo files."""
    watched = [Path(__file__).resolve().parents[1] / n for n in ("data/users.json", "data/sessions.json")]
    before = [p.stat().st_mtime_ns if p.exists() else None for p in watched]
    client = _ready(monkeypatch, _identity())
    assert _username(client, _sign_in(client)["token"][0])
    blank = (settings.auth_users_file, settings.auth_sessions_file, auth_registry._path)  # noqa: SLF001
    assert blank == ("", "", None) and [p.stat().st_mtime_ns if p.exists() else None for p in watched] == before
