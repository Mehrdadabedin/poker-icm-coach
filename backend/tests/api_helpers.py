"""Shared test helpers: authenticated FastAPI test clients (A03/A18)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.auth import auth_registry

TEST_PASSWORD = "test-pass-1234"

# Tests must stay hermetic: module-level login_client() calls run at
# collection time, before the autouse conftest fixture resets paths. Force the
# user registry to pure in-memory mode as soon as the helpers are imported.
auth_registry.bind_path("")


def register_user(username: str, password: str = TEST_PASSWORD) -> None:
    """Register a user on the shared (in-memory) registry (A18)."""
    c = TestClient(app)
    r = c.post("/api/auth/register", json={"username": username, "password": password})
    # A duplicate is fine: the user is already registered under TEST_PASSWORD.
    assert r.status_code in (200, 400), r.text


def login_client(username: str = "Tester") -> TestClient:
    """TestClient already authenticated as `username` (bearer header set).

    Registers the user first (idempotent), then signs in with TEST_PASSWORD.
    """
    register_user(username)
    client = TestClient(app)
    response = client.post("/api/auth/login", json={
        "username": username, "password": TEST_PASSWORD,
    })
    assert response.status_code == 200, response.text
    token = response.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    client.auth_token = token  # type: ignore[attr-defined]
    return client


def ws_url(table_id: str, client: TestClient) -> str:
    """WebSocket URL carrying the caller's bearer token (ownership check)."""
    token = getattr(client, "auth_token", "")
    return f"/ws/table/{table_id}?token={token}"
