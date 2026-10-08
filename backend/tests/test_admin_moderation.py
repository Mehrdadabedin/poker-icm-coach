"""Admin moderation: suspend, unsuspend and delete accounts.

Each test drives the real routes with the in-memory registry the auth suites
use. The guarantees: only admins can moderate, a suspended account is shut
out of every entry point (token, password, Google), a deleted account loses
its logins and live tables, and no admin can be suspended or deleted.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.auth import auth_store
from app.services.session_store import session_store
from tests.api_helpers import TEST_PASSWORD, register_user
from tests.test_google_auth import _identity, _ready, _sign_in

ADMIN = "ModBoss"


def _login(username: str) -> TestClient:
    register_user(username)
    client = TestClient(app)
    response = client.post("/api/auth/login",
                           json={"username": username, "password": TEST_PASSWORD})
    assert response.status_code == 200, response.text
    client.headers["Authorization"] = f"Bearer {response.json()['token']}"
    return client


@pytest.fixture
def admin(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings, "admin_usernames", f"{ADMIN},OtherBoss")
    return _login(ADMIN)


def _password_login(username: str) -> int:
    return TestClient(app).post(
        "/api/auth/login", json={"username": username, "password": TEST_PASSWORD}
    ).status_code


def _row(admin: TestClient, username: str) -> dict | None:
    users = admin.get("/api/admin/users").json()["users"]
    return next((u for u in users if u["username"] == username), None)


def test_only_admins_can_moderate() -> None:
    anonymous, user = TestClient(app), _login("ModPlain")
    register_user("ModVictim")
    for client, expected in ((anonymous, 401), (user, 403)):
        assert client.post("/api/admin/users/ModVictim/suspend").status_code == expected
        assert client.post("/api/admin/users/ModVictim/unsuspend").status_code == expected
        assert client.delete("/api/admin/users/ModVictim").status_code == expected
    assert _password_login("ModVictim") == 200, "a refused call still changed the account"


def test_suspend_signs_the_user_out_and_blocks_login(admin: TestClient) -> None:
    target = _login("ModTarget")
    assert target.get("/api/auth/me").status_code == 200

    response = admin.post("/api/admin/users/ModTarget/suspend")
    assert response.status_code == 200
    # Sign-up and sign-in each issued a token; both are revoked.
    assert response.json() == {"username": "ModTarget", "suspended": True, "logins_revoked": 2}
    assert target.get("/api/auth/me").status_code == 401, "the old token still works"
    refused = TestClient(app).post(
        "/api/auth/login", json={"username": "ModTarget", "password": TEST_PASSWORD})
    assert refused.status_code == 403 and refused.json()["detail"] == "this account is suspended"
    assert _row(admin, "ModTarget") == {
        "username": "ModTarget", "provider": "local", "suspended": True, "admin": False}

    assert admin.post("/api/admin/users/ModTarget/unsuspend").status_code == 200
    assert _password_login("ModTarget") == 200
    assert _row(admin, "ModTarget")["suspended"] is False  # type: ignore[index]


def test_a_login_that_lands_during_the_suspension_is_refused(admin: TestClient) -> None:
    register_user("ModRacer")
    assert admin.post("/api/admin/users/ModRacer/suspend").status_code == 200
    # A password check that passed just before the flag was set still mints a token.
    late_token = auth_store.login("ModRacer")
    me = TestClient(app).get("/api/auth/me", headers={"Authorization": f"Bearer {late_token}"})
    assert me.status_code == 401, "a token minted during the suspension still works"


def test_delete_removes_the_account_its_logins_and_its_tables(admin: TestClient) -> None:
    target = _login("ModGone")
    table = target.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0,
    })
    assert table.status_code == 200, table.text
    table_id = table.json()["tableId"]

    response = admin.delete("/api/admin/users/ModGone")
    assert response.status_code == 200
    assert response.json() == {
        "username": "ModGone", "deleted": True, "logins_revoked": 2, "tables_closed": 1}
    assert session_store.get(table_id) is None, "the deleted user's table is still live"
    assert target.get("/api/auth/me").status_code == 401
    assert _password_login("ModGone") == 401
    assert _row(admin, "ModGone") is None


def test_no_admin_can_be_suspended_or_deleted(admin: TestClient) -> None:
    register_user("OtherBoss")
    for name, detail in ((ADMIN, "your own account"), ("OtherBoss", "admin accounts")):
        for call in (admin.post(f"/api/admin/users/{name}/suspend"),
                     admin.delete(f"/api/admin/users/{name}")):
            assert call.status_code == 400 and detail in call.json()["detail"]
    assert _password_login("OtherBoss") == 200


def test_an_unknown_user_is_404(admin: TestClient) -> None:
    assert admin.post("/api/admin/users/NoSuchUser/suspend").status_code == 404
    assert admin.post("/api/admin/users/NoSuchUser/unsuspend").status_code == 404
    assert admin.delete("/api/admin/users/NoSuchUser").status_code == 404


def test_a_suspended_google_account_cannot_sign_in(
    admin: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    identity = _identity()
    google = _ready(monkeypatch, identity)
    username = _sign_in(google)["username"][0]  # the first sign-in creates the account

    assert admin.post(f"/api/admin/users/{username}/suspend").status_code == 200
    second = _sign_in(google)
    assert second.get("error") == ["account_suspended"] and "token" not in second
