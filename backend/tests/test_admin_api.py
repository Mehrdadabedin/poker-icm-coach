"""A03 tests: protected Admin Users API (admin.md A03).

Hits the real /api/admin routes with the in-memory registry/token singletons
the auth suites use. Admin identity comes from the A01 config path
(ADMIN_USERNAMES). users.json is never read by these routes."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.user_registry import auth_registry
from tests.api_helpers import TEST_PASSWORD, register_user


def _login(username: str) -> TestClient:
    register_user(username)
    client = TestClient(app)
    auth = client.post(
        "/api/auth/login",
        json={"username": username, "password": TEST_PASSWORD},
    )
    assert auth.status_code == 200
    client.headers["Authorization"] = f"Bearer {auth.json()['token']}"
    return client


def _seed_users(users: dict[str, dict[str, str]]) -> None:
    auth_registry._users = users  # noqa: SLF001 - in-memory fixture, like auth tests


def test_unauthenticated_summary_denied() -> None:
    anon = TestClient(app)
    assert anon.get("/api/admin/users/summary").status_code == 401
    assert anon.get("/api/admin/users").status_code == 401


def test_normal_user_summary_denied() -> None:
    client = _login("AdminApiDenyUser")
    assert client.get("/api/admin/users/summary").status_code == 403
    assert client.get("/api/admin/users").status_code == 403


def test_admin_summary_counts(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "AdminApiBoss")
    client = _login("AdminApiBoss")
    _seed_users({
        "alice": {"salt": "s", "hash": "h"},
        "bob": {"salt": "s", "hash": "h"},
        "carol": {"provider": "google", "subject": "sub", "email": "c@x.y"},
    })
    r = client.get("/api/admin/users/summary")
    assert r.status_code == 200
    assert r.json() == {
        "total_registered_accounts": 3,
        "local_accounts": 2,
        "google_accounts": 1,
    }


def test_admin_user_list_safe_fields(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "AdminApiList")
    client = _login("AdminApiList")
    _seed_users({
        "bob": {"salt": "s", "hash": "h"},
        "alice": {"provider": "google", "subject": "sub", "email": "a@x.y"},
    })
    r = client.get("/api/admin/users")
    assert r.status_code == 200
    body = r.json()
    assert body["users"] == [
        {"username": "alice", "provider": "google"},
        {"username": "bob", "provider": "local"},
    ]
    assert body["total"] == 2 and body["limit"] == 50 and body["offset"] == 0
    # safe shape: exactly username/provider, nothing else anywhere
    for row in body["users"]:
        assert set(row) == {"username", "provider"}


def test_no_credentials_in_any_admin_response(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "AdminApiNoCreds")
    client = _login("AdminApiNoCreds")
    _seed_users({
        "alice": {"salt": "s", "hash": "h"},
        "carol": {"provider": "google", "subject": "sub-9", "email": "c@x.y"},
    })
    for path in ("/api/admin/users/summary", "/api/admin/users"):
        rendered = client.get(path).text
        for forbidden in ("salt", "hash", "subject", "email", "token", "session"):
            assert forbidden not in rendered


def test_users_json_never_returned(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "AdminApiRaw")
    client = _login("AdminApiRaw")
    _seed_users({"alice": {"salt": "s", "hash": "h"}})
    body = client.get("/api/admin/users").json()
    assert all(set(row) == {"username", "provider"} for row in body["users"])
    # the response is a bounded projection, not the raw store object
    assert "users.json" not in client.get("/api/admin/users/summary").text


def test_pagination_bounded_and_stable(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "AdminApiPage")
    client = _login("AdminApiPage")
    _seed_users({f"user{i:03d}": {"salt": "s", "hash": "h"} for i in range(25)})
    page1 = client.get("/api/admin/users?limit=10&offset=0").json()
    page2 = client.get("/api/admin/users?limit=10&offset=10").json()
    page3 = client.get("/api/admin/users?limit=10&offset=20").json()
    assert page1["total"] == page2["total"] == page3["total"] == 25
    assert len(page1["users"]) == len(page2["users"]) == 10 and len(page3["users"]) == 5
    first = page1["users"][0]["username"]
    assert page2["users"][0]["username"] != first  # deterministic order, no repeats
    names = [u["username"] for p in (page1, page2, page3) for u in p["users"]]
    assert names == sorted(names)
    # max limit clamp: a huge requested page size is rejected, not honored
    assert client.get("/api/admin/users?limit=1000").status_code == 422
    # offset past the end returns an empty page with the real total
    past = client.get("/api/admin/users?limit=10&offset=100").json()
    assert past["users"] == [] and past["total"] == 25


def test_provider_counts_match_registry(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "AdminApiMatch")
    client = _login("AdminApiMatch")
    _seed_users({
        "a": {"salt": "s", "hash": "h"},
        "b": {"salt": "s", "hash": "h"},
        "c": {"provider": "google", "subject": "s", "email": "e"},
        "d": {"provider": "google", "subject": "s", "email": "e"},
        "e": {"salt": "s", "hash": "h"},
    })
    body = client.get("/api/admin/users/summary").json()
    assert body == {
        "total_registered_accounts": 5,
        "local_accounts": 3,
        "google_accounts": 2,
    }
