"""Hand category and comparable hand-rank value object."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum

from app.poker.card import Card


class HandCategory(IntEnum):
    """Texas Hold'em hand categories ordered by strength."""

    HIGH_CARD = 0
    PAIR = 1
    TWO_PAIR = 2
    THREE_OF_A_KIND = 3
    STRAIGHT = 4
    FLUSH = 5
    FULL_HOUSE = 6
    FOUR_OF_A_KIND = 7
    STRAIGHT_FLUSH = 8


CATEGORY_NAMES = {
    HandCategory.HIGH_CARD: "High Card",
    HandCategory.PAIR: "One Pair",
    HandCategory.TWO_PAIR: "Two Pair",
    HandCategory.THREE_OF_A_KIND: "Three of a Kind",
    HandCategory.STRAIGHT: "Straight",
    HandCategory.FLUSH: "Flush",
    HandCategory.FULL_HOUSE: "Full House",
    HandCategory.FOUR_OF_A_KIND: "Four of a Kind",
    HandCategory.STRAIGHT_FLUSH: "Straight Flush",
}


@dataclass(frozen=True, slots=True)
class HandRank:
    """A best-5-card poker hand with a comparable tiebreak tuple."""

    category: HandCategory
    tiebreak: tuple[int, ...]
    best_cards: tuple[Card, ...] = field(default_factory=tuple)

    def __lt__(self, other: HandRank) -> bool:
        return (self.category.value, self.tiebreak) < (other.category.value, other.tiebreak)

    def __gt__(self, other: HandRank) -> bool:
        return (self.category.value, self.tiebreak) > (other.category.value, other.tiebreak)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, HandRank):
            return NotImplemented
        return self.category == other.category and self.tiebreak == other.tiebreak
