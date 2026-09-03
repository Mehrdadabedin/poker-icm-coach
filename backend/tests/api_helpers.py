"""Shared test helpers: authenticated FastAPI test clients (A03)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def login_client(username: str = "Tester") -> TestClient:
    """TestClient already authenticated as `username` (bearer header set)."""
    client = TestClient(app)
    response = client.post("/api/auth/login", json={"username": username})
    assert response.status_code == 200, response.text
    token = response.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    client.auth_token = token  # type: ignore[attr-defined]
    return client


def ws_url(table_id: str, client: TestClient) -> str:
    """WebSocket URL carrying the caller's bearer token (ownership check)."""
    token = getattr(client, "auth_token", "")
    return f"/ws/table/{table_id}?token={token}"
