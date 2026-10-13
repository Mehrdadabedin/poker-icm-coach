"""A fast hand score for equity simulations (plan 074).

`best_hand` builds Card and HandRank objects and reads enum fields on every
card; an equity estimate calls it thousands of times per coach answer, which
took over 5 seconds on Render's free instance. This scores the same hands from
plain (rank, suit) integers. Scores compare like `best_hand` results: a bigger
tuple is a better hand and equal tuples tie (tests/equity/test_fast_eval.py).
"""
from __future__ import annotations

from app.poker.card import Card

IntCard = tuple[int, int]  # (rank 2-14, suit 0-3)


def to_int(card: Card) -> IntCard:
    return (card.rank.value, card.suit.value)


_STRAIGHTS = [(high, 0b11111 << (high - 4)) for high in range(14, 4, -1)]


def _straight_high(ranks: list[int]) -> int:
    """Highest straight among the ranks, 0 if none; A-2-3-4-5 counts as 5."""
    bits = 0
    for r in ranks:
        bits |= 1 << r
    if bits & (1 << 14):
        bits |= 1 << 1
    for high, mask in _STRAIGHTS:
        if bits & mask == mask:
            return high
    return 0


def score(cards: list[IntCard]) -> tuple[int, ...]:
    """Best five-card hand of 5 to 7 cards: (category, tiebreak ranks...)."""
    ranks = sorted((r for r, _ in cards), reverse=True)
    suits = [0, 0, 0, 0]
    for _, s in cards:
        suits[s] += 1
    flush = next((s for s in range(4) if suits[s] >= 5), -1)
    if flush >= 0:
        flush_ranks = sorted((r for r, s in cards if s == flush), reverse=True)
        high = _straight_high(flush_ranks)
        if high:
            return (8, high)
    counts: dict[int, int] = {}
    for r in ranks:
        counts[r] = counts.get(r, 0) + 1
    groups = sorted(((n, r) for r, n in counts.items()), reverse=True)
    if groups[0][0] == 4:
        quad = groups[0][1]
        return (7, quad, max(r for r in ranks if r != quad))
    trips = [r for n, r in groups if n == 3]
    pairs = [r for n, r in groups if n == 2]
    if trips and (len(trips) > 1 or pairs):
        return (6, trips[0], max(trips[1:] + pairs))
    if flush >= 0:
        return (5, *flush_ranks[:5])
    high = _straight_high(sorted(counts, reverse=True))
    if high:
        return (4, high)
    if trips:
        return (3, trips[0], *[r for r in ranks if r != trips[0]][:2])
    if len(pairs) >= 2:
        top, second = pairs[0], pairs[1]
        return (2, top, second, max(r for r in ranks if r not in (top, second)))
    if pairs:
        return (1, pairs[0], *[r for r in ranks if r != pairs[0]][:3])
    return (0, *ranks[:5])
