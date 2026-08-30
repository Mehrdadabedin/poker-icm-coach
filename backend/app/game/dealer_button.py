"""Dealer button rotation."""
from __future__ import annotations


def next_button(current: int, num_seats: int, active_seats: set[int]) -> int:
    """Advance the dealer button one seat clockwise, skipping inactive seats."""
    if not 0 <= current < num_seats:
        raise ValueError(f"current button out of range: {current}")
    if current not in active_seats:
        raise ValueError(f"button seat {current} is not active")
    if len(active_seats) <= 1:
        return current
    for step in range(1, num_seats + 1):
        candidate = (current + step) % num_seats
        if candidate in active_seats:
            return candidate
    raise ValueError("no active seat found")  # unreachable when active_seats non-empty
