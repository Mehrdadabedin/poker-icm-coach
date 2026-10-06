"""Dealer button rotation.

Poker rule: after every completed hand the button moves to the seat that was
the small blind. Positions are modelled in seat-index order (the ring
BTN -> SB -> BB -> UTG ... = increasing seat index, mod seat count), so the
button advances +1 seat index per hand, skipping inactive (eliminated /
sitting out) seats. The felt layout mirrors this: increasing seat index runs
clockwise on screen.
"""
from __future__ import annotations


def next_button(current: int, num_seats: int, active_seats: set[int]) -> int:
    """Advance the dealer button one seat forward in seat-index order.

    The next hand's button is this hand's small blind; inactive seats are
    skipped while searching.
    """
    if not 0 <= current < num_seats:
        raise ValueError(f"button seat out of range: {current}")
    if len(active_seats) <= 1:
        return current
    for step in range(1, num_seats + 1):
        candidate = (current + step) % num_seats
        if candidate in active_seats:
            return candidate
    raise ValueError("no active seat found")  # unreachable when active_seats non-empty
