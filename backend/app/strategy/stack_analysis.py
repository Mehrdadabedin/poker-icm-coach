"""Stack analysis: BB stacks, effective stacks, table snapshot, ranks."""
from __future__ import annotations

VERY_SHORT_BB = 6
SHORT_BB = 10
MEDIUM_BB = 20


def stack_in_bb(chips: int, big_blind: int) -> float:
    if big_blind <= 0:
        return 0.0
    return round(chips / big_blind, 1)


def effective_stack(hero_chips: int, villain_chips: int) -> int:
    """The most that can be won or lost at this decision point."""
    return min(hero_chips, villain_chips)


def classify_stack(stack_bb: float) -> str:
    """Classify the hero stack band (display label)."""
    if stack_bb <= VERY_SHORT_BB:
        return "VERY SHORT STACK"
    if stack_bb <= SHORT_BB:
        return "SHORT STACK"
    if stack_bb <= MEDIUM_BB:
        return "MEDIUM STACK"
    return "BIG STACK"
