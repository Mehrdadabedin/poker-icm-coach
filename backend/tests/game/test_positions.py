"""Position mapping tests (Atomic Part 005)."""
from __future__ import annotations

import pytest

from app.game.positions import (
    POSITION_ORDER,
    all_positions,
    position_for,
)


def test_nine_positions_clockwise() -> None:
    assert len(POSITION_ORDER) == 9
    assert POSITION_ORDER == [
        "UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB",
    ]


def test_all_positions_helper() -> None:
    assert set(all_positions(9)) == set(POSITION_ORDER)


def test_mapping_all_seats_for_dealer_zero() -> None:
    # Dealer at seat 0 -> UTG seat 1 ... BB seat 8 (dealer 9-seat order).
    expected = {
        0: "BTN", 1: "SB", 2: "BB", 3: "UTG", 4: "UTG+1",
        5: "MP", 6: "LJ", 7: "HJ", 8: "CO",
    }
    for seat, label in expected.items():
        assert position_for(dealer_seat=0, seat=seat, num_seats=9) == label, seat


def test_blinds_next_to_button() -> None:
    # For dealer 3: SB = seat 4, BB = seat 5.
    assert position_for(3, 4, 9) == "SB"
    assert position_for(3, 5, 9) == "BB"
    assert position_for(3, 3, 9) == "BTN"


def test_mapping_other_dealer() -> None:
    assert position_for(7, 8, 9) == "SB"
    assert position_for(7, 0, 9) == "BB"
    assert position_for(7, 7, 9) == "BTN"
    assert position_for(7, 1, 9) == "UTG"


def test_wrap_around() -> None:
    # Dealer 8: seats wrap: seat 0 = SB, seat 1 = BB, seat 2 = UTG.
    assert position_for(8, 0, 9) == "SB"
    assert position_for(8, 1, 9) == "BB"
    assert position_for(8, 2, 9) == "UTG"


def test_invalid_seat_raises() -> None:
    with pytest.raises(ValueError):
        position_for(0, 9, 9)
    with pytest.raises(ValueError):
        position_for(0, -1, 9)


def test_six_max_supported() -> None:
    # 6-max rotation: BTN, SB, BB, UTG, HJ, CO
    assert len(all_positions(6)) == 6
    assert position_for(0, 0, 6) == "BTN"
    assert position_for(0, 1, 6) == "SB"
    assert position_for(0, 2, 6) == "BB"
    assert position_for(0, 3, 6) == "UTG"
    assert position_for(0, 4, 6) == "HJ"
    assert position_for(0, 5, 6) == "CO"
