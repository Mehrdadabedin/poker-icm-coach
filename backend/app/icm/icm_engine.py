"""Independent Chip Model (ICM) — exact tournament equity for <= 9 players.

For larger tournaments the exact recursion is combinatorial; the caller
falls back to Monte Carlo (clearly labeled ESTIMATE). With no payout
structure the engine reports method="not_active".
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True, slots=True)
class ICMResult:
    equities: list[float]
    method: str  # exact | not_active


def icm_equities(stacks: Sequence[int], payouts: Sequence[float]) -> list[float]:
    """Exact per-player tournament equity (fractions of the prize pool).

    Uses the classic recursion: each player's win probability is their
    chip share; after removing a winner, recurse on the remaining stacks
    with the next payout level.
    """
    stacks = tuple(stacks)
    payouts = tuple(payouts)
    if not stacks:
        raise ValueError("stacks must not be empty")
    if any(s < 0 for s in stacks):
        raise ValueError("stacks must be non-negative")
    if not payouts:
        return [0.0] * len(stacks)
    if len(stacks) != len(payouts) and len(payouts) < len(stacks):
        payouts = payouts + (0.0,) * (len(stacks) - len(payouts))
    if len(stacks) == 1:
        return [payouts[0]]

    @lru_cache(maxsize=4096)
    def _eq(stacks_t: tuple[int, ...], prizes_t: tuple[float, ...]) -> tuple[float, ...]:
        total = sum(stacks_t)
        n = len(stacks_t)
        if n == 1:
            return (prizes_t[0],)  # last survivor takes the top remaining prize
        results = [0.0] * n
        for i, stack in enumerate(stacks_t):
            win = stack / total if total > 0 else 0.0
            remaining = stacks_t[:i] + stacks_t[i + 1 :]
            sub = _eq(remaining, prizes_t[1:])
            results[i] += win * prizes_t[0]
            for j, sub_eq in enumerate(sub):
                idx = j if j < i else j + 1
                results[idx] += win * sub_eq
        return tuple(results)

    return list(_eq(stacks, payouts))


class ICMEngine:
    """Object wrapper used by the coach and API layers."""

    def __init__(self, stacks: Sequence[int], payouts: Sequence[float]) -> None:
        self.stacks = list(stacks)
        self.payouts = list(payouts)

    def calculate(self) -> ICMResult:
        if not self.payouts:
            return ICMResult(equities=[0.0] * len(self.stacks), method="not_active")
        equities = icm_equities(self.stacks, self.payouts)
        return ICMResult(equities=equities, method="exact")
