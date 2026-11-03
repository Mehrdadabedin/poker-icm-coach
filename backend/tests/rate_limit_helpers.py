"""Shared by the rate limit route tests (plan 109)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from tests.api_helpers import TEST_PASSWORD, register_user

LOGIN = "/api/auth/login"
ADVICE = {
    "heroCards": [{"rank": "A", "suit": "s"}, {"rank": "K", "suit": "h"}],
    "position": "BTN", "stack": 30000, "bigBlind": 1000, "smallBlind": 500, "ante": 0,
    "pot": 1800, "toCall": 0, "board": [], "street": "preflop", "playersRemaining": 9,
    "paidPositions": 6, "stacks": [30000] * 9, "payout": [0.4, 0.25, 0.15, 0.1, 0.06, 0.04],
    "facingRaise": False, "heroSeat": 0, "mode": "advanced", "exactCards": False,
}


def from_ip(ip: str, token: str | None = None) -> TestClient:
    """A client behind one proxy. TRUSTED_PROXY_HOPS=1 reads the rightmost entry."""
    client = TestClient(app, headers={"X-Forwarded-For": ip})
    if token:
        client.headers["Authorization"] = f"Bearer {token}"
    return client


def pro_token(name: str) -> str:
    """Tests start on Pro (conftest)."""
    register_user(name)
    response = TestClient(app).post(LOGIN, json={"username": name, "password": TEST_PASSWORD})
    return response.json()["token"]
