"""Issue #5: table lifecycle, active / finished / abandoned eviction.

Tables are reached through `session_store` (hard rule 3), never through a
router's private registry. Each test owns a distinct user, so no test can be
affected by tables another test left behind.
"""
from __future__ import annotations

import time

from app.services.session_store import check_abandoned, mark_finished, session_store
from tests.api_helpers import login_client


def _create(client) -> str:
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "none", "fast_mode": 1.0})
    assert r.status_code == 200, r.text
    return r.json()["tableId"]


def test_active_table_remains_and_is_returned() -> None:
    client = login_client("LifeActive")
    tid = _create(client)
    assert client.get("/api/active-table").json()["tableId"] == tid
    assert client.get(f"/api/game/{tid}/state").json()["status"] == "active"


def test_finished_table_is_evicted() -> None:
    client = login_client("LifeFinished")
    tid = _create(client)
    session_store.get(tid).status = "finished"  # truly ended tournament
    assert session_store.evict_ended("LifeFinished") == 1
    assert session_store.get(tid) is None
    assert client.get(f"/api/game/{tid}/state").status_code == 404
    assert client.get("/api/active-table").json()["tableId"] is None


def test_idle_table_becomes_abandoned_and_is_evicted() -> None:
    client = login_client("LifeIdle")
    tid = _create(client)
    session = session_store.get(tid)
    session.last_seen = time.time() - session.idle_timeout - 1
    assert check_abandoned(session) is True
    assert session.status == "abandoned"
    assert session_store.evict_ended("LifeIdle") == 1
    assert client.get(f"/api/game/{tid}/state").status_code == 404


def test_active_tables_survive_eviction() -> None:
    client = login_client("LifeKeep")
    t1, t2 = _create(client), _create(client)
    assert session_store.evict_ended("LifeKeep") == 0
    assert session_store.get(t1) is not None
    assert session_store.get(t2) is not None


def test_viewing_a_table_keeps_it_from_being_abandoned() -> None:
    """`state()` refreshes last_seen, so an engaged table is never dropped by
    the idle timer."""
    client = login_client("LifeEngaged")
    tid = _create(client)
    session = session_store.get(tid)
    session.last_seen = time.time() - session.idle_timeout - 1
    client.get(f"/api/game/{tid}/state")
    assert check_abandoned(session) is False
    assert session_store.evict_ended("LifeEngaged") == 0
    assert session_store.get(tid) is not None


def test_ended_tables_go_before_live_ones() -> None:
    """Eviction order: creating a table drops the owner's ended ones first, and
    live tables under the cap are untouched."""
    client = login_client("LifeOrder")
    finished = _create(client)
    session_store.get(finished).status = "finished"
    live = [_create(client) for _ in range(3)]
    assert session_store.get(finished) is None
    owned = {s.session_id for s in session_store.owned_by("LifeOrder")}
    assert owned == set(live)


def test_mark_finished_needs_hero_out_and_no_live_opponent() -> None:
    client = login_client("LifeMark")
    session = session_store.get(_create(client))
    assert mark_finished(session) is False  # hero is still in
    hero = session.tournament.players[session.hero_seat]
    hero.is_eliminated = True
    assert mark_finished(session) is False  # opponents still playing
    for player in session.tournament.players:
        player.is_eliminated = True
    assert mark_finished(session) is True
    assert session.status == "finished"


def test_one_users_ended_table_is_swept_by_another_users_create() -> None:
    """The sweep is global. An owner who finishes a table and never comes back
    must not leak it until they happen to create another."""
    quitter = login_client("LifeQuitter")
    tid = _create(quitter)
    session_store.get(tid).status = "finished"
    _create(login_client("LifeStranger"))
    assert session_store.get(tid) is None
