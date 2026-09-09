"""Seat-position mapping for ring tables."""
from __future__ import annotations

# Canonical labels in preflop action order.
POSITION_ORDER = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]

# Rotation order (offset 0 = BTN, 1 = SB, 2 = BB, 3 = UTG ...).
ROTATION_ORDER_9 = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]

# 6-max variant (used when num_seats == 6).
POSITION_ORDER_6 = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
ROTATION_ORDER_6 = ["BTN", "SB", "BB", "UTG", "HJ", "CO"]

# Short-handed rotation tables (offset 0 = BTN).
ROTATION_TABLES = {
    2: ["BTN", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["BTN", "SB", "BB", "CO"],
    5: ["BTN", "SB", "BB", "HJ", "CO"],
    7: ["BTN", "SB", "BB", "UTG", "MP", "LJ", "HJ"],
    8: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ"],
}


def rotation_order(num_seats: int) -> list[str]:
    """Full clockwise ring from the button, for the given seat count.

    9-handed:  BTN -> SB -> BB -> UTG -> UTG+1 -> MP -> LJ -> HJ -> CO
    6-handed:  BTN -> SB -> BB -> UTG -> HJ -> CO
    Short tables derive the ring dynamically from the seat count. Nothing
    here hard-codes a position jump: every label follows the previous one in
    the ring (SB is always immediately to the left of the button, BB to the
    left of SB).
    """
    if num_seats == 9:
        return list(ROTATION_ORDER_9)
    if num_seats == 6:
        return list(ROTATION_ORDER_6)
    table = ROTATION_TABLES.get(num_seats)
    if table is None:
        raise ValueError(f"unsupported table size: {num_seats}")
    return list(table)


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
    return rotation_order(num_seats)[offset]
