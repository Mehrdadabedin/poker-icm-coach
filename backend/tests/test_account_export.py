"""The player's own data (plan 095): how the account signs in, and a full copy
of what ICMBOT keeps, with nothing from another player and no secrets.
"""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import portraits, profiles
from app.services.auth import auth_store
from app.services.user_registry import auth_registry
from tests.api_helpers import TEST_PASSWORD, login_client

PROFILE = {"firstName": "Ana", "lastName": "Torres", "displayName": "Ana T.",
           "birthday": "1990-03-02", "gender": "woman"}
JPEG = b"\xff\xd8\xff" + b"\x00" * 32


@pytest.fixture(autouse=True)
def fresh_stores() -> None:
    profiles.bind_profiles(None, False)
    portraits.bind_portraits(None, False)


def test_the_account_says_how_it_signs_in() -> None:
    assert login_client("ExportPass").get("/api/account").json() == {
        "username": "ExportPass", "admin": False, "signIn": "password", "email": None}
    username = auth_registry.register_external("ExportGoogle", "google", "sub-export", "g@example.com")
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {auth_store.login(username)}"
    assert client.get("/api/account").json() == {
        "username": username, "admin": False, "signIn": "google", "email": "g@example.com"}


def test_the_export_holds_the_players_own_data_and_no_secrets() -> None:
    client = login_client("ExportMine")
    client.put("/api/profile", json=PROFILE)
    client.put("/api/portrait", json={"contentType": "image/jpeg",
                                      "data": base64.b64encode(JPEG).decode()})
    login_client("ExportTheirs").put("/api/profile", json={**PROFILE, "firstName": "Other"})

    response = client.get("/api/account/export")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["account"]["username"] == "ExportMine"
    assert data["profile"]["firstName"] == "Ana"
    assert data["portrait"]["status"] == "pending"
    assert data["portrait"]["image"].startswith("data:image/jpeg;base64,")
    assert data["settings"] == client.get("/api/settings").json()
    assert data["history"] == {"tournaments": [], "hands": {}}  # no history database here
    text = response.text
    for secret in ("Other", TEST_PASSWORD, client.auth_token, '"hash"', '"salt"'):  # type: ignore[attr-defined]
        assert secret not in text, f"the export leaks {secret!r}"


def test_an_empty_account_exports_nulls() -> None:
    data = login_client("ExportEmpty").get("/api/account/export").json()
    assert (data["profile"], data["portrait"]) == (None, None)


def test_signed_out_callers_get_401() -> None:
    anonymous = TestClient(app)
    assert anonymous.get("/api/account").status_code == 401
    assert anonymous.get("/api/account/export").status_code == 401
