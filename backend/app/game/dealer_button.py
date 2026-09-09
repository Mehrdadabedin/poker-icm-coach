"""Dealer button rotation.

The 9 physical seats on the felt are numbered in a fixed order. Measured on
the actual table layout the screen-clockwise direction corresponds to
DECREASING seat index (the physical clockwise seat order is
0 -> 8 -> 7 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1 -> 0).

To make the button move one physical seat CLOCKWISE after every completed
hand we therefore advance the seat index by -1 (mod seat count), skipping
inactive (eliminated / sitting out) seats.
"""
from __future__ import annotations


def next_button(current: int, num_seats: int, active_seats: set[int]) -> int:
    """Advance the dealer button one physical seat clockwise.

    The physical layout is wired so that decreasing the seat index moves the
    button clockwise on screen; inactive seats are skipped while searching.
    """
    if not 0 <= current < num_seats:
        raise ValueError(f"button seat out of range: {current}")
    if len(active_seats) <= 1:
        return current
    for step in range(1, num_seats + 1):
        candidate = (current - step) % num_seats
        if candidate in active_seats:
            return candidate
    raise ValueError("no active seat found")  # unreachable when active_seats non-empty
