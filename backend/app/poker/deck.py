"""A standard 52-card deck with shuffle, draw and reset."""
from __future__ import annotations

import random
from collections.abc import Iterable

from app.poker.card import Card, Rank, Suit


class DeckEmpty(Exception):
    """Raised when draw() is called on an exhausted deck."""
    pass  # noqa: PIE790  (explicit exception class)


class Deck:
    """An immutable-card collection supporting shuffle / draw / reset.

    The deck is unshuffled (canonical order) when constructed; call
    shuffle() before dealing a hand. Accepts an injectable Random for
    deterministic tests.
    """

    def __init__(self, rng: random.Random | None = None) -> None:
        self._rng = rng if rng is not None else random.Random()
        self.cards: list[Card] = self._fresh()

    def _fresh(self) -> list[Card]:
        return [Card(rank=r, suit=s) for r in Rank for s in Suit]

    def __len__(self) -> int:
        return len(self.cards)

    def shuffle(self) -> None:
        self._rng.shuffle(self.cards)

    def draw(self) -> Card:
        if not self.cards:
            raise DeckEmpty()
        return self.cards.pop()

    def peek(self, n: int) -> list[Card]:
        """Return the next n cards without removing them (no future reveal)."""
        return self.cards[-n:][::-1]

    def draw_n(self, n: int) -> list[Card]:
        return [self.draw() for _ in range(n)]

    def reset(self) -> None:
        self.cards = self._fresh()

    def remove(self, cards: Iterable[Card]) -> None:
        """Remove specific cards (used to enforce dead cards in sims)."""
        remove_set = set(cards)
        self.cards = [c for c in self.cards if c not in remove_set]
