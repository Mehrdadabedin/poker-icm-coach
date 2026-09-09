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


def test_ring_rotation_advances_with_button_9_handed() -> None:
    """As the button moves one seat clockwise each hand, every other seat
    advances one step through the ring; SB stays immediately to the left of
    the button and BB immediately to the left of SB."""
    ring = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
    for dealer in range(9):
        for seat in range(9):
            offset = (seat - dealer) % 9
            assert position_for(dealer, seat, 9) == ring[offset], (dealer, seat)
    # after one hand the button moves +1; labels advance by one ring step
    for dealer in range(9):
        assert position_for(dealer, dealer, 9) == "BTN"
        assert position_for(dealer, (dealer + 1) % 9, 9) == "SB"   # left of button
        assert position_for(dealer, (dealer + 2) % 9, 9) == "BB"   # left of SB


def test_ring_rotation_advances_with_button_6_handed() -> None:
    ring = ["BTN", "SB", "BB", "UTG", "HJ", "CO"]
    for dealer in range(6):
        for seat in range(6):
            offset = (seat - dealer) % 6
            assert position_for(dealer, seat, 6) == ring[offset], (dealer, seat)
    for dealer in range(6):
        assert position_for(dealer, dealer, 6) == "BTN"
        assert position_for(dealer, (dealer + 1) % 6, 6) == "SB"
        assert position_for(dealer, (dealer + 2) % 6, 6) == "BB"


def test_no_hardcoded_jump_after_utg_in_9_handed() -> None:
    """HJ must be preceded by LJ in the 9-handed ring (UTG+1 -> MP -> LJ -> HJ)."""
    from app.game.positions import ROTATION_ORDER_9, rotation_order

    assert ROTATION_ORDER_9.index("UTG") + 1 == ROTATION_ORDER_9.index("UTG+1")
    assert ROTATION_ORDER_9.index("LJ") + 1 == ROTATION_ORDER_9.index("HJ")
    assert rotation_order(9) == ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
    assert rotation_order(6) == ["BTN", "SB", "BB", "UTG", "HJ", "CO"]
