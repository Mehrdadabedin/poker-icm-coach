"""The table WebSocket must not run game work on the event loop.

This needs a real server: TestClient gives each request its own event loop, so
it cannot show one connection stalling another. The test is ordering-based, not
timed — a gated action holds the handler open while a second request is served,
so a blocked loop shows up as a request that never completes rather than as a
number close to a threshold.
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

from app.main import app
from app.services.game_session import GameSession

websockets = pytest.importorskip("websockets", reason="needs a websocket client")

PASSWORD = "test-pass-1234"
GATE_TIMEOUT = 10.0
# Generous: this is a failure detector, not a performance budget. A free event
# loop answers in milliseconds; a blocked one never answers at all.
HEALTH_TIMEOUT = 5.0


def _free_port() -> int:
    try:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = int(sock.getsockname()[1])
    except OSError as exc:  # pragma: no cover - sandbox dependent
        pytest.skip(f"cannot bind a local socket in this environment: {exc}")
    return port


@pytest.fixture(scope="module")
def live_server() -> Iterator[str]:
    """A real uvicorn server on an ephemeral port, torn down after the module."""
    port = _free_port()
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port,
                                           log_level="error"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
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


def test_a_websocket_action_in_flight_does_not_stall_other_requests(
    live_server: str, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Game work runs in the threadpool, so one table cannot freeze the API.

    A hand takes real time — hero_action plays the bot loop out to the next
    hero decision — and running that on the event loop blocked every other
    connection in the process for its duration.
    """
    started, proceed = threading.Event(), threading.Event()
    real_action = GameSession.hero_action

    def gated_action(self: GameSession, kind: str, amount: int | None = None) -> None:
        started.set()
        assert proceed.wait(timeout=GATE_TIMEOUT), "gate never released"
        real_action(self, kind, amount)

    monkeypatch.setattr(GameSession, "hero_action", gated_action)
    table_id, token = _open_table(live_server, "WsBlocker")
    host = live_server.removeprefix("http://")

    async def exercise() -> None:
        uri = f"ws://{host}/ws/table/{table_id}?token={token}"
        async with websockets.connect(uri) as ws:
            await ws.send("action:fold")
            assert await asyncio.to_thread(started.wait, GATE_TIMEOUT), (
                "the websocket handler never reached the action"
            )
            try:  # the action is now parked mid-handler
                response = await asyncio.to_thread(
                    httpx.get, f"{live_server}/api/health", timeout=HEALTH_TIMEOUT
                )
            except httpx.TimeoutException:
                pytest.fail("/api/health never answered while a websocket action "
                            "was in flight: the event loop is blocked on game work")
            assert response.status_code == 200
            proceed.set()
            await ws.recv()

    asyncio.run(exercise())
