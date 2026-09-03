"""Concurrent use of two table_ids must keep games independent (threads
hammer both tables at once; an asyncio burst and websockets included)."""
from __future__ import annotations

import asyncio
import concurrent.futures
import threading

import httpx

from app.main import app
from tests.api_helpers import login_client, ws_url

TOURNAMENT = {"players": 9, "ante_mode": "none", "fast_mode": 1.0}
_TIME_VOLATILE = {"secondsLeft"}

client = login_client("Alice")

def create_table(starting_stack: int = 45_000, blind_level_minutes: int = 20,
                 fast_mode: float = 1.0, c=None) -> str:
    c = c or client
    body = dict(TOURNAMENT, starting_stack=starting_stack,
                blind_level_minutes=blind_level_minutes, fast_mode=fast_mode)
    r = c.post("/api/tournament", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["tableId"]
    return r.json()["tableId"]

def state_of(table_id: str, c=None) -> dict:
    c = c or client
    r = c.get(f"/api/game/{table_id}/state")
    assert r.status_code == 200, r.text
    return r.json()

def act_hero(table_id: str, kind: str, amount: int | None = None, c=None) -> dict:
    c = c or client
    body = {"kind": kind}
    if amount is not None:
        body["amount"] = amount
    r = c.post(f"/api/game/{table_id}/action", json=body)
    assert r.status_code == 200, r.text
    return r.json()

def simple_hero_action(state: dict) -> str:
    legal = [a["kind"] for a in state["legalActions"]]
    if "check" in legal:
        return "check"
    if "call" in legal:
        return "call"
    return "fold"

def play_one_hand(table_id: str, c=None) -> int:
    for _ in range(400):
        state = state_of(table_id, c)
        if state["phase"] == "handOver":
            return state["handNumber"]
        if state["waitingForHero"]:
            act_hero(table_id, simple_hero_action(state), c=c)
    raise AssertionError(f"hand on {table_id} did not finish")

def play_hands(table_id: str, count: int, c=None) -> int:
    for _ in range(count):
        play_one_hand(table_id, c)
        r = (c or client).post(f"/api/game/{table_id}/next-hand")
        assert r.status_code == 200, r.text
    return state_of(table_id, c)["handNumber"]

def chips_in_play(state: dict) -> int:
    return sum(p["stack"] for p in state["players"]) + sum(p["bet"] for p in state["players"])

def normalized(state: dict) -> dict:
    out = dict(state)
    for key in _TIME_VOLATILE:
        out.pop(key, None)
    return out

def game_fingerprint(table_id: str, c=None) -> dict:
    return normalized(state_of(table_id, c))

# ---------------------------------------------------------------------------
# Threaded concurrency against the same app
# ---------------------------------------------------------------------------

def test_concurrent_plays_on_two_tables_do_not_cross_talk() -> None:
    a = create_table(starting_stack=35_000)
    b = create_table(starting_stack=48_000)
    assert chips_in_play(state_of(b)) == 48_000 * 9

    results: dict[str, int] = {}
    lock = threading.Lock()

    def play(table_id: str) -> int:
        c = login_client("Alice")
        final = play_hands(table_id, 3, c=c)
        with lock:
            results[table_id] = final
        return final

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for f in [pool.submit(play, a), pool.submit(play, b)]:
            f.result(timeout=120)

    assert results[a] == 4
    assert results[b] == 4
    ha = [h["handNumber"] for h in client.get(f"/api/game/{a}/hands").json()["hands"]]
    hb = [h["handNumber"] for h in client.get(f"/api/game/{b}/hands").json()["hands"]]
    assert ha == [1, 2, 3], ha
    assert hb == [1, 2, 3], hb
    # Chip totals: each table's total must stay composed of its OWN
    # denomination (reentry credits add whole starting stacks in levels 1-3,
    # by design). If the two tables were mixing chips, these mod checks would
    # fail (35,000 is not a multiple of 48,000 and vice versa).
    ta = chips_in_play(state_of(a))
    tb = chips_in_play(state_of(b))
    assert ta % 35_000 == 0 and ta >= 35_000 * 9, ta
    assert tb % 48_000 == 0 and tb >= 48_000 * 9, tb
    hero_b = next(p for p in state_of(b)["players"] if p["isHero"])
    assert hero_b["stack"] > 0

def test_concurrent_state_polls_on_idle_table_remain_stable() -> None:
    a = create_table()
    b = create_table()
    expected = game_fingerprint(b)
    errors: list[str] = []
    lock = threading.Lock()

    def poll_b() -> None:
        c = login_client("Alice")
        for _ in range(15):
            snap = game_fingerprint(b, c)
            if snap != expected:
                with lock:
                    errors.append(f"B changed while A played: {snap} vs {expected}")

    def play_a() -> None:
        c = login_client("Alice")
        play_hands(a, 2, c=c)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futs = [pool.submit(poll_b) for _ in range(3)] + [pool.submit(play_a)]
        for f in futs:
            f.result(timeout=120)

    assert not errors, errors
    assert state_of(a)["handNumber"] == 3

def test_asyncio_burst_keeps_tables_isolated() -> None:
    async def run() -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            auth = {"Authorization": f"Bearer {client.auth_token}"}
            ra = await ac.post("/api/tournament", json=dict(TOURNAMENT, starting_stack=35_000), headers=auth)
            rb = await ac.post("/api/tournament", json=dict(TOURNAMENT, starting_stack=48_000), headers=auth)
            assert ra.status_code == 200 and rb.status_code == 200
            a = ra.json()["tableId"]
            b = rb.json()["tableId"]

            async def burst() -> None:
                tasks = []
                for _ in range(10):
                    tasks.append(ac.get(f"/api/game/{a}/state", headers=auth))
                    tasks.append(ac.get(f"/api/game/{b}/state", headers=auth))
                    tasks.append(ac.post(f"/api/game/{a}/coach", headers=auth))
                    tasks.append(ac.post(f"/api/game/{b}/coach", headers=auth))
                for resp in await asyncio.gather(*tasks):
                    assert resp.status_code == 200, resp.text

            await burst()

            sa = (await ac.get(f"/api/game/{a}/state", headers=auth)).json()
            sb = (await ac.get(f"/api/game/{b}/state", headers=auth)).json()
            assert sa["tableId"] == a and sb["tableId"] == b
            assert sa["handNumber"] == 1 and sb["handNumber"] == 1
            assert sa["players"][0]["stack"] == 35_000
            assert sb["players"][0]["stack"] == 48_000
            ca = (await ac.post(f"/api/game/{a}/coach", headers=auth)).json()
            cb = (await ac.post(f"/api/game/{b}/coach", headers=auth)).json()
            assert "35,000" in (ca.get("detail") or {}).get("STACK", "")
            assert "48,000" in (cb.get("detail") or {}).get("STACK", "")

    asyncio.run(run())

# --- WebSocket streams ---

def test_websocket_streams_are_table_scoped() -> None:
    a = create_table(starting_stack=25_000)
    b = create_table(starting_stack=60_000)
    with client.websocket_connect(ws_url(a, client)) as wsa, \
            client.websocket_connect(ws_url(b, client)) as wsb:
        wsa.send_text("state")
        wsb.send_text("state")
        sa = wsa.receive_json()
        sb = wsb.receive_json()
    assert sa["tableId"] == a
    assert sb["tableId"] == b
    assert sa["handNumber"] == 1 and sb["handNumber"] == 1
    hero_a = next(p for p in sa["players"] if p["isHero"])
    hero_b = next(p for p in sb["players"] if p["isHero"])
    assert hero_a["stack"] == 25_000
    assert hero_b["stack"] == 60_000
