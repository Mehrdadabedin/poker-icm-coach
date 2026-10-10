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


def test_the_same_move_in_engine_and_coach_words_is_preferred() -> None:
    """The engine records ALL_IN/RAISE/CALL, the coach says OPEN JAM, OPEN
    RAISE, CALL JAM: compared as raw words, every one of these was SUBOPTIMAL."""
    for hero, coach in [("ALL_IN", "OPEN JAM"), ("ALL_IN", "RESHOVE"), ("ALL_IN", "ALL-IN"),
                        ("RAISE", "OPEN RAISE"), ("CALL", "CALL JAM")]:
        result = compare_decisions(hero, coach)
        assert result.grade == Grade.PREFERRED, f"{hero} vs {coach} graded {result.grade}"


def test_close_lines_are_not_mistakes() -> None:
    for hero, coach in [("RAISE", "4-BET"), ("ALL_IN", "CALL JAM")]:
        assert compare_decisions(hero, coach).grade == Grade.ACCEPTABLE, f"{hero} vs {coach}"


def test_real_mistakes_stay_suboptimal() -> None:
    for hero, coach in [("ALL_IN", "FOLD"), ("CALL", "FOLD"), ("FOLD", "OPEN JAM"),
                        ("FOLD", "CALL JAM")]:
        assert compare_decisions(hero, coach).grade == Grade.SUBOPTIMAL, f"{hero} vs {coach}"
