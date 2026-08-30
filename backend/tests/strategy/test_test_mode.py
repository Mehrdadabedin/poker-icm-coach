"""Test mode grading tests (Atomic Part 030)."""
from __future__ import annotations

from app.strategy.test_mode import Grade, compare_decisions


def test_same_action_preferred() -> None:
    result = compare_decisions("FOLD", "FOLD")
    assert result.grade == Grade.PREFERRED


def test_call_check_equivalent() -> None:
    result = compare_decisions("CALL", "CHECK")
    assert result.grade == Grade.PREFERRED


def test_check_call_equivalent() -> None:
    result = compare_decisions("CHECK", "CALL")
    assert result.grade == Grade.PREFERRED


def test_raise_threebet_acceptable() -> None:
    result = compare_decisions("RAISE", "3-BET")
    assert result.grade == Grade.ACCEPTABLE


def test_call_vs_fold_suboptimal() -> None:
    result = compare_decisions("CALL", "FOLD")
    assert result.grade == Grade.SUBOPTIMAL


def test_explanation_present() -> None:
    for hero, coach in [("FOLD", "FOLD"), ("RAISE", "3-BET"), ("CALL", "FOLD")]:
        result = compare_decisions(hero, coach)
        assert result.explanation
        assert result.icm_factors
        assert result.range_note


def test_never_suboptimal_for_preferred_edge() -> None:
    result = compare_decisions("ALL-IN", "OPEN JAM")
    assert result.grade != Grade.SUBOPTIMAL
