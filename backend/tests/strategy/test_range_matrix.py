"""Range matrix tests (Atomic Part 027)."""
from __future__ import annotations

from app.strategy.baseline_ranges import (
    baseline_action_frequencies,
    matrix_for_position,
    range_types,
)
from app.strategy.range_matrix import cell_key, cell_name, matrix_size


def test_matrix_size() -> None:
    assert matrix_size() == 13


def test_cell_naming() -> None:
    assert cell_name(hi=14, lo=14, suited=None) == "AA"
    assert cell_name(hi=14, lo=11, suited=True) == "AJs"
    assert cell_name(hi=14, lo=11, suited=False) == "AJo"
    assert cell_name(hi=13, lo=9, suited=False) == "K9o"


def test_cell_key() -> None:
    assert cell_key(hi=14, lo=11, suited=True) == "AJs"
    assert cell_key(hi=8, lo=8, suited=None) == "88"


def test_range_types_present() -> None:
    for name in ["OPEN RAISE", "CALL", "3-BET", "4-BET", "3-BET JAM",
                 "CALL 3-BET", "FOLD TO 3-BET", "SB OPEN", "BB DEFENSE",
                 "BB VS BTN", "BTN VS BLINDS", "RESHOVE", "OPEN JAM",
                 "CALL JAM", "FOLD TO JAM"]:
        assert name in range_types()


def test_matrix_builds_full_grid() -> None:
    matrix = matrix_for_position("BTN", stack_bb=30)
    grid = matrix.as_grid()
    assert len(grid) == 13
    assert all(len(row) == 13 for row in grid)


def test_mixed_frequencies_sum_to_one() -> None:
    matrix = matrix_for_position("BTN", stack_bb=30)
    for _cell, freqs in matrix.cells.items():
        assert abs(sum(freqs.values()) - 1.0) < 1e-9
        assert all(0.0 <= v <= 1.0 for v in freqs.values())


def test_premium_hand_mostly_raises() -> None:
    matrix = matrix_for_position("UTG", stack_bb=30)
    freqs = matrix.cell_frequencies(cell_key(14, 14, None))  # AA
    assert freqs.get("OPEN RAISE", 0.0) >= 0.8


def test_junk_hand_folds() -> None:
    matrix = matrix_for_position("UTG", stack_bb=30)
    freqs = matrix.cell_frequencies(cell_key(7, 2, False))  # 72o
    assert freqs.get("FOLD", 0.0) >= 0.9


def test_position_changes_matrix() -> None:
    utg = matrix_for_position("UTG", stack_bb=30)
    btn = matrix_for_position("BTN", stack_bb=30)
    opens = lambda m: sum(  # noqa: E731
        1 for freqs in m.cells.values()
        if freqs.get("OPEN RAISE", 0) > 0.0 or freqs.get("OPEN JAM", 0) > 0.0
    )
    assert opens(btn) > opens(utg)


def test_depth_changes_matrix() -> None:
    deep = matrix_for_position("CO", stack_bb=50)
    short = matrix_for_position("CO", stack_bb=8)
    deep_open = sum(1 for f in deep.cells.values() if f.get("OPEN RAISE", 0) > 0.5)
    short_jam = sum(1 for f in short.cells.values() if f.get("OPEN JAM", 0) > 0.5)
    assert deep_open > 0
    assert short_jam > 0


def test_baseline_frequencies_for_range_type() -> None:
    freqs = baseline_action_frequencies("CO", 20, range_type="3-BET")
    assert isinstance(freqs, dict)
    assert "3-BET" in freqs
