"""Equity engine: exact enumeration postflop, Monte Carlo preflop / ranges.

Exact results are labeled "exact"; sampling results are labeled
"estimate" and include a confidence half-width.
"""
from __future__ import annotations

import random
from dataclasses import dataclass

from app.poker.card import Card, Rank, Suit
from app.poker.deck import Deck
from app.poker.hand_evaluator import best_hand, compare_hands
from app.strategy.hand_codec import HandCell


@dataclass(frozen=True, slots=True)
class EquityResult:
    equity: float
    method: str
    ci_half: float = 0.0
    n: int = 0


def _all_cards() -> list[Card]:
    return [Card(rank=r, suit=s) for r in Rank for s in Suit]


def _remaining(used: list[Card]) -> list[Card]:
    deck = Deck()
    deck.remove(used)
    return deck.cards


def hero_vs_hand(hero: list[Card], villain: list[Card], board: list[Card],
                 trials: int = 20000, seed: int | None = None) -> EquityResult:
    """Hero vs one hand: exact on turn/river, Monte Carlo preflop/flop.

    Full preflop/flop enumeration needs ~1M+ board runouts; sampling is
    used there and labeled "estimate" per the project specification.
    """
    if len(hero) != 2 or len(villain) != 2:
        raise ValueError("hand evaluations need exactly two hole cards each")
    used = hero + villain + board
    if len(set(used)) != len(used):
        raise ValueError("duplicate cards across hands/board")
    pool = _remaining(used)
    wins = ties = total = 0
    if len(board) >= 4:
        if len(board) == 4:
            for rest in pool:
                total += 1
                wins, ties = _compare(hero, villain, list(board) + [rest], wins, ties)
        else:
            total = 1
            wins, ties = _compare(hero, villain, list(board), wins, ties)
        return EquityResult(equity=(wins + ties / 2) / total, method="exact", n=total)
    rng = random.Random(seed)
    for _ in range(trials):
        street = list(board)
        needed = 5 - len(board)
        if needed:
            street += rng.sample(pool, needed)
        wins, ties = _compare(hero, villain, street, wins, ties)
    equity = (wins + ties / 2) / trials
    return EquityResult(equity=equity, method="estimate",
                        ci_half=1.96 * (equity * (1 - equity) / trials) ** 0.5, n=trials)


def _compare(hero: list[Card], villain: list[Card], street: list[Card],
             wins: int, ties: int) -> tuple[int, int]:
    h = best_hand(hero + street)
    v = best_hand(villain + street)
    result = compare_hands(h, v)
    if result > 0:
        wins += 1
    elif result == 0:
        ties += 1
    return wins, ties


def hero_vs_random(hero: list[Card], board: list[Card], trials: int = 5000,
                   seed: int | None = None) -> EquityResult:
    """Hero vs a random opponent hand (Monte Carlo, labeled estimate)."""
    rng = random.Random(seed)
    used = set(hero + board)
    pool = [c for c in _all_cards() if c not in used]
    wins = ties = 0
    for _ in range(trials):
        villain = rng.sample(pool, 2)
        street = list(board)
        needed = 5 - len(board)
        if needed:
            rest = [c for c in pool if c not in villain]
            street += rng.sample(rest, needed)
        wins, ties = _compare(hero, villain, street, wins, ties)
    equity = (wins + ties / 2) / trials
    return EquityResult(equity=equity, method="estimate", ci_half=1.96 * (equity * (1 - equity) / trials) ** 0.5, n=trials)


def _range_combos(cells: set[HandCell], pool: list[Card]) -> list[list[Card]]:
    combos: list[list[Card]] = []
    for cell in cells:
        if cell.suited is None:
            suits = [c.suit for c in pool if c.rank.value == cell.hi]
            for s in suits:
                pair = [c for c in pool if c.rank.value == cell.hi and c.suit == s]
                if len(pair) >= 2:
                    combos.append(pair[:2])
        elif cell.suited:
            for c1 in pool:
                if c1.rank.value == cell.hi:
                    for c2 in pool:
                        if c2.rank.value == cell.lo and c2.suit == c1.suit:
                            combos.append([c1, c2])
                            break
        else:
            for c1 in pool:
                if c1.rank.value == cell.hi:
                    for c2 in pool:
                        if c2.rank.value == cell.lo and c2.suit != c1.suit:
                            combos.append([c1, c2])
    return combos


def hero_vs_range(hero: list[Card], cells: set[HandCell], board: list[Card],
                  trials: int = 6000, seed: int | None = None,
                  opponent_cards: list[Card] | None = None) -> EquityResult:
    """Hero vs a sampled hand from a range (Monte Carlo, labeled estimate)."""
    rng = random.Random(seed)
    used = set(hero + board + (opponent_cards or []))
    pool = [c for c in _all_cards() if c not in used]
    combos = _range_combos(cells, pool)
    if not combos:
        raise ValueError("range has no combos left in the deck")
    wins = ties = 0
    for _ in range(trials):
        villain = list(opponent_cards) if opponent_cards else list(rng.choice(combos))
        street = list(board)
        needed = 5 - len(board)
        if needed:
            rest = [c for c in pool if c not in villain]
            street += rng.sample(rest, needed)
        wins, ties = _compare(hero, villain, street, wins, ties)
    equity = (wins + ties / 2) / trials
    return EquityResult(equity=equity, method="estimate", ci_half=1.96 * (equity * (1 - equity) / trials) ** 0.5, n=trials)


class EquityEngine:
    """Facade carrying a seeded RNG for reproducible estimates."""

    def __init__(self, seed: int | None = None) -> None:
        self.rng = random.Random(seed)
