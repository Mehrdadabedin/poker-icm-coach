"""Playing card primitives: Rank, Suit, Card."""
from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class Suit(IntEnum):
    """The four suits. Numeric value is stable for encoding."""

    CLUBS = 0
    DIAMONDS = 1
    HEARTS = 2
    SPADES = 3


class Rank(IntEnum):
    """Thirteen ranks with Ace high by default."""

    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14


_RANK_CHARS = {
    "2": Rank.TWO, "3": Rank.THREE, "4": Rank.FOUR, "5": Rank.FIVE,
    "6": Rank.SIX, "7": Rank.SEVEN, "8": Rank.EIGHT, "9": Rank.NINE,
    "T": Rank.TEN, "J": Rank.JACK, "Q": Rank.QUEEN, "K": Rank.KING, "A": Rank.ACE,
}
_SUIT_CHARS = {"c": Suit.CLUBS, "d": Suit.DIAMONDS, "h": Suit.HEARTS, "s": Suit.SPADES}
_CHAR_BY_SUIT = {suit: char for char, suit in _SUIT_CHARS.items()}
_SUIT_SYMBOLS = {Suit.CLUBS: "\u2663", Suit.DIAMONDS: "\u2666", Suit.HEARTS: "\u2665", Suit.SPADES: "\u2660"}


def parse_rank(char: str) -> Rank:
    try:
        return _RANK_CHARS[char.upper()]
    except KeyError as exc:
        raise ValueError(f"invalid rank: {char!r}") from exc


def parse_suit(char: str) -> Suit:
    try:
        return _SUIT_CHARS[char.lower()]
    except KeyError as exc:
        raise ValueError(f"invalid suit: {char!r}") from exc


def card_from_str(text: str) -> Card:
    """Build a Card from a two-character string like 'As', 'Td', '9h'."""
    if len(text) != 2:
        raise ValueError(f"card must be 2 chars, got {text!r}")
    return Card(rank=parse_rank(text[0]), suit=parse_suit(text[1]))


@dataclass(frozen=True, slots=True)
class Card:
    """An immutable playing card with a rank and a suit."""

    rank: Rank
    suit: Suit

    def __str__(self) -> str:
        """Unicode face like 'A\u2660'."""
        return f"{self.rank_char()}{_SUIT_SYMBOLS[self.suit]}"

    def rank_char(self) -> str:
        return {10: "T", 11: "J", 12: "Q", 13: "K", 14: "A"}.get(self.rank.value, str(self.rank.value))

    def ascii(self) -> str:
        """ASCII face like 'As' for logs and tests."""
        return f"{self.rank_char()}{_CHAR_BY_SUIT[self.suit]}"

    def encode(self) -> int:
        """Encode to a unique int 0..51 (rank-major), used by evaluators."""
        return (self.rank.value - 2) * 4 + self.suit.value

    @classmethod
    def decode(cls, code: int) -> Card:
        if not 0 <= code < 52:
            raise ValueError(f"invalid card code: {code}")
        rank_value = code // 4 + 2
        return cls(rank=Rank(rank_value), suit=Suit(code % 4))
