"""A hand is in the history as soon as it ends (plan 068).

It used to be recorded only when the next hand was dealt, so a mistake was
missing from My Mistakes (and the hand from HAND HISTORY) right after it was
made. Recording at the end must not record it twice when the next hand comes.
"""
from __future__ import annotations

import random

from app.services.game_session import GameSession
from tests.api_helpers import login_client


def _session() -> GameSession:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    return session


def _play_out(session: GameSession) -> None:
    """Call or check every hero decision until the current hand ends."""
    while session.phase() != "handOver":
        assert session.engine is not None
        assert session.engine.current_actor == session.hero_seat, "the hand stalled"
        session.hero_action("call" if session.state()["toCall"] else "check")


def test_a_finished_hand_is_in_the_history_before_the_next_deal() -> None:
    session = _session()
    _play_out(session)
    assert session.engine is not None and session.engine.result is not None
    hands = session.history.all()
    assert [h.hand_number for h in hands] == [session.engine.result.hand_number], (
        "the hand that just ended must be recorded before next_hand()"
    )
    assert hands[0].decisions, "with the hero's graded decisions"


def test_the_next_deal_does_not_record_the_hand_again() -> None:
    session = _session()
    _play_out(session)
    session.next_hand()
    assert len(session.history.all()) == 1
    _play_out(session)
    session.next_hand()
    numbers = [h.hand_number for h in session.history.all()]
    assert numbers == sorted(set(numbers)) and len(numbers) == 2, numbers


def test_the_hands_api_lists_the_hand_that_just_ended() -> None:
    client = login_client("HandAtEndUser")
    created = client.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0,
    })
    assert created.status_code == 200, created.text
    table = created.json()["tableId"]
    for _ in range(60):  # act until the first hand ends; never deal the next one
        state = client.get(f"/api/game/{table}/state").json()
        if state["phase"] == "handOver":
            break
        assert state["currentActor"] == state["heroSeat"], "the hand stalled"
        kind = "call" if state["toCall"] else "check"
        assert client.post(f"/api/game/{table}/action", json={"kind": kind}).status_code == 200
    assert state["phase"] == "handOver"
    hands = client.get(f"/api/game/{table}/hands").json()["hands"]
    assert [h["handNumber"] for h in hands] == [state["handNumber"]]
