"""Dealer button rotation tests (Atomic Part 006)."""
from __future__ import annotations

import pytest

from app.game.dealer_button import next_button


def test_button_advances_one_seat() -> None:
    assert next_button(current=2, num_seats=9, active_seats={0, 1, 2, 3, 4, 5, 6, 7, 8}) == 3


def test_button_wraps_around() -> None:
    assert next_button(current=8, num_seats=9, active_seats=set(range(9))) == 0


def test_button_skips_eliminated() -> None:
    # seat 3 eliminated: 2 -> 4
    assert next_button(current=2, num_seats=9, active_seats={0, 1, 2, 4, 5, 6, 7, 8}) == 4


def test_button_wraps_skipping_eliminated() -> None:
    # seats 0 and 1 eliminated: 8 -> 2
    assert next_button(current=8, num_seats=9, active_seats={2, 3, 4, 5, 6, 7, 8}) == 2


def test_single_active_player_stays() -> None:
    assert next_button(current=5, num_seats=9, active_seats={5}) == 5


def test_two_players_heads_up() -> None:
    # heads-up: button seat stays put by design here; table layer enforces SB=button
    assert next_button(current=2, num_seats=9, active_seats={2, 7}) == 7
    assert next_button(current=7, num_seats=9, active_seats={2, 7}) == 2


def test_invalid_current_raises() -> None:
    with pytest.raises(ValueError):
        next_button(current=9, num_seats=9, active_seats=set(range(9)))


def test_current_not_in_active_skips_to_next() -> None:
    # button seat eliminated: move to the next active seat clockwise
    assert next_button(current=3, num_seats=9, active_seats={0, 1, 2}) == 0
    assert next_button(current=8, num_seats=9, active_seats={0, 2, 4}) == 0
