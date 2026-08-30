"""Bubble / tournament stage tests (Atomic Part 024)."""
from __future__ import annotations

import pytest

from app.strategy.bubble import (
    PressureLevel,
    StageInfo,
    TournamentStage,
    bubble_pressure,
    detect_stage,
)


def stage(**kw) -> StageInfo:
    default = dict(
        players_remaining=9, paid_positions=6, hero_stack_bb=30.0,
        average_stack_bb=25.0, shortest_stack_bb=5.0, level_index=0,
    )
    default.update(kw)
    return detect_stage(**default)


def test_early_stage() -> None:
    info = stage(players_remaining=9, paid_positions=6, level_index=1)
    assert info.stage == TournamentStage.EARLY
    assert info.label == "EARLY"


def test_middle_stage() -> None:
    info = stage(players_remaining=9, paid_positions=6, level_index=5)
    assert info.stage == TournamentStage.MIDDLE


def test_late_stage() -> None:
    info = stage(players_remaining=9, paid_positions=6, level_index=10)
    assert info.stage == TournamentStage.LATE


def test_bubble_active() -> None:
    info = stage(players_remaining=7, paid_positions=6, level_index=9)
    assert info.stage == TournamentStage.BUBBLE


def test_bubble_approaching() -> None:
    info = stage(players_remaining=8, paid_positions=6, level_index=8)
    assert info.stage == TournamentStage.BUBBLE_APPROACHING


def test_post_bubble() -> None:
    info = stage(players_remaining=5, paid_positions=6, level_index=9)
    assert info.stage == TournamentStage.POST_BUBBLE


def test_final_table() -> None:
    info = stage(players_remaining=9, paid_positions=9, level_index=11)
    assert info.stage == TournamentStage.FINAL_TABLE


def test_final_table_bubble() -> None:
    info = stage(players_remaining=8, paid_positions=9, level_index=9)
    assert info.stage == TournamentStage.FINAL_TABLE_BUBBLE


def test_short_handed() -> None:
    info = stage(players_remaining=5, paid_positions=9, level_index=8)
    assert info.stage == TournamentStage.SHORT_HANDED


def test_heads_up() -> None:
    info = stage(players_remaining=2, paid_positions=9, level_index=15)
    assert info.stage == TournamentStage.HEADS_UP


def test_bubble_pressure_increases_with_short_stacks() -> None:
    low = bubble_pressure(stage(players_remaining=9, paid_positions=6, shortest_stack_bb=25.0))
    high = bubble_pressure(stage(players_remaining=7, paid_positions=6, shortest_stack_bb=2.0))
    assert high.level.value > low.level.value


def test_pressure_levels_ordered() -> None:
    assert PressureLevel.LOW.value < PressureLevel.MEDIUM.value < PressureLevel.HIGH.value < PressureLevel.VERY_HIGH.value


def test_invalid_remaining_raises() -> None:
    with pytest.raises(ValueError):
        stage(players_remaining=0, paid_positions=6)
