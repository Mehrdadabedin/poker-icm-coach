"""Preflop AI tests (Atomic Part 019)."""
from __future__ import annotations

import random

from app.ai.ai_framework import AIDecisionProvider
from app.ai.personalities import profile_for
from app.ai.preflop_ai import preflop_strategy
from app.ai.preflop_ranges import open_range_for, range_combo_count
from app.game.actions import Action, ActionType
from app.game.decision_provider import DecisionContext


def ctx_for(position: str, open_action: bool = True, stack_bb: int = 30, current_bet: int = 0,
            contribution: int = 0, big_blind: int = 100) -> DecisionContext:
    return DecisionContext(
        seat=3, hole_cards=[], board=[], street="preflop", pot=300,
        current_bet=current_bet, contribution=contribution, stack=stack_bb * big_blind,
        big_blind=big_blind,
        legal_actions=[Action(ActionType.CHECK), Action(ActionType.FOLD)],
        position=position,
    )


def test_open_ranges_exist_per_position() -> None:
    for pos in ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]:
        assert open_range_for(pos, 30).weight > 0


def test_position_influences_width() -> None:
    utg = open_range_for("UTG", 30).weight
    btn = open_range_for("BTN", 30).weight
    co = open_range_for("CO", 30).weight
    assert btn > co > utg


def test_stack_depth_influences_range() -> None:
    deep = open_range_for("CO", 50).weight
    short = open_range_for("CO", 10).weight
    assert short > 0
    assert deep != short


def test_range_combo_count_sane() -> None:
    count = range_combo_count("BTN", 30)
    assert 100 < count < 750  # not absurdly tight or wide


def test_preflop_strategy_when_unopened_raises_sometimes() -> None:
    rng = random.Random(1)
    provider = AIDecisionProvider(rng=rng, personality=profile_for("tag"))
    # strong hand in position: BTN with AsKs should raise most of the time
    action = preflop_strategy(
        ctx=ctx_for("BTN"), provider=provider, hole_ranks=(14, 13), suited=True,
    )
    assert action.type in {ActionType.RAISE, ActionType.ALL_IN, ActionType.CALL, ActionType.FOLD}
    # with many samples, a raise must occur at least once
    types = set()
    for seed in range(40):
        p2 = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tag"))
        a = preflop_strategy(ctx_for("BTN"), p2, hole_ranks=(14, 13), suited=True)
        types.add(a.type)
    assert ActionType.RAISE in types or ActionType.ALL_IN in types


def test_weak_hand_folds_from_utg() -> None:
    types = set()
    for seed in range(30):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tight"))
        a = preflop_strategy(ctx_for("UTG"), p, hole_ranks=(2, 7), suited=False)
        types.add(a.type)
    assert ActionType.FOLD in types
    assert ActionType.RAISE not in types  # 72o never open-raises from UTG


def test_facing_raise_can_threebet() -> None:
    types = set()
    for seed in range(60):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("aggressive"))
        ctx = ctx_for("CO", current_bet=300, contribution=0)
        a = preflop_strategy(ctx, p, hole_ranks=(14, 14), suited=False)
        types.add(a.type)
    assert ActionType.RAISE in types or ActionType.ALL_IN in types  # AA 3bets


def test_facing_raise_can_fold_weak() -> None:
    types = set()
    for seed in range(30):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tight"))
        ctx = ctx_for("BB", current_bet=220, contribution=100)
        a = preflop_strategy(ctx, p, hole_ranks=(9, 7), suited=False)
        types.add(a.type)
    assert ActionType.FOLD in types


def test_short_stack_jams() -> None:
    types = set()
    for seed in range(60):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("tag"))
        ctx = ctx_for("BTN", stack_bb=8, current_bet=0)
        a = preflop_strategy(ctx, p, hole_ranks=(14, 14), suited=False)
        types.add(a.type)
    assert ActionType.ALL_IN in types or ActionType.RAISE in types


def test_returns_legal_action() -> None:
    for seed in range(20):
        p = AIDecisionProvider(rng=random.Random(seed), personality=profile_for("loose"))
        ctx = ctx_for("MP", stack_bb=25)
        a = preflop_strategy(ctx, p, hole_ranks=(13, 12), suited=True)
        legal = {ActionType.RAISE, ActionType.ALL_IN, ActionType.CALL, ActionType.FOLD, ActionType.CHECK}
        assert a.type in legal
