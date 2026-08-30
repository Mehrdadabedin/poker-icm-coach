"""Betting-round helpers: street bet state, round completion."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class BettingState:
    """State of the current betting round."""

    current_bet: int = 0
    last_raise: int = 0
    last_aggressor: int | None = None
    contributions: dict[int, int] = field(default_factory=dict)

    def reset_street(self) -> None:
        self.current_bet = 0
        self.last_raise = 0
        self.last_aggressor = None

    def record_contribution(self, seat: int, amount: int) -> None:
        self.contributions[seat] = self.contributions.get(seat, 0) + amount

    def total_contributions(self) -> int:
        return sum(self.contributions.values())


def round_can_finish(
    remaining_seats: list[int],
    contributions: dict[int, int],
    current_bet: int,
    all_in_seats: set[int],
    blind_posts: set[int],
) -> bool:
    """True when betting is complete: everyone matched (or is all-in/folded).

    At least one aggressor must exist on the street (or only blinds posted
    preflop, which counts as everyone matched).
    """
    if not remaining_seats:
        return True
    for seat in remaining_seats:
        if seat in all_in_seats:
            continue
        if contributions.get(seat, 0) < current_bet:
            return False
    return True
