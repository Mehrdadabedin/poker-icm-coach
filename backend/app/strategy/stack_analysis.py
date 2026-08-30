"""Stack analysis: BB stacks, effective stacks, table snapshot, ranks."""
from __future__ import annotations

from dataclasses import dataclass
from statistics import median

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


@dataclass(frozen=True, slots=True)
class StackSnapshot:
    """Aggregate table stack statistics plus the hero's standing."""

    stacks: tuple[int, ...]
    average: float
    median: float
    largest: int
    shortest: int
    rank: int
    hero_stack: int
    short_stacks: int
    very_short_stacks: int

    @property
    def hero_in_bb(self) -> float:
        return 0.0  # filled by caller via classify; kept for interface stability


def snapshot_for(
    hero_index: int,
    stacks: list[int],
    big_blind: int,
    short_threshold_bb: int = SHORT_BB,
    very_short_threshold_bb: int = VERY_SHORT_BB,
) -> StackSnapshot:
    if not stacks or not (0 <= hero_index < len(stacks)):
        raise ValueError("invalid hero index / empty stacks")
    hero = stacks[hero_index]
    ordered = sorted(stacks, reverse=True)
    rank = ordered.index(hero) + 1
    short = [s for s in stacks if stack_in_bb(s, big_blind) <= short_threshold_bb]
    very_short = [s for s in stacks if stack_in_bb(s, big_blind) <= very_short_threshold_bb]
    return StackSnapshot(
        stacks=tuple(stacks),
        average=round(sum(stacks) / len(stacks), 2),
        median=median(stacks),
        largest=max(stacks),
        shortest=min(stacks),
        rank=rank,
        hero_stack=hero,
        short_stacks=len(short),
        very_short_stacks=len(very_short),
    )


def classify_stack(stack_bb: float) -> str:
    """Classify the hero stack band (display label)."""
    if stack_bb <= VERY_SHORT_BB:
        return "VERY SHORT STACK"
    if stack_bb <= SHORT_BB:
        return "SHORT STACK"
    if stack_bb <= MEDIUM_BB:
        return "MEDIUM STACK"
    return "BIG STACK"
