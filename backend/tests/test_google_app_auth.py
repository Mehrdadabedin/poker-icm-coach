"""Google sign-in from the Android app (plan 088).

Google blocks its sign-in page in an app's web view, so the app runs it in a
Chrome tab, receives a one-time code on its own link scheme, and trades the
code plus its verifier for a session. Any app can claim that scheme, so these
tests treat the code as public: only the verifier makes it worth anything.
"""
from __future__ import annotations

import secrets
import time

import pytest
from fastapi.testclient import TestClient

from app.services import google_app_auth
from tests.test_google_auth import (
    CALLBACK_PATH,
    FRONTEND,
    START_PATH,
    _exchange,
    _identity,
    _params,
    _ready,
)

EXCHANGE_PATH = "/api/auth/google/app-exchange"
APP = "com.pokericmcoach.app://auth?"


def _app_sign_in(client: TestClient, verifier: str) -> str:
    """Run the flow as the app; return where the callback sends the Chrome tab."""
    start = client.get(START_PATH, follow_redirects=False, params={
        "redirect_uri": FRONTEND, "app_challenge": google_app_auth.challenge_for(verifier)})
    assert start.status_code == 302, start.text
    state = _params(start.headers["location"])["state"][0]
    callback = client.get(CALLBACK_PATH, params={"state": state, "code": "auth-code"}, follow_redirects=False)
    assert callback.status_code == 302, callback.text
    return str(callback.headers["location"])


def _code(location: str) -> str:
    assert location.startswith(APP), location
    return _params(location.replace(APP, "app://x?"))["code"][0]


def _verifier() -> str:
    return secrets.token_urlsafe(32)


def test_the_app_gets_a_code_and_never_the_token(monkeypatch: pytest.MonkeyPatch) -> None:
    location = _app_sign_in(_ready(monkeypatch, _identity()), _verifier())
    assert location.startswith(APP) and "token" not in location
    assert len(_code(location)) >= 40


def test_the_code_and_the_verifier_buy_a_session(monkeypatch: pytest.MonkeyPatch) -> None:
    identity, verifier = _identity(), _verifier()
    client = _ready(monkeypatch, identity)
    response = client.post(EXCHANGE_PATH, json={"code": _code(_app_sign_in(client, verifier)), "verifier": verifier})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["username"] == identity["username"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.json()["username"] == identity["username"]


def test_a_caught_code_is_worth_nothing_without_the_verifier(monkeypatch: pytest.MonkeyPatch) -> None:
    verifier = _verifier()
    client = _ready(monkeypatch, _identity())
    code = _code(_app_sign_in(client, verifier))
    assert client.post(EXCHANGE_PATH, json={"code": code, "verifier": _verifier()}).status_code == 400
    # one try only: a guess burns the code, so the real verifier is too late
    assert client.post(EXCHANGE_PATH, json={"code": code, "verifier": verifier}).status_code == 400


def test_a_code_works_once_and_not_after_two_minutes(monkeypatch: pytest.MonkeyPatch) -> None:
    verifier = _verifier()
    client = _ready(monkeypatch, _identity())
    code = _code(_app_sign_in(client, verifier))
    assert client.post(EXCHANGE_PATH, json={"code": code, "verifier": verifier}).status_code == 200
    assert client.post(EXCHANGE_PATH, json={"code": code, "verifier": verifier}).status_code == 400
    late = _code(_app_sign_in(client, verifier))
    now = time.time()
    monkeypatch.setattr(google_app_auth.time, "time", lambda: now + google_app_auth.CODE_TTL_SECONDS + 1)
    assert client.post(EXCHANGE_PATH, json={"code": late, "verifier": verifier}).status_code == 400


def test_a_failed_sign_in_returns_to_the_app(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _ready(monkeypatch, _identity())
    _exchange(monkeypatch, error="google is down")
    assert _app_sign_in(client, _verifier()) == f"{APP}error=google_signin_failed"


def test_a_malformed_challenge_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _ready(monkeypatch, _identity())
    response = client.get(START_PATH, params={"redirect_uri": FRONTEND, "app_challenge": "a" * 42 + "!"},
                          follow_redirects=False)
    assert response.status_code == 400


def test_the_website_still_gets_the_token_in_its_own_page(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _ready(monkeypatch, _identity())
    state = _params(client.get(START_PATH, params={"redirect_uri": FRONTEND},
                               follow_redirects=False).headers["location"])["state"][0]
    location = client.get(CALLBACK_PATH, params={"state": state, "code": "c"}, follow_redirects=False).headers["location"]
    assert location.startswith(f"{FRONTEND}/#/auth/callback?") and "token=" in location
