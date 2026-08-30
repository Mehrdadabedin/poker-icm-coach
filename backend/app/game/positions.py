"""Seat-position mapping for ring tables."""
from __future__ import annotations

# Canonical labels in preflop action order.
POSITION_ORDER = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]

# Rotation order (offset 0 = BTN, 1 = SB, 2 = BB, 3 = UTG ...).
ROTATION_ORDER_9 = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]

# 6-max variant (used when num_seats == 6).
POSITION_ORDER_6 = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
ROTATION_ORDER_6 = ["BTN", "SB", "BB", "UTG", "HJ", "CO"]


def all_positions(num_seats: int) -> list[str]:
    if num_seats == 9:
        return list(POSITION_ORDER)
    if num_seats == 6:
        return list(POSITION_ORDER_6)
    raise ValueError(f"unsupported table size: {num_seats}")


def position_for(dealer_seat: int, seat: int, num_seats: int = 9) -> str:
    """Return the position label for a seat given the current dealer seat.

    The dealer is the BTN. SB is one seat clockwise, BB two seats
    clockwise. UTG is the third seat clockwise (first to act preflop).
    """
    if not (0 <= dealer_seat < num_seats):
        raise ValueError(f"dealer seat out of range: {dealer_seat}")
    if not (0 <= seat < num_seats):
        raise ValueError(f"seat out of range: {seat}")
    # offset 0 = BTN (dealer), 1 = SB, 2 = BB, 3 = UTG ...
    offset = (seat - dealer_seat) % num_seats
    if num_seats == 9:
        return ROTATION_ORDER_9[offset]
    if num_seats == 6:
        return ROTATION_ORDER_6[offset]
    raise ValueError(f"unsupported table size: {num_seats}")
