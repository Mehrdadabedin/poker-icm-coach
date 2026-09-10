"""The table WebSocket must not run game work on the event loop.

These tests need a real server: TestClient gives each request its own event
loop, so it cannot show one connection stalling another.
"""
from __future__ import annotations

import asyncio
import socket
import threading
import time
from collections.abc import Iterator

import httpx
import pytest
import uvicorn
import websockets

from app.main import app
from app.services.game_session import GameSession

PASSWORD = "test-pass-1234"
SLOW_ACTION_SECONDS = 0.3
# A stalled event loop serves nothing else for the whole action; a healthy one
# answers immediately. The gap between the two is an order of magnitude.
RESPONSIVE_SECONDS = 0.15


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@pytest.fixture(scope="module")
def live_server() -> Iterator[str]:
    """A real uvicorn server on an ephemeral port, torn down after the module."""
    port = _free_port()
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port,
                                           log_level="error"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            httpx.get(f"{base}/api/health", timeout=1)
            break
        except httpx.HTTPError:
            time.sleep(0.05)
    else:  # pragma: no cover - only on a broken environment
        pytest.fail("live server never became reachable")
    yield base
    server.should_exit = True
    thread.join(timeout=5)


def _open_table(base: str, username: str) -> tuple[str, str]:
    """Register, sign in and deal a table. Returns (table_id, token)."""
    with httpx.Client(base_url=base, timeout=10) as client:
        client.post("/api/auth/register",
                    json={"username": username, "password": PASSWORD})
        token = client.post("/api/auth/login",
                            json={"username": username,
                                  "password": PASSWORD}).json()["token"]
        client.headers["Authorization"] = f"Bearer {token}"
        table = client.post("/api/tournament",
                            json={"players": 9, "ante_mode": "none",
                                  "fast_mode": 1.0}).json()["tableId"]
    return table, token


def test_a_slow_websocket_action_does_not_stall_other_requests(
    live_server: str, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Game work runs in the threadpool, so one table cannot freeze the API.

    A hand can take real time (the bot loop plays it out); running that on the
    event loop blocks every other connection in the process for its duration.
    """
    real_action = GameSession.hero_action

    def slow_action(self: GameSession, kind: str, amount: int | None = None) -> None:
        time.sleep(SLOW_ACTION_SECONDS)
        real_action(self, kind, amount)

    monkeypatch.setattr(GameSession, "hero_action", slow_action)
    table_id, token = _open_table(live_server, "WsBlocker")
    host = live_server.removeprefix("http://")

    async def exercise() -> float:
        uri = f"ws://{host}/ws/table/{table_id}?token={token}"
        async with websockets.connect(uri) as ws:
            await ws.send("action:fold")
            await asyncio.sleep(0.05)  # let the server pick the message up
            start = time.perf_counter()
            response = httpx.get(f"{live_server}/api/health", timeout=5)
            elapsed = time.perf_counter() - start
            assert response.status_code == 200
            await ws.recv()
            return elapsed

    elapsed = asyncio.run(exercise())
    assert elapsed < RESPONSIVE_SECONDS, (
        f"/api/health took {elapsed:.3f}s while a websocket action was running: "
        "the event loop is blocked on game work"
    )
