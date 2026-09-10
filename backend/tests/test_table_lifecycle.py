"""Issue #5 — table lifecycle: active / finished / abandoned eviction."""
from __future__ import annotations

import time

import pytest

from app.api.routes_game import _sessions
from app.services.session_store import LIVE_TABLES_PER_USER, cap_live_tables, check_abandoned, evict_sessions
from tests.api_helpers import login_client

a = login_client("LifeA")


@pytest.fixture(autouse=True)
def _clear_sessions():
    _sessions.clear()
    yield
    _sessions.clear()


def _create() -> str:
    r = a.post("/api/tournament", json={"players": 9, "ante_mode": "none", "fast_mode": 1.0})
    assert r.status_code == 200, r.text
    return r.json()["tableId"]


def test_active_table_remains_and_is_returned() -> None:
    tid = _create()
    assert a.get("/api/active-table").json()["tableId"] == tid
    assert a.get(f"/api/game/{tid}/state").json()["status"] == "active"


def test_finished_table_can_be_evicted() -> None:
    tid = _create()
    _sessions[tid].status = "finished"  # truly ended tournament
    evict_sessions(_sessions, owner="LifeA")
    assert tid not in _sessions
    assert a.get(f"/api/game/{tid}/state").status_code == 404
    assert a.get("/api/active-table").json()["tableId"] is None


def test_abandoned_table_can_be_evicted() -> None:
    tid = _create()
    sess = _sessions[tid]
    sess.last_seen = time.time() - 99999  # pretend idle well past timeout
    assert check_abandoned(sess)
    evict_sessions(_sessions, owner="LifeA")
    assert tid not in _sessions
    assert a.get(f"/api/game/{tid}/state").status_code == 404


def test_active_tables_are_not_evicted() -> None:
    t1, t2 = _create(), _create()
    evict_sessions(_sessions, owner="LifeA")
    assert t1 in _sessions and t2 in _sessions


def test_live_cap_keeps_cap_and_evicts_oldest() -> None:
    ids = [_create() for _ in range(LIVE_TABLES_PER_USER + 1)]
    cap_live_tables(_sessions, "LifeA")
    owned = [s for s in _sessions.values() if s.owner == "LifeA" and s.status == "active"]
    assert len(owned) == LIVE_TABLES_PER_USER
    owned_ids = {s.session_id for s in owned}
    assert ids[-1] in owned_ids      # newest survives
    assert ids[0] not in owned_ids    # oldest evicted


def test_finished_evicted_before_live_cap() -> None:
    """Eviction policy: finished tables go before the live cap is ever hit."""
    finished_id = _create()
    _sessions[finished_id].status = "finished"
    live = [_create() for _ in range(4)]
    evict_sessions(_sessions, owner="LifeA")
    # live tables still under cap remain even though a finished one existed
    owned = [s for s in _sessions.values() if s.owner == "LifeA" and s.status == "active"]
    assert finished_id not in _sessions
    assert len(owned) == 4
    assert {s.session_id for s in owned} == set(live)
