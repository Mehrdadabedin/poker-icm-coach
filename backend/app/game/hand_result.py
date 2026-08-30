"""Hand result and action records produced by the hand engine."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.poker.card import Card


@dataclass(slots=True)
class HandAction:
    """A single logged action within a hand."""

    seat: int
    action: str          # fold/check/call/bet/raise/all_in
    amount: int | None = None  # total bet/raise-to amount (or amount put in)
    street: str = "preflop"


@dataclass(slots=True)
class HandWinner:
    """A pot layer winner."""

    seats: list[int]
    amount: int


@dataclass(slots=True)
class HandResult:
    """Everything recorded about one completed hand."""

    hand_number: int
    button: int
    community_cards: list[Card] = field(default_factory=list)
    actions: list[HandAction] = field(default_factory=list)
    hole_cards: dict[int, list[Card]] = field(default_factory=dict)
    starting_stacks: dict[int, int] = field(default_factory=dict)
    ending_stacks: dict[int, int] = field(default_factory=dict)
    pot_total: int = 0
    winners: list[HandWinner] = field(default_factory=list)
    showed_down: list[int] = field(default_factory=list)
    folded: list[int] = field(default_factory=list)
    street: str = "complete"

    def winner_seats(self) -> list[int]:
        seats: list[int] = []
        for w in self.winners:
            for s in w.seats:
                if s not in seats:
                    seats.append(s)
        return seats

    def net_chips(self, seat: int) -> int:
        """Chips won/lost in the hand for a seat."""
        return self.ending_stacks.get(seat, 0) - self.starting_stacks.get(seat, 0)
