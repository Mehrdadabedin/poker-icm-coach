"""The coach quotes one win probability, not two.

The recommendation was priced off a category-and-draw heuristic while the number
shown to the player came from a simulation. On a flop they disagreed by 7.5
points at the median and 34 at the worst, so the panel could read 58 percent
over advice computed from 24.
"""
from __future__ import annotations

import random

from app.equity.equity_engine import hero_vs_random
from app.poker.card import Card, Rank, Suit
from app.strategy.coach import CoachRequest
from app.strategy.coach_analysis import win_probability_for
from app.strategy.coach_ev import win_prob

DECK = [Card(r, s) for r in Rank for s in Suit]


def _request(hero: list[Card], board: list[Card]) -> CoachRequest:
    return CoachRequest(
        hero=hero, position="BTN", stack=30_000, big_blind=200, small_blind=100,
        ante=0, pot=1_000, to_call=200, board=list(board),
        street="flop" if len(board) == 3 else "preflop",
        players_remaining=9, paid_positions=6, stacks=[30_000] * 9,
        payout=[0.4, 0.25, 0.15, 0.1, 0.06, 0.04], facing_raise=False,
        hero_seat=0, level_index=1, mode="advanced",
    )


def test_the_analysis_and_the_displayed_number_are_the_same_number() -> None:
    rng = random.Random(4)
    for _ in range(12):
        cards = rng.sample(DECK, 5)
        req = _request(cards[:2], cards[2:])
        assert win_probability_for(req) == win_prob(req), (
            "the coach advises from one probability and shows another"
        )


def test_preflop_falls_back_to_the_same_table() -> None:
    rng = random.Random(5)
    for _ in range(8):
        req = _request(rng.sample(DECK, 2), [])
        assert win_probability_for(req) == win_prob(req)


def test_the_number_tracks_a_high_trial_reference() -> None:
    """The heuristic that used to drive the recommendation was out by 10.8
    points on average against 40,000 trials, and by 33 at the worst."""
    rng = random.Random(6)
    worst = 0.0
    for _ in range(8):
        cards = rng.sample(DECK, 5)
        hero, board = cards[:2], cards[2:]
        reference = hero_vs_random(hero, list(board), trials=20_000, seed=99).equity
        worst = max(worst, abs(win_probability_for(_request(hero, board)) - reference))
    assert worst < 0.05, f"the quoted probability drifts from the reference by {worst:.3f}"
