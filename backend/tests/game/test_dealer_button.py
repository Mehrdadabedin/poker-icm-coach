"""Dealer button rotation tests (Atomic Part 006).

Physical layout note: on the rendered oval the screen-clockwise seat order is
0 -> 8 -> 7 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1 -> 0 (measured). The button therefore
advances by -1 in seat index to move one physical seat clockwise.
"""
from __future__ import annotations

import pytest

from app.game.dealer_button import next_button


def test_button_advances_one_seat_clockwise() -> None:
    assert next_button(current=2, num_seats=9, active_seats={0, 1, 2, 3, 4, 5, 6, 7, 8}) == 1


def test_button_wraps_clockwise() -> None:
    assert next_button(current=0, num_seats=9, active_seats=set(range(9))) == 8


def test_button_wraps_from_edge() -> None:
    assert next_button(current=8, num_seats=9, active_seats=set(range(9))) == 7


def test_button_skips_eliminated() -> None:
    # seat 3 eliminated; clockwise from 2 -> 1 (single step)
    assert next_button(current=2, num_seats=9, active_seats={0, 1, 2, 4, 5, 6, 7, 8}) == 1


def test_button_wraps_skipping_eliminated() -> None:
    # seats 7 and 6 eliminated; clockwise from 8 -> 5
    assert next_button(current=8, num_seats=9, active_seats={0, 1, 2, 3, 4, 5, 8}) == 5


def test_single_active_player_stays() -> None:
    assert next_button(current=5, num_seats=9, active_seats={5}) == 5


def test_two_players_heads_up() -> None:
    # heads-up: button seat stays put by design here; table layer enforces SB=button
    assert next_button(current=2, num_seats=9, active_seats={2, 7}) == 7
    assert next_button(current=7, num_seats=9, active_seats={2, 7}) == 2


def test_clockwise_ring_is_fixed_order() -> None:
    """One full 9-hand cycle must visit seats in measured clockwise order."""
    current = 0
    visited = [current]
    for _ in range(8):
        current = next_button(current, 9, set(range(9)))
        visited.append(current)
    assert visited == [0, 8, 7, 6, 5, 4, 3, 2, 1]


def test_invalid_current_raises() -> None:
    with pytest.raises(ValueError):
        next_button(current=9, num_seats=9, active_seats=set(range(9)))


def test_current_not_in_active_skips_to_next_clockwise() -> None:
    # button seat eliminated: move to the next active seat clockwise
    assert next_button(current=3, num_seats=9, active_seats={0, 1, 2}) == 2
    assert next_button(current=8, num_seats=9, active_seats={0, 2, 4, 6}) == 6
