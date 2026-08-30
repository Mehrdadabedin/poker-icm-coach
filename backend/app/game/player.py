"""Tournament player state."""
from __future__ import annotations

from app.poker.card import Card


class Player:
    """A seat at the table: mutable hand-state plus a persistent chip stack."""

    def __init__(
        self,
        name: str,
        stack: int,
        seat: int,
        is_human: bool = False,
        personality: str | None = None,
    ) -> None:
        self.name = name
        self.stack = stack
        self.seat = seat
        self.is_human = is_human
        self.personality = personality
        self.is_eliminated = False
        self.hole_cards: list[Card] = []
        self.folded = False
        self.bet_total = 0
        self.sit_out = False

    def new_hand(self) -> None:
        """Reset all per-hand state (called before every new deal)."""
        self.hole_cards = []
        self.folded = False
        self.bet_total = 0

    def set_hole_cards(self, cards: list[Card]) -> None:
        if len(cards) != 2:
            raise ValueError("a player gets exactly two hole cards")
        if len(set(cards)) != 2:
            raise ValueError("duplicate hole cards")
        self.hole_cards = list(cards)

    def clear_hole_cards(self) -> None:
        self.hole_cards = []

    @property
    def is_all_in(self) -> bool:
        return self.stack == 0 and not self.is_eliminated

    def remove_chips(self, amount: int) -> None:
        """Remove chips (all-in does NOT eliminate; eliminate() is explicit)."""
        if amount < 0:
            raise ValueError("cannot remove negative chips")
        if amount > self.stack:
            raise ValueError(f"{self.name} only has {self.stack}, cannot remove {amount}")
        self.stack -= amount

    def add_chips(self, amount: int) -> None:
        if amount < 0:
            raise ValueError("cannot add negative chips")
        self.stack += amount

    def eliminate(self) -> None:
        """Mark the player as busted (called by tournament flow after a hand)."""
        self.is_eliminated = True

    def commit_bet(self, amount: int) -> None:
        """Move chips from stack into the current betting round (not elimination)."""
        if amount < 0:
            raise ValueError("bet cannot be negative")
        if amount > self.stack:
            raise ValueError(f"{self.name} cannot bet {amount} with stack {self.stack}")
        self.stack -= amount
        self.bet_total += amount

    def refund_bet(self, amount: int) -> None:
        """Return chips from the bet pool (uncalled portion)."""
        if amount < 0 or amount > self.bet_total:
            raise ValueError(f"invalid refund {amount} of bet_total {self.bet_total}")
        self.bet_total -= amount
        self.stack += amount

    def __str__(self) -> str:
        return f"{self.name} (seat {self.seat}, {self.stack} chips)"

    def __repr__(self) -> str:
        return f"Player({self.name!r}, stack={self.stack}, seat={self.seat}, human={self.is_human})"
