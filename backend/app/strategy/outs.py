"""Postflop outs and improvement probability from the actual remaining deck.

Swayne's model: 47 unknown cards after the flop, 46 after the turn. Instead of
hard-coded generic probabilities, every card not in the hero's hand or on the
board is enumerated, and an out is a card that improves the hero's made-hand
category. "Probability of making a hand" and "winning probability" are
reported separately (winning uses the equity engine / exact opponent cards).

Not exhaustive: only the hero's own category improvement is counted; draws
that improve without changing the category (e.g. overcards) are captured by
the equity engine, which reports winning probability.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.equity.equity_engine import hero_vs_hand, hero_vs_random
from app.poker.card import Card
from app.poker.deck import Deck
from app.poker.hand_evaluator import best_hand


@dataclass(frozen=True, slots=True)
class OutsReport:
    outs: int
    unknown: int  # cards unseen (52 - known)
    improve_turn: float  # chance to improve on the next street
    improve_river: float  # chance to improve by the river
    win_prob: float
    method: str  # exact | estimate

    def to_dict(self) -> dict:
        return {
            "outs": self.outs,
            "unknown": self.unknown,
            "improveTurn": round(self.improve_turn, 4),
            "improveRiver": round(self.improve_river, 4),
            "winProb": round(self.win_prob, 4),
            "method": self.method,
        }


def _improves(hero: list[Card], board: list[Card], candidate: Card) -> bool:
    if len(board) >= 5:
        return False  # river: no more cards to improve with
    current = best_hand(hero + board).category
    improved = best_hand(hero + board + [candidate]).category
    return improved > current


def compute_outs(hero: list[Card], board: list[Card]) -> OutsReport:
    """Enumerate the actual remaining deck and count improving cards."""
    if len(hero) != 2 or len(board) > 5:
        raise ValueError("two hero cards and at most five board cards required")
    deck = Deck()
    deck.remove(hero + board)
    pool = deck.cards
    n_next = len(pool) if len(board) == 3 else max(0, len(pool) - 1)
    outs = sum(1 for c in pool if _improves(hero, board, c))
    improve_turn = outs / n_next if n_next else 0.0
    # by the river: 1 - P(miss both streets)
    n_river_pool = len(pool) - 1
    if len(board) == 4:
        improve_river = outs / len(pool)
    elif len(board) == 3:
        miss_turn = (len(pool) - outs) / len(pool)
        miss_river = (n_river_pool - outs) / n_river_pool if n_river_pool > 0 else 0.0
        improve_river = 1 - miss_turn * miss_river
    else:
        improve_river = 0.0
    return OutsReport(outs=outs, unknown=len(pool),
                      improve_turn=improve_turn, improve_river=improve_river,
                      win_prob=0.0, method="exact")


def winning_probability(
    hero: list[Card],
    board: list[Card],
    opponent_cards: list[Card] | None = None,
    trials: int = 5000,
    seed: int | None = 7,
) -> OutsReport:
    """Winning probability vs a random hand or exact opponent cards."""
    if opponent_cards and len(opponent_cards) == 2:
        result = hero_vs_hand(hero, opponent_cards, board, trials=trials, seed=seed)
    else:
        result = hero_vs_random(hero, board, trials=trials, seed=seed)
    base = compute_outs(hero, board)
    return OutsReport(outs=base.outs, unknown=base.unknown,
                      improve_turn=base.improve_turn, improve_river=base.improve_river,
                      win_prob=result.equity, method=result.method)
