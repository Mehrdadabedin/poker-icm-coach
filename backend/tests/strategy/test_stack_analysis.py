"""Stack analysis tests (Atomic Part 023)."""
from __future__ import annotations

from app.strategy.stack_analysis import (
    classify_stack,
    effective_stack,
    snapshot_for,
    stack_in_bb,
)


def test_stack_in_bb() -> None:
    assert stack_in_bb(18500, 1000) == 18.5
    assert stack_in_bb(30000, 1000) == 30.0
    assert stack_in_bb(500, 100) == 5.0


def test_stack_in_bb_zero_blind() -> None:
    assert stack_in_bb(1000, 0) == 0.0


def test_effective_stack() -> None:
    assert effective_stack(30000, 18000) == 18000
    assert effective_stack(12000, 45000) == 12000


def test_snapshot_stats() -> None:
    stacks = [45000, 30000, 20000, 5000, 10000, 25000, 15000, 8000, 32000]
    snap = snapshot_for(0, stacks, big_blind=1000)
    assert snap.average == 21111.11 or abs(snap.average - 21111.11) < 0.01
    assert snap.median == 20000
    assert snap.largest == 45000
    assert snap.shortest == 5000
    assert snap.rank == 1  # hero has the largest stack


def test_snapshot_rank() -> None:
    stacks = [45000, 30000, 20000, 5000, 10000, 25000, 15000, 8000, 32000]
    # hero at index 8 has 32000 -> 2nd largest (45k, 32k, 30k, ...)
    snap = snapshot_for(8, stacks, big_blind=1000)
    assert snap.rank == 2


def test_classify_big_medium_short() -> None:
    assert classify_stack(50.0) == "BIG STACK"
    assert classify_stack(25.0) == "BIG STACK"
    assert classify_stack(20.0) == "MEDIUM STACK"
    assert classify_stack(8.0) == "SHORT STACK"
    assert classify_stack(4.0) == "VERY SHORT STACK"


def test_short_stacks_count() -> None:
    stacks = [45000, 30000, 20000, 5000, 10000, 25000, 15000, 8000, 32000]
    snap = snapshot_for(0, stacks, big_blind=1000, short_threshold_bb=10)
    assert snap.short_stacks == 3  # 5000, 8000... and 10000 is exactly 10 BB -> short
    assert snap.very_short_stacks == 1  # 5000 (5 BB) below 6 BB
