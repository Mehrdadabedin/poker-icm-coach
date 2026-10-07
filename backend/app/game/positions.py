"""Seat-position mapping for ring tables."""
from __future__ import annotations

# Canonical labels in preflop action order.
POSITION_ORDER = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]

# 6-max variant (used when num_seats == 6).
POSITION_ORDER_6 = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]

# Rotation rings (offset 0 = BTN, 1 = SB, 2 = BB, 3 = UTG ...). Short-handed
# rings drop early positions first and always keep the blinds and the CO
# (A43); every label exists in app/ai/preflop_ranges.py.
ROTATION_ORDER_9 = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
ROTATION_ORDER_6 = ["BTN", "SB", "BB", "UTG", "HJ", "CO"]
ROTATION_TABLES = {
    2: ["BTN", "BB"],
    3: ["BTN", "SB", "BB"],
    4: ["BTN", "SB", "BB", "CO"],
    5: ["BTN", "SB", "BB", "HJ", "CO"],
    6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
    7: ["BTN", "SB", "BB", "UTG", "LJ", "HJ", "CO"],
    8: ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
    9: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
}


def rotation_order(num_seats: int) -> list[str]:
    """Full clockwise ring from the button, for the given seat count.

    9-handed:  BTN -> SB -> BB -> UTG -> UTG+1 -> MP -> LJ -> HJ -> CO
    6-handed:  BTN -> SB -> BB -> UTG -> HJ -> CO
    Short tables derive the ring dynamically from the seat count; nothing
    here hard-codes a position jump (SB is always immediately to the left of
    the button, BB to the left of SB).
    """
    ring = ROTATION_TABLES.get(num_seats)
    if ring is None:
        raise ValueError(f"unsupported table size: {num_seats}")
    return list(ring)


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


def position_labels(button: int, active_seats: set[int],
                    num_seats: int = 9) -> dict[int, str]:
    """Label exactly the active seats, clockwise from the button.

    Seats not in `active_seats` (eliminated, sitting out, or not dealt into
    the hand) get no label: they are absent from the result, which the state
    view surfaces as None. The ring shortens with the active count, dropping
    early positions first while keeping the blinds and the CO.
    """
    if len(active_seats) <= 1:
        return {}
    ring = rotation_order(len(active_seats))
    ordered = sorted(active_seats, key=lambda s: (s - button) % num_seats)
    return {seat: ring[i] for i, seat in enumerate(ordered)}
