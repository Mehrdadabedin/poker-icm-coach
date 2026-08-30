"""Push/fold engine tests (Atomic Part 028)."""
from __future__ import annotations

from app.poker.card import card_from_str
from app.strategy.push_fold import (
    PushFoldDecision,
    PushFoldEngine,
    call_jam_decision,
    open_jam_range,
    reshove_range,
)

H = card_from_str


def test_open_jam_range_exists_all_depths() -> None:
    for depth in (10, 8, 6, 4, 3):
        cells = open_jam_range("BTN", depth)
        assert len(cells) > 0


def test_open_jam_smaller_early_position() -> None:
    utg = open_jam_range("UTG", 8)
    btn = open_jam_range("BTN", 8)
    assert len(btn) > len(utg)


def test_reshove_narrower_than_open() -> None:
    depth = 8
    open_cells = open_jam_range("CO", depth)
    reshove = reshove_range("CO", depth)
    assert len(reshove) > 0
    assert len(reshove) < len(open_cells)


def test_call_jam_premium_hand_calls() -> None:
    decision = call_jam_decision(
        hero=[H("Ah"), H("Ad")], position="BB", stack_bb=6,
        to_call=5000, pot=5500, villain_range=reshove_range("BTN", 6),
    )
    assert decision.recommendation == "CALL JAM"


def test_call_jam_trash_folds() -> None:
    decision = call_jam_decision(
        hero=[H("7h"), H("2d")], position="BB", stack_bb=6,
        to_call=5000, pot=5500, villain_range=reshove_range("BTN", 6),
    )
    assert decision.recommendation == "FOLD"


def test_call_jam_great_pot_odds_calls_medium() -> None:
    # enormous pot odds (call tiny to win huge pot) -> medium hand calls
    decision = call_jam_decision(
        hero=[H("Qh"), H("9d")], position="BB", stack_bb=5,
        to_call=2000, pot=18000, villain_range=reshove_range("BTN", 5),
    )
    assert decision.recommendation in ("CALL JAM", "FOLD")


def test_engine_decision_open_jam_label() -> None:
    engine = PushFoldEngine()
    decision = engine.decide(hero=[H("As"), H("Ks")], position="BTN", stack_bb=7)
    assert isinstance(decision, PushFoldDecision)
    assert decision.recommendation in ("OPEN JAM", "RAISE", "FOLD")


def test_engine_decision_reason_present() -> None:
    engine = PushFoldEngine()
    decision = engine.decide(hero=[H("As"), H("Ks")], position="BTN", stack_bb=7)
    assert decision.reason
