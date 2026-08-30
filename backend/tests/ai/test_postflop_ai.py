"""Postflop AI tests (Atomic Part 020)."""
from __future__ import annotations

import random

from app.ai.ai_framework import AIDecisionProvider
from app.ai.board_texture import classify_board, is_dry, is_monotone, is_paired
from app.ai.personalities import profile_for
from app.ai.postflop_ai import equity_estimate, postflop_strategy
from app.game.actions import Action, ActionType
from app.game.decision_provider import DecisionContext
from app.poker.card import card_from_str

H = card_from_str


def ctx_flop(board: list[str], current_bet: int = 0, contribution: int = 0,
             stack: int = 9000, pot: int = 1500, bb: int = 100,
             position: str = "CO", history: list = None) -> DecisionContext:
    return DecisionContext(
        seat=3, hole_cards=[], board=[H(c) for c in board], street="flop", pot=pot,
        current_bet=current_bet, contribution=contribution, stack=stack, big_blind=bb,
        legal_actions=[Action(ActionType.CHECK), Action(ActionType.FOLD)],
        position=position, action_history=history or [],
    )


def test_classify_paired() -> None:
    texture = classify_board([H("Kc"), H("Kd"), H("7s")])
    assert is_paired(texture)
    assert not texture.monotone


def test_classify_monotone() -> None:
    texture = classify_board([H("9c"), H("6c"), H("2c")])
    assert is_monotone(texture)
    assert not is_paired(texture)


def test_classify_twotone_and_dry() -> None:
    texture = classify_board([H("Kc"), H("7d"), H("2s")])
    assert not texture.monotone
    assert len(texture.suits) == 3
    assert is_dry(texture)


def test_classify_wet_connected() -> None:
    texture = classify_board([H("9c"), H("8c"), H("7s")])
    assert texture.connected
    assert not is_dry(texture)
    assert texture.wet


def test_high_low_board_ranks() -> None:
    high = classify_board([H("Ac"), H("Kd"), H("7s")])
    low = classify_board([H("2c"), H("5d"), H("7s")])
    assert high.high_card
    assert low.low_card
    assert not high.low_card
    assert not low.high_card


def test_equity_estimate_monotonic() -> None:
    # trips > top pair > no pair
    trips = equity_estimate([H("Ah"), H("Ad")], [H("Ac"), H("Kd"), H("7s")], [])
    pair = equity_estimate([H("Ah"), H("Kd")], [H("Ac"), H("9d"), H("7s")], [])
    air = equity_estimate([H("Qh"), H("Jd")], [H("Ac"), H("Kd"), H("7s")], [])
    assert trips > pair > air


def test_flush_draw_boosts_estimate() -> None:
    plain = equity_estimate([H("Ah"), H("Kd")], [H("Qc"), H("8s"), H("2h")], [])
    draw = equity_estimate([H("Ah"), H("3h")], [H("Qh"), H("7h"), H("2c")], [])
    assert draw > plain + 0.05


def test_strong_hand_bets() -> None:
    types = set()
    for seed in range(40):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tag"))
        ctx = ctx_flop(["Ac", "Kd", "7s"])
        a = postflop_strategy(ctx, p, hole_ranks=(14, 14), suited=False)
        types.add(a.type)
    assert ActionType.BET in types or ActionType.RAISE in types


def test_weak_hand_checks_or_folds() -> None:
    types = set()
    for seed in range(40):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tight"))
        ctx = ctx_flop(["Ac", "Kd", "7s"])
        a = postflop_strategy(ctx, p, hole_ranks=(3, 2), suited=False)
        types.add(a.type)
    assert ActionType.CHECK in types or ActionType.FOLD in types
    assert ActionType.BET not in types


def test_facing_big_bet_weak_hand_folds() -> None:
    types = set()
    for seed in range(30):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("loose"))
        ctx = ctx_flop(["Ac", "Kd", "7s"], current_bet=1200, contribution=100, pot=1500)
        a = postflop_strategy(ctx, p, hole_ranks=(3, 2), suited=False)
        types.add(a.type)
    assert ActionType.FOLD in types


def test_draw_calls_with_good_odds() -> None:
    types = set()
    for seed in range(40):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("passive"))
        # flush draw facing small bet: pot 4000, call 500 -> 11% odds
        ctx = ctx_flop(["Qh", "7h", "2c"], current_bet=500, contribution=0,
                       pot=4000, stack=9000)
        a = postflop_strategy(ctx, p, hole_ranks=(9, 5), suited=True)  # 9h5h
        types.add(a.type)
    assert ActionType.CALL in types


def test_cbet_after_preflop_raise() -> None:
    history = [(3, "raise", 250), (5, "call", 250)]
    types = set()
    for seed in range(60):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tag"))
        ctx = ctx_flop(["9c", "7d", "3s"], history=history, pot=600)
        a = postflop_strategy(ctx, p, hole_ranks=(13, 11), suited=True)  # strong-ish top pair draw
        types.add(a.type)
    # tag cbets a large share of the time on a dry board
    assert ActionType.BET in types
