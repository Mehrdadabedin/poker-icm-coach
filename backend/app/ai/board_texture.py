"""Board texture classification for postflop decisions."""
from __future__ import annotations

from dataclasses import dataclass

from app.poker.card import Card


@dataclass(frozen=True, slots=True)
class BoardTexture:
    """Texture features derived only from visible community cards."""

    count: int = 0
    paired: bool = False
    monotone: bool = False
    suits: tuple = ()
    connected: bool = False
    high_card: bool = False
    low_card: bool = False

    @property
    def wet(self) -> bool:
        return self.connected and len(self.suits) <= 2 or self.paired and self.count >= 4

    @property
    def two_tone(self) -> bool:
        return len(self.suits) == 2


def classify_board(cards: list[Card]) -> BoardTexture:
    if not cards:
        return BoardTexture()
    ranks = [c.rank.value for c in cards]
    suits = tuple(sorted({c.suit for c in cards}))
    paired = len(set(ranks)) < len(ranks)
    monotone = len(suits) == 1

    uniq = sorted(set(ranks), reverse=True)
    connected = False
    if len(uniq) >= 3:
        gaps = [uniq[i] - uniq[i + 1] for i in range(len(uniq) - 1)]
        adjacent = sum(1 for g in gaps if g == 1)
        connected = adjacent >= (3 if len(uniq) >= 4 else 2) or (
            14 in set(ranks) and all(r in ranks for r in (2, 3, 4, 5))
        )

    avg_rank = sum(ranks) / len(ranks)
    high_card = avg_rank >= 10.5 or len([r for r in ranks if r >= 13]) >= 2
    low_card = all(r <= 9 for r in ranks) and len(ranks) >= 3
    return BoardTexture(
        count=len(cards), paired=paired, monotone=monotone, suits=suits,
        connected=connected, high_card=high_card, low_card=low_card,
    )


def is_dry(texture: BoardTexture) -> bool:
    return not texture.wet


def is_paired(texture: BoardTexture) -> bool:
    return texture.paired


def is_monotone(texture: BoardTexture) -> bool:
    return texture.monotone
