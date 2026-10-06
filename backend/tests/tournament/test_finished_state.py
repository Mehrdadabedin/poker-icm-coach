"""A41: a finished one-survivor tournament must serialize cleanly (A40 relic).

A40 stops the tournament once <=1 active player remains, but the state view
rebuilt the last hand's review from the *current* active set, so the A40
blind_seats guard saw a single seat and raised, turning every finished-state
read into an HTTP 500. These tests exercise the real serialization path
(`session.state()` and the GET state route) for a finished table.
"""
from __future__ import annotations

import random

import pytest

from app.game.actions import Action, ActionType
from app.services.game_session import GameSession
from app.services.session_store import session_store
from tests.api_helpers import login_client


def play_out(s: GameSession, guard: int = 5000) -> None:
    """Advance the current hand to completion (hero folds when asked)."""
    steps = 0
    while not s.engine.is_complete and steps < guard:
        actor = s.engine.current_actor
        if actor is None:
            break
        player = s.tournament.players[actor]
        if player.is_human:
            s.engine.act(actor, Action(ActionType.FOLD))
        else:
            s.engine.advance_bot(actor)
        steps += 1
    assert s.engine.is_complete, "hand did not complete"


def finished_bot_champion(seed: int = 0) -> GameSession:
    """A finished tournament whose sole survivor is a BOT (A40 recipe)."""
    s = GameSession(starting_stack=1200, fast_mode=4.0, rng=random.Random(seed))
    s.start()
    s.tournament.level_index = 14
    play_out(s)
    hero = s.tournament.players[s.hero_seat]
    hero.stack = 0
    hero.is_eliminated = True
    hero.sit_out = True
    for _ in range(80):
        s.next_hand()
        if s.status == "finished":
            break
    assert s.status == "finished"
    return s


def finished_human_champion() -> GameSession:
    """A finished tournament whose sole survivor is the hero (A40 recipe)."""
    s = GameSession(starting_stack=10_000, rng=random.Random(5))
    s.start()
    play_out(s)
    for p in s.tournament.players:
        if not p.is_human:
            p.is_eliminated = True
            p.sit_out = True
    s.next_hand()
    assert s.status == "finished"
    return s


def live_names(state: dict) -> list[str]:
    return [p["name"] for p in state["players"] if not p["sitsOut"]]


def blind_entries(state: dict) -> list[dict]:
    return [a for a in state["review"]["actions"]
            if a["action"] in ("small_blind", "big_blind")]


def test_finished_single_survivor_serializes() -> None:
    s = finished_bot_champion()
    state = s.state()  # previously raised ValueError (HTTP 500)
    assert state["status"] == "finished"
    assert state["playersRemaining"] == 1
    assert len(live_names(state)) == 1
    assert state["review"] is not None
    blind = blind_entries(state)
    assert len(blind) == 2
    assert blind[0]["seat"] != blind[1]["seat"]


def test_repeated_state_reads_are_stable() -> None:
    s = finished_bot_champion()
    first = s.state()
    for state in (s.state(), s.state()):
        assert state["status"] == "finished"
        assert state["playersRemaining"] == 1
        assert state["handNumber"] == first["handNumber"]
        assert live_names(state) == live_names(first)


def test_bot_champion_keeps_real_name() -> None:
    s = finished_bot_champion()
    champion = [p for p in s.tournament.players if not p.is_eliminated][0]
    assert not champion.is_human and champion.name.startswith("Bot ")
    state = s.state()
    assert live_names(state) == [champion.name]
    assert [p for p in state["players"] if not p["sitsOut"]][0]["isHero"] is False


def test_human_champion_serializes() -> None:
    s = finished_human_champion()
    hero = s.tournament.players[s.hero_seat]
    assert not hero.is_eliminated
    for _ in range(3):
        state = s.state()
        assert state["status"] == "finished"
        assert state["playersRemaining"] == 1
        assert live_names(state) == [hero.name]
        assert [p for p in state["players"] if not p["sitsOut"]][0]["isHero"]


def test_normal_active_state_keeps_blind_review() -> None:
    s = GameSession(starting_stack=45_000, rng=random.Random(3))
    s.start()
    play_out(s)  # hand 1 completes; nine players still active
    assert s.status == "active"
    state = s.state()
    assert state["phase"] == "handOver"
    assert state["playersRemaining"] == 9
    blind = blind_entries(state)
    assert len(blind) == 2 and blind[0]["seat"] != blind[1]["seat"]


def test_api_get_state_on_finished_table_returns_200() -> None:
    client = login_client("A41BotWinner")
    s = finished_bot_champion()
    s.owner = "A41BotWinner"
    session_store.add(s)
    response = client.get(f"/api/game/{s.session_id}/state")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "finished"
    assert body["playersRemaining"] == 1
    # the real BOT winner, never the authenticated user
    assert live_names(body) != ["A41BotWinner"]
    assert client.get(f"/api/game/{s.session_id}/state").status_code == 200


def test_next_hand_after_finish_raises_without_duplicate_history() -> None:
    """A45: next_hand on a finished table is rejected before writing history."""
    s = finished_bot_champion()
    before = len(s.history.all())
    with pytest.raises(ValueError):
        s.next_hand()
    assert len(s.history.all()) == before
