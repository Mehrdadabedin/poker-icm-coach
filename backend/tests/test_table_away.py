"""Stepping away from the table stops the tournament clock (plan 063).

Before this, the level clock ran on wall time while the hero was on another
page, so the blinds rose while they read their mistakes, and a table left for
30 minutes was abandoned. The clock is driven by a fake time source here, so
nothing sleeps.
"""
from __future__ import annotations

import random
import time

from fastapi.testclient import TestClient

from app.main import app
from app.services.game_session import GameSession
from app.services.session_store import check_abandoned
from tests.api_helpers import login_client


class FakeClock:
    def __init__(self) -> None:
        self.now = 1_000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def _session_on_fake_clock() -> tuple[GameSession, FakeClock]:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    clock = FakeClock()
    assert session.timer is not None
    session.timer.pause()          # hand the running clock over to the fake one
    session.timer.clock = clock
    session.timer.resume()
    return session, clock


def test_the_clock_stops_while_away_and_continues_from_the_same_second() -> None:
    session, clock = _session_on_fake_clock()
    before = session.state()["secondsLeft"]

    session.step_away()
    clock.advance(600)
    assert session.state()["secondsLeft"] == before, "the blinds clock ran while the hero was away"

    session.come_back()
    clock.advance(10)
    assert session.state()["secondsLeft"] == before - 10


def test_viewing_a_finished_hand_does_not_restart_the_clock_while_away() -> None:
    session, clock = _session_on_fake_clock()
    while session.phase() != "handOver":
        session.hero_action("fold")
    session.step_away()
    session.state()  # state() restarts a paused clock between hands, unless away
    assert session.timer is not None and not session.timer.running, (
        "the clock restarted between hands although the hero is away"
    )


def test_playing_on_means_the_hero_is_back() -> None:
    session, _clock = _session_on_fake_clock()
    session.step_away()
    session.hero_action("fold")
    assert session.away is False


def test_an_away_table_is_kept_for_two_hours_not_thirty_minutes() -> None:
    session, _clock = _session_on_fake_clock()
    now = time.time()
    session.last_seen = now - 31 * 60
    session.away = True
    assert not check_abandoned(session, now), "an away table was abandoned after 31 minutes"
    session.away = False
    assert check_abandoned(session, now)


def test_away_and_back_endpoints_are_owner_only() -> None:
    owner = login_client("AwayOwner")
    created = owner.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0,
    })
    table = created.json()["tableId"]

    away = owner.post(f"/api/game/{table}/away")
    assert away.status_code == 200 and away.json()["away"] is True
    assert owner.get(f"/api/game/{table}/state").json()["away"] is True
    back = owner.post(f"/api/game/{table}/back")
    assert back.status_code == 200 and back.json()["away"] is False

    assert login_client("AwayStranger").post(f"/api/game/{table}/away").status_code == 404
    assert TestClient(app).post(f"/api/game/{table}/away").status_code == 401
