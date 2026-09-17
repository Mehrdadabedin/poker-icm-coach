"""Stack analysis tests (Atomic Part 023)."""
from __future__ import annotations

from app.strategy.stack_analysis import classify_stack, effective_stack, stack_in_bb


def test_stack_in_bb() -> None:
    assert stack_in_bb(18500, 1000) == 18.5
    assert stack_in_bb(30000, 1000) == 30.0
    assert stack_in_bb(500, 100) == 5.0


def test_stack_in_bb_zero_blind() -> None:
    assert stack_in_bb(1000, 0) == 0.0


def test_effective_stack() -> None:
    assert effective_stack(30000, 18000) == 18000
    assert effective_stack(12000, 45000) == 12000


def test_classify_big_medium_short() -> None:
    assert classify_stack(50.0) == "BIG STACK"
    assert classify_stack(25.0) == "BIG STACK"
    assert classify_stack(20.0) == "MEDIUM STACK"
    assert classify_stack(8.0) == "SHORT STACK"
    assert classify_stack(4.0) == "VERY SHORT STACK"
