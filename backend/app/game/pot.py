"""Single-pot accounting; side pots are built by side_pot.py from these rows."""
from __future__ import annotations

from app.game.player import Player


class Pot:
    """Tracks per-player chip contributions and awards the resulting pool."""

    def __init__(self) -> None:
        self.contributions: dict[int, int] = {}

    def record(self, seat: int, amount: int) -> None:
        self.contributions[seat] = self.contributions.get(seat, 0) + amount

    def contribution_of(self, seat: int) -> int:
        return self.contributions.get(seat, 0)

    def total(self) -> int:
        return sum(self.contributions.values())

    def reset(self) -> None:
        self.contributions = {}

    def award_to(self, winners: list[Player]) -> None:
        """Give the whole pot to winner(s), splitting odd chips to the first."""
        amount = self.total()
        if amount == 0:
            self.reset()
            return
        base, odd = divmod(amount, len(winners))
        for i, winner in enumerate(winners):
            winner.add_chips(base + (1 if i < odd else 0))
        self.reset()
