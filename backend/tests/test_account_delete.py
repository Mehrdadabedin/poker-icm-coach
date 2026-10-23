"""Self-service account deletion (plan 095): a player deletes their own account
and everything that belongs to it, after proving it is really them.

Both app stores require this inside the app. An Admin cannot delete itself, so
the last Admin can never disappear by accident.
"""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import portraits, profiles
from app.services.auth import auth_store
from app.services.user_registry import auth_registry
from tests.api_helpers import TEST_PASSWORD, login_client

PROFILE = {"firstName": "Ana", "lastName": "Torres", "displayName": "Ana T.",
           "birthday": "1990-03-02", "gender": "woman"}
JPEG = {"contentType": "image/jpeg", "data": base64.b64encode(b"\xff\xd8\xff" + b"\x00" * 32).decode()}


@pytest.fixture(autouse=True)
def fresh_stores() -> None:
    profiles.bind_profiles(None, False)
    portraits.bind_portraits(None, False)


def _delete(client: TestClient, **body: object):
    return client.request("DELETE", "/api/account", json=body)


def test_the_right_password_deletes_everything() -> None:
    client = login_client("GoneForGood")
    client.put("/api/profile", json=PROFILE)
    client.put("/api/portrait", json=JPEG)

    response = _delete(client, password=TEST_PASSWORD)
    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["deleted"], body["profile_deleted"], body["portrait_deleted"]) == (True, 1, 1)
    assert body["logins_revoked"] >= 1
    assert client.get("/api/profile").status_code == 401, "the old token still works"
    assert not auth_registry.has_account("GoneForGood")
    assert profiles.store.get("GoneForGood") is None and portraits.store.get("GoneForGood") is None
    login = TestClient(app).post("/api/auth/login",
                                 json={"username": "GoneForGood", "password": TEST_PASSWORD})
    assert login.status_code == 401


@pytest.mark.parametrize("body", [{}, {"password": "wrong-password"}, {"confirm": "DELETE"}])
def test_a_password_account_needs_its_password(body: dict) -> None:
    client = login_client("KeepMePlease")
    client.put("/api/profile", json=PROFILE)
    assert _delete(client, **body).status_code == 403
    assert client.get("/api/profile").status_code == 200, "a refused delete removed data"


def test_a_google_account_confirms_with_the_word_delete() -> None:
    username = auth_registry.register_external("GoogleLeaver", "google", "sub-095", "g@example.com")
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {auth_store.login(username)}"
    assert _delete(client).status_code == 400
    assert _delete(client, password="anything").status_code == 400
    assert _delete(client, confirm="DELETE").status_code == 200
    assert not auth_registry.has_account(username)


def test_an_admin_cannot_delete_itself(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "SoleBoss")
    admin = login_client("SoleBoss")
    assert _delete(admin, password=TEST_PASSWORD).status_code == 409
    assert auth_registry.has_account("SoleBoss")


def test_only_the_callers_data_goes() -> None:
    stays = login_client("StaysHere")
    stays.put("/api/profile", json=PROFILE)
    leaves = login_client("LeavesNow")
    leaves.put("/api/profile", json=PROFILE)
    assert _delete(leaves, password=TEST_PASSWORD).status_code == 200
    assert stays.get("/api/profile").status_code == 200


def test_the_admin_delete_also_removes_the_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "ProfileBoss")
    admin = login_client("ProfileBoss")
    login_client("AdminRemoves").put("/api/profile", json=PROFILE)
    response = admin.delete("/api/admin/users/AdminRemoves")
    assert response.status_code == 200, response.text
    assert response.json()["profile_deleted"] == 1
    assert profiles.store.get("AdminRemoves") is None
