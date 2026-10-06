"""A44: the hero's finishing place is recorded on permanent elimination.

place = players still alive after that hand + 1; simultaneous busts in the
same hand are ordered by the stack they started the hand with (larger first).
"""
from __future__ import annotations

import random

from app.game.actions import Action, ActionType
from app.services.game_session import GameSession


def play_out(s: GameSession, guard: int = 5000) -> None:
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


def session_at_level(stack: int = 10_000, seed: int = 1, level: int = 6) -> GameSession:
    s = GameSession(starting_stack=stack, rng=random.Random(seed))
    s.start()
    s.tournament.level_index = level - 1
    play_out(s)
    return s


def test_hero_bust_alone_places_ninth_of_nine() -> None:
    s = session_at_level()
    hero = s.tournament.players[s.hero_seat]
    hero.stack = 0
    s.next_hand()  # elimination applies at the next boundary
    assert hero.is_eliminated
    assert not hero.awaiting_reentry
    assert s.hero_finish_place == 9  # 8 players still alive + 1


def test_hero_finish_place_exposed_in_state_view() -> None:
    s = session_at_level()
    s.tournament.players[s.hero_seat].stack = 0
    s.next_hand()
    assert s.state()["heroFinishPlace"] == 9
    live = GameSession(starting_stack=10_000, rng=random.Random(2))
    live.start()
    assert live.state()["heroFinishPlace"] is None


def test_larger_starting_stack_places_higher() -> None:
    s = session_at_level()
    hero = s.tournament.players[s.hero_seat]
    other = s.tournament.players[1]
    hero.stack = 0
    other.stack = 0
    # the other bot started the hand deeper, so it places above the hero
    assert s.engine is not None and s.engine.result is not None
    s.engine.result.starting_stacks[1] = 12_000
    s.next_hand()
    assert hero.is_eliminated and other.is_eliminated
    assert s.hero_finish_place == 9  # 7 alive, hero after the bigger stack


def test_equal_stack_simultaneous_bust_keeps_seat_order() -> None:
    s = session_at_level()
    hero = s.tournament.players[s.hero_seat]
    other = s.tournament.players[1]
    hero.stack = 0
    other.stack = 0
    s.next_hand()
    assert hero.is_eliminated and other.is_eliminated
    assert s.hero_finish_place == 8  # 7 alive, hero (seat 0) first in the tie


def test_reentry_level_has_no_finish_place() -> None:
    s = session_at_level(seed=2, level=2)
    hero = s.tournament.players[s.hero_seat]
    hero.stack = 0
    s.next_hand()
    assert hero.awaiting_reentry and not hero.is_eliminated
    assert s.hero_finish_place is None
