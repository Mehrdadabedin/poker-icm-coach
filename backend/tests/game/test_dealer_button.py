"""Dealer button rotation tests (Atomic Part 006).

Rule (A42): the next hand's button is this hand's small blind. Positions are
modelled in seat-index order and the seat layout runs clockwise with
increasing seat index, so the button advances by +1 seat index per hand,
skipping inactive seats.
"""
from __future__ import annotations

import random

import pytest

from app.game.actions import Action, ActionType
from app.game.dealer_button import next_button
from app.game.hand_setup import blind_seats
from app.game.positions import ROTATION_ORDER_9, position_for
from app.services.game_session import GameSession


def test_button_advances_one_seat() -> None:
    assert next_button(current=2, num_seats=9, active_seats=set(range(9))) == 3


def test_button_wraps_to_zero() -> None:
    assert next_button(current=8, num_seats=9, active_seats=set(range(9))) == 0


def test_button_from_zero() -> None:
    assert next_button(current=0, num_seats=9, active_seats=set(range(9))) == 1


def test_button_skips_eliminated() -> None:
    # seat 3 eliminated; forward from 2 -> 4 (single step)
    assert next_button(current=2, num_seats=9,
                       active_seats={0, 1, 2, 4, 5, 6, 7, 8}) == 4


def test_button_wraps_skipping_eliminated() -> None:
    # seats 9 and 1 eliminated; forward from 8 -> 0
    assert next_button(current=8, num_seats=9,
                       active_seats={0, 1, 2, 3, 4, 5, 8}) == 0


def test_single_active_player_stays() -> None:
    assert next_button(current=5, num_seats=9, active_seats={5}) == 5


def test_two_players_heads_up() -> None:
    # heads-up: the two seats alternate as the button walks forward
    assert next_button(current=2, num_seats=9, active_seats={2, 7}) == 7
    assert next_button(current=7, num_seats=9, active_seats={2, 7}) == 2


def test_forward_ring_is_fixed_order() -> None:
    """One full 9-hand cycle must visit every seat in index order.""" ""
    current = 0
    visited = [current]
    for _ in range(8):
        current = next_button(current, 9, set(range(9)))
        visited.append(current)
    assert visited == [0, 1, 2, 3, 4, 5, 6, 7, 8]


def test_invalid_current_raises() -> None:
    with pytest.raises(ValueError):
        next_button(current=9, num_seats=9, active_seats=set(range(9)))


def test_current_not_in_active_skips_to_next_forward() -> None:
    # button seat eliminated: move to the next active seat forward
    assert next_button(current=3, num_seats=9, active_seats={0, 1, 2}) == 0
    assert next_button(current=8, num_seats=9, active_seats={0, 2, 4, 6}) == 0


def _play_out(s: GameSession, guard: int = 5000) -> None:
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


def test_seeded_hands_land_button_on_previous_small_blind() -> None:
    """Multi-hand proof of the poker rule (A42): next-hand BTN == this-hand
    SB, and the hero runs the ring BB -> SB -> BTN -> CO."""
    s = GameSession(starting_stack=10_000, rng=random.Random(11))
    s.tournament.button = 6  # first rotation -> 7, so the hero starts on BB
    s.start()
    hero = s.hero_seat
    hero_positions: list[str] = []
    prev_sb: int | None = None
    for _ in range(4):
        button = s.tournament.button
        seats = {p.seat for p in s.tournament.players
                 if not p.is_eliminated and not p.sit_out}
        sb, _ = blind_seats(button, seats, len(s.tournament.players))
        assert prev_sb is None or button == prev_sb,             f"hand button {button} != previous SB {prev_sb}"
        hero_positions.append(position_for(button, hero, len(s.tournament.players)))
        prev_sb = sb
        _play_out(s)
        s.next_hand()
    assert hero_positions == ["BB", "SB", "BTN", "CO"]
    # and the ring steps forward by one label per hand
    for a, b in zip(hero_positions, hero_positions[1:], strict=False):
        assert (ROTATION_ORDER_9.index(a) - ROTATION_ORDER_9.index(b)) % 9 == 1
