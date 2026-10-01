"""A01 Admin tests: server-side Admin authorization (admin.md A01).

A scratch FastAPI app reuses the real `require_admin` dependency so the gate
is exercised exactly as a future Admin router would use it. Registry and token
stores are the in-memory singletons the other auth tests use (conftest resets
paths before every test)."""
from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps import require_admin
from app.core.config import settings
from app.main import app as real_app
from app.services.user_registry import UserRegistry, auth_registry
from tests.api_helpers import TEST_PASSWORD, register_user


def _admin_app() -> FastAPI:
    probe = FastAPI()

    @probe.get("/api/admin/_probe")
    def probe_route(user: str = Depends(require_admin)) -> dict:
        return {"admin": user}

    return probe


def _admin_client(username: str) -> tuple[TestClient, str]:
    """Register + sign in `username` and return (client, token)."""
    register_user(username)
    client = TestClient(real_app)
    auth = client.post(
        "/api/auth/login",
        json={"username": username, "password": TEST_PASSWORD},
    )
    assert auth.status_code == 200
    token = auth.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client, token


# ---------------------------------------------------------------------------
def test_unauthenticated_request_denied() -> None:
    anon = TestClient(_admin_app())
    assert anon.get("/api/admin/_probe").status_code == 401
    assert anon.get(
        "/api/admin/_probe", headers={"Authorization": "Bearer not-a-token"}
    ).status_code == 401


def test_normal_user_denied() -> None:
    client, _ = _admin_client("AdminDenyUser")
    r = TestClient(_admin_app()).get(
        "/api/admin/_probe", headers={"Authorization": client.headers["Authorization"]}
    )
    assert r.status_code == 403
    assert r.json() == {"detail": "admin access required"}


def test_configured_admin_allowed(monkeypatch) -> None:
    monkeypatch.setattr(settings, "admin_usernames", "Chief Operator")
    _, token = _admin_client("Chief Operator")
    r = TestClient(_admin_app()).get(
        "/api/admin/_probe", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json() == {"admin": "Chief Operator"}
    assert auth_registry.is_admin("Chief Operator") is True


def test_persisted_admin_flag_allowed(tmp_path) -> None:
    path = tmp_path / "users.json"
    path.write_text(
        '{"Flagged User": {"salt": "a", "hash": "b", "admin": true},'
        ' "Plain User": {"salt": "a", "hash": "b"}}',
        encoding="utf-8",
    )
    registry = UserRegistry(users_file=str(path))
    assert registry.is_admin("Flagged User") is True
    assert registry.is_admin("Plain User") is False
    assert registry.is_admin("Nobody") is False


def test_admin_never_exposes_credentials(monkeypatch) -> None:
    """The gate returns only the username; no store fields reach a response."""
    monkeypatch.setattr(settings, "admin_usernames", "CredentialProbe")
    _, token = _admin_client("CredentialProbe")
    body = TestClient(_admin_app()).get(
        "/api/admin/_probe", headers={"Authorization": f"Bearer {token}"}
    ).json()
    assert body == {"admin": "CredentialProbe"}


def test_existing_auth_flow_unchanged() -> None:
    """Register/login/me/logout still behave normally for normal users."""
    c = TestClient(real_app)
    name = "AdminRegressionUser"
    assert c.post(
        "/api/auth/register", json={"username": name, "password": TEST_PASSWORD}
    ).status_code == 200
    auth = c.post("/api/auth/login", json={"username": name, "password": TEST_PASSWORD})
    assert auth.status_code == 200
    token = auth.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert c.get("/api/auth/me", headers=headers).json() == {"username": name}
    assert c.post("/api/auth/logout", headers=headers).status_code == 200
    assert c.get("/api/auth/me", headers=headers).status_code == 401


def test_admin_still_uses_existing_endpoints(monkeypatch) -> None:
    """An Admin is still an authenticated user: normal endpoints accept the
    same token (require_user behavior unchanged for everyone)."""
    monkeypatch.setattr(settings, "admin_usernames", "AdminTabler")
    client, _ = _admin_client("AdminTabler")
    assert client.get("/api/auth/me").status_code == 200
    table = client.post(
        "/api/tournament",
        json={"players": 9, "starting_stack": 45_000, "fast_mode": 1.0},
    )
    assert table.status_code == 200
    assert len(table.json()["players"]) == 9


def test_google_oauth_routes_still_available() -> None:
    """Google auth paths are untouched: the public provider probe still
    answers and the start route still gate-keeps on configuration."""
    c = TestClient(real_app)
    assert c.get("/api/auth/providers").status_code == 200
    assert "google" in c.get("/api/auth/providers").json()
    start = c.get("/api/auth/google/start", params={"redirect_uri": ""})
    assert start.status_code in (400, 503)
