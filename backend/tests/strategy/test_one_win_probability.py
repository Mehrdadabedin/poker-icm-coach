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
from app.strategy.coach import Coach, CoachRequest
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


def test_the_recommendation_itself_uses_the_shared_number() -> None:
    """The decision path called the heuristic directly, so changing only the
    overlay left the advice priced off the wrong number.

    Deuces on an ace-ace-ace board is a full house, and the heuristic reads that
    category and calls it 95 percent. The simulation knows most of the deck also
    makes trip aces or better, and prices it at 64. Facing 3,000 into a 1,000
    pot the required equity is above both 64 and the pot odds, so the honest
    number folds and the heuristic calls."""
    from app.ai.postflop_ai import equity_estimate

    hero = [Card(Rank.TWO, Suit.CLUBS), Card(Rank.TWO, Suit.DIAMONDS)]
    board = [Card(Rank.ACE, Suit.SPADES), Card(Rank.ACE, Suit.HEARTS),
             Card(Rank.ACE, Suit.DIAMONDS)]
    req = _request(hero, board)
    req.to_call = 3_000
    req.facing_raise = True

    quoted = win_probability_for(req)
    heuristic = equity_estimate(hero, board, [])
    assert heuristic - quoted > 0.25, (
        f"this spot should split the two badly: {heuristic:.2f} against {quoted:.2f}"
    )

    rec = Coach().recommend(req)

    assert rec.recommended_action == "FOLD", (
        f"advised {rec.recommended_action} on {quoted:.0%} equity facing 3,000"
    )
    assert f"{quoted:.0%}" in rec.reasoning, (
        f"the reasoning quotes a different number: {rec.reasoning}"
    )


def test_preflop_falls_back_to_the_same_table() -> None:
    rng = random.Random(5)
    for _ in range(8):
        req = _request(rng.sample(DECK, 2), [])
        assert win_probability_for(req) == win_prob(req)
    aces = _request([Card(Rank.ACE, Suit.CLUBS), Card(Rank.ACE, Suit.DIAMONDS)], [])
    assert win_probability_for(aces) == 0.68, "the preflop table moved"


def test_the_same_hand_reuses_one_cache_entry_whatever_order_it_arrives_in() -> None:
    """Asserting the two answers match proves nothing, because a seeded
    simulation returns the same number for a reordered hand anyway. What the
    sorted key buys is one entry instead of two, so assert the cache."""
    from app.strategy.coach_analysis import _simulated

    hero = [Card(Rank.NINE, Suit.HEARTS), Card(Rank.TEN, Suit.HEARTS)]
    board = [Card(Rank.TWO, Suit.CLUBS), Card(Rank.SEVEN, Suit.DIAMONDS),
             Card(Rank.KING, Suit.SPADES)]

    _simulated.cache_clear()
    first = win_probability_for(_request(hero, board))
    again = win_probability_for(_request(hero[::-1], board[::-1]))
    info = _simulated.cache_info()

    assert again == first
    assert info.currsize == 1, f"the same hand took {info.currsize} cache entries"
    assert (info.misses, info.hits) == (1, 1), f"{info.misses} misses, {info.hits} hits"


def test_the_outs_report_quotes_the_same_number_as_the_decision() -> None:
    """outs_for used to run its own 5,000 trial simulation of the spot the
    decision had already simulated."""
    from app.strategy.coach_analysis import _simulated
    from app.strategy.coach_ev import outs_for

    hero = [Card(Rank.NINE, Suit.HEARTS), Card(Rank.TEN, Suit.HEARTS)]
    board = [Card(Rank.TWO, Suit.CLUBS), Card(Rank.SEVEN, Suit.DIAMONDS),
             Card(Rank.KING, Suit.SPADES)]
    req = _request(hero, board)

    _simulated.cache_clear()
    shared = win_probability_for(req)
    before = _simulated.cache_info().misses
    report = outs_for(req)

    assert report is not None
    assert report["winProb"] == shared, "the outs report quotes a different number"
    assert _simulated.cache_info().misses == before, "the outs report simulated again"


def test_preflop_equity_reaches_the_display() -> None:
    """Analyses.equity was only set postflop, so a preflop hand the coach had
    priced at 68 percent was displayed as 0."""
    from app.strategy.coach_analysis import analyze_request

    req = _request([Card(Rank.ACE, Suit.CLUBS), Card(Rank.ACE, Suit.DIAMONDS)], [])
    assert analyze_request(req).equity == win_probability_for(req) == 0.68


def test_the_answer_is_the_same_on_every_run() -> None:
    """Unseeded, the shared estimate resampled whenever the cache was cold, so
    two processes could quote different numbers for the same spot."""
    from app.strategy.coach_analysis import _simulated

    hero = [Card(Rank.QUEEN, Suit.CLUBS), Card(Rank.JACK, Suit.CLUBS)]
    board = [Card(Rank.TWO, Suit.HEARTS), Card(Rank.FIVE, Suit.SPADES),
             Card(Rank.NINE, Suit.DIAMONDS)]
    req = _request(hero, board)
    first = win_probability_for(req)
    _simulated.cache_clear()
    assert win_probability_for(req) == first, "a cold cache gave a different answer"


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
