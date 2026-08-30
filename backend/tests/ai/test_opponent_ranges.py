"""Opponent range estimation tests (Atomic Part 021)."""
from __future__ import annotations

import random

from app.ai.opponent_ranges import RangeEstimator, estimate_range
from app.ai.opponent_stats import OpponentStats, stats_from_actions
from app.game.hand_result import HandAction


def test_stats_start_zero() -> None:
    s = OpponentStats(seat=3)
    assert s.hands == 0
    assert s.vpip == 0.0


def test_stats_from_call_and_fold_hands() -> None:
    # hand 1: seat 3 calls preflop (VPIP yes), folds flop
    actions1 = [HandAction(3, "call", 200, "preflop"), HandAction(3, "fold", None, "flop")]
    # hand 2: seat 3 folds preflop
    actions2 = [HandAction(3, "fold", None, "preflop")]
    s = stats_from_actions(3, [actions1, actions2])
    assert s.hands == 2
    assert s.vpip == 0.5
    assert s.pfr == 0.0


def test_stats_pfr_and_threebet() -> None:
    hand1 = [HandAction(3, "raise", 300, "preflop"), HandAction(3, "fold", None, "flop")]
    hand2 = [HandAction(3, "call", 100, "preflop"), HandAction(3, "check", None, "flop")]
    hand3 = [HandAction(3, "raise", 600, "preflop"), HandAction(3, "all_in", 1000, "preflop")]
    s = stats_from_actions(3, [hand1, hand2, hand3])
    assert s.hands == 3
    assert abs(s.pfr - 2 / 3) < 1e-9
    assert s.three_bet >= 1 / 3


def test_stats_aggression_ratio() -> None:
    actions = [
        HandAction(3, "call", 100, "preflop"),
        HandAction(3, "bet", 200, "flop"),
        HandAction(3, "call", 100, "turn"),
    ]
    s = stats_from_actions(3, [actions])
    # AF = (bets + raises) / calls = 1 / 2
    assert abs(s.aggression - 0.5) < 1e-9


def test_range_estimate_exists_and_bounded() -> None:
    estimates = estimate_range("UTG", raise_size=300, big_blind=100, stats=None)
    btn = estimate_range("BTN", raise_size=300, big_blind=100, stats=None)
    assert len(estimates) > 10
    assert len(btn) > len(estimates)


def test_range_estimator_adapts_to_aggressive() -> None:
    rng = random.Random(1)
    est = RangeEstimator(rng=rng)
    tight_stats = OpponentStats(seat=1, hands=50, vpip=0.16, pfr=0.10)
    loose_stats = OpponentStats(seat=2, hands=50, vpip=0.55, pfr=0.40)
    tight = est.range_for("CO", stats=tight_stats)
    loose = est.range_for("CO", stats=loose_stats)
    assert len(loose) > len(tight)


def test_high_aggression_widens_bluff_estimate() -> None:
    rng = random.Random(2)
    est = RangeEstimator(rng=rng)
    passive = OpponentStats(seat=1, hands=40, vpip=0.3, aggression=0.2)
    lag = OpponentStats(seat=2, hands=40, vpip=0.3, aggression=0.9)
    p_range = est.postflop_bet_range("BTN", stats=passive)
    a_range = est.postflop_bet_range("BTN", stats=lag)
    assert len(a_range) >= len(p_range)


def test_stats_bounds() -> None:
    s = OpponentStats(seat=0)
    s.hands = 10
    s.vpip = 1.5
    s._clamp()
    assert s.vpip == 1.0
