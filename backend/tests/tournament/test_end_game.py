"""Ending the tournament once the hero is out (plan 092).

The owner: after losing the all-in and not re-entering, offer to watch or to
end the game, and with END GAME place everyone 1st to 9th by chips ("Emma has
269,000 and David has 156,000"). Players already out keep the places they
went out in.
"""
from __future__ import annotations

import random

import pytest

from app.services.elimination import apply_reentry_or_elimination
from app.services.game_session import GameSession
from app.services.session_store import session_store
from tests.api_helpers import login_client
from tests.tournament.test_hero_finish import play_out, session_at_level

STACKS = {1: 156_000, 2: 269_000, 3: 120_000, 4: 90_000, 5: 61_000, 6: 30_000}


def _bust(s: GameSession, *seats: int) -> None:
    for seat in seats:
        s.tournament.players[seat].stack = 0
    s.next_hand()  # places are given at the next hand boundary
    play_out(s)


def test_end_game_places_the_players_still_in_by_chips() -> None:
    s = session_at_level(level=6)
    _bust(s, 7, 8)  # out first: 8th and 9th
    _bust(s, 0)  # then the hero: 7th
    assert s.hero_finish_place == 7
    for seat, chips in STACKS.items():
        s.tournament.players[seat].stack = chips

    s.end_by_chips()

    rows = s.state()["standings"]
    assert [r["seat"] for r in rows[:7]] == [2, 1, 3, 4, 5, 6, 0]  # chip leader first, hero 7th
    assert [r["chips"] for r in rows[:6]] == [269_000, 156_000, 120_000, 90_000, 61_000, 30_000]
    assert sorted(r["seat"] for r in rows[7:]) == [7, 8] and all(r["out"] for r in rows[6:])
    assert [r["place"] for r in rows] == list(range(1, 10))
    assert s.status == "finished" and s.hero_finish_place == 7
    with pytest.raises(ValueError, match="not active"):
        s.next_hand()


def test_a_hero_waiting_to_re_enter_can_end_the_game_and_places_last() -> None:
    s = GameSession(starting_stack=10_000, rng=random.Random(3))
    s.start()
    play_out(s)
    s.tournament.players[0].stack = 0
    apply_reentry_or_elimination(s)  # level 1: the hero waits to re-enter
    s.end_by_chips()
    rows = s.final_standings or []
    assert len(rows) == 9 and rows[-1]["isHero"] and rows[-1]["chips"] == 0
    assert s.hero_finish_place == 9


def test_a_hero_with_chips_cannot_end_the_game() -> None:
    s = session_at_level(level=6)
    with pytest.raises(ValueError, match="only after you are out"):
        s.end_by_chips()
    assert s.final_standings is None and s.status == "active"


def test_the_end_route_is_the_owners_and_needs_the_hero_out() -> None:
    owner = login_client("EndGameOwner")
    tid = owner.post("/api/tournament", json={"players": 9}).json()["tableId"]
    assert owner.post(f"/api/game/{tid}/end").status_code == 400  # still has chips
    assert login_client("EndGameOther").post(f"/api/game/{tid}/end").status_code == 404
    session = session_store.get(tid)
    play_out(session)
    session.tournament.players[session.hero_seat].stack = 0
    apply_reentry_or_elimination(session)
    ended = owner.post(f"/api/game/{tid}/end")
    assert ended.status_code == 200, ended.text
    body = ended.json()
    assert body["status"] == "finished" and len(body["standings"]) == 9
    assert body["standings"][-1]["isHero"] and body["heroFinishPlace"] == 9
