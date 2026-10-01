"""Admin bootstrap + first-login password change (A-ADM correction).

Covers the deterministic initial Admin account, the forced first-login
password change, and that a pending-change Admin is denied on Admin APIs
until the password is replaced. All fixtures are in-memory/tmp-file based."""
from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app
from app.services.user_registry import UserRegistry, auth_registry
from tests.api_helpers import TEST_PASSWORD, register_user

BOOTSTRAP_PASSWORD = "admin1234"
NEW_PASSWORD = "NewPass-123"


def test_bootstrap_is_deterministic_and_idempotent(tmp_path) -> None:
    path = tmp_path / "users.json"
    registry = UserRegistry(users_file=str(path))
    assert registry.bootstrap_admin(BOOTSTRAP_PASSWORD) is True
    assert registry.bootstrap_admin(BOOTSTRAP_PASSWORD) is False  # no duplicate
    assert registry.bootstrap_admin(BOOTSTRAP_PASSWORD) is False
    assert registry.verify("Admin", BOOTSTRAP_PASSWORD) is True
    assert registry.requires_password_change("Admin") is True
    assert registry.is_admin("Admin") is True
    # the plaintext bootstrap password never lands in the store
    raw = path.read_text(encoding="utf-8")
    assert BOOTSTRAP_PASSWORD not in raw
    stored = json.loads(raw)["Admin"]
    assert set(stored) == {"admin", "change_password", "hash", "salt"}


def test_first_login_flow_and_password_change(monkeypatch) -> None:
    """API-level: login -> pending -> denied on admin APIs -> change ->
    old password dead; new password authenticates; admin APIs return 200."""
    auth_registry.bind_path("")  # hermetic in-memory
    auth_registry.bootstrap_admin(BOOTSTRAP_PASSWORD)

    client = TestClient(app)
    first = client.post("/api/auth/login", json={
        "username": "Admin", "password": BOOTSTRAP_PASSWORD,
    })
    assert first.status_code == 200
    body = first.json()
    assert body["admin"] is True and body["must_change_password"] is True
    pending = {"Authorization": f"Bearer {body['token']}"}

    # pending change: the Admin API must still refuse
    assert client.get("/api/admin/users/summary", headers=pending).status_code == 403
    # short password rejected
    short = client.post("/api/auth/change-password", headers=pending,
                        json={"new_password": "short"})
    assert short.status_code == 400
    changed = client.post("/api/auth/change-password", headers=pending,
                          json={"new_password": NEW_PASSWORD})
    assert changed.status_code == 200 and changed.json() == {"changed": True}

    # old bootstrap password is dead; new one authenticates as admin
    assert client.post("/api/auth/login", json={
        "username": "Admin", "password": BOOTSTRAP_PASSWORD,
    }).status_code == 401
    second = client.post("/api/auth/login", json={
        "username": "Admin", "password": NEW_PASSWORD,
    })
    assert second.status_code == 200
    body2 = second.json()
    assert body2["admin"] is True and body2["must_change_password"] is False
    fresh = {"Authorization": f"Bearer {body2['token']}"}
    summary = client.get("/api/admin/users/summary", headers=fresh)
    assert summary.status_code == 200
    data = summary.json()
    assert data == {
        "total_registered_accounts": len(auth_registry.account_snapshot()),
        "local_accounts": len([r for r in auth_registry.account_snapshot() if r[1] is None]),
        "google_accounts": 0,
    }
    assert data["total_registered_accounts"] >= 1


def test_normal_login_flags_and_denial() -> None:
    auth_registry.bind_path("")
    register_user("NormalUser", TEST_PASSWORD)
    client = TestClient(app)
    body = client.post("/api/auth/login", json={
        "username": "NormalUser", "password": TEST_PASSWORD,
    }).json()
    assert body["admin"] is False and body["must_change_password"] is False
    normal = {"Authorization": f"Bearer {body['token']}"}
    assert client.get("/api/admin/users/summary", headers=normal).status_code == 403
    assert client.get("/api/admin/users", headers=normal).status_code == 403
    # a normal user cannot abuse the change endpoint
    assert client.post("/api/auth/change-password", headers=normal,
                       json={"new_password": NEW_PASSWORD}).status_code == 403


def test_change_password_required_flag_toggle() -> None:
    auth_registry.bind_path("")
    auth_registry.bootstrap_admin(BOOTSTRAP_PASSWORD)
    auth_registry.change_password("Admin", NEW_PASSWORD)
    assert not auth_registry.requires_password_change("Admin")
    assert auth_registry.verify("Admin", NEW_PASSWORD)
