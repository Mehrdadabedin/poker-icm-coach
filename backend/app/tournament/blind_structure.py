"""Configurable tournament blind structures."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BlindLevel:
    """One blind level: small blind, big blind, and ante amount."""

    small: int
    big: int
    ante: int = 0


def default_structure(level_minutes: int = 20, max_levels: int = 24) -> BlindStructure:
    """Default 100/100 structure (spec: exact first seven levels, doubling after).

    All level values flow through this single definition point so blinds
    are never hard-coded elsewhere in the application.
    """
    pairs = [
        (100, 100), (100, 200), (200, 300), (200, 400),
        (300, 600), (400, 800), (500, 1000), (600, 1200),
        (800, 1600), (1000, 2000), (1200, 2400), (1600, 3200),
        (2000, 4000), (2500, 5000), (3000, 6000), (4000, 8000),
    ]
    levels = [BlindLevel(small=s, big=b) for s, b in pairs]
    # Extend the doubling trend for longer tournaments.
    while len(levels) < max_levels:
        prev_small, prev_big = levels[-1].small, levels[-1].big
        small = prev_small + prev_big // 4
        levels.append(BlindLevel(small=small, big=small * 2))
    return BlindStructure(levels=levels[:max_levels], level_duration=level_minutes * 60)


@dataclass(slots=True)
class BlindStructure:
    """Ordered levels plus a fixed level duration in seconds."""

    levels: list[BlindLevel]
    level_duration: int = 1200  # seconds (20 minutes)

    def __len__(self) -> int:
        return len(self.levels)

    def level_at(self, index: int) -> BlindLevel:
        clamped = min(index, len(self.levels) - 1)
        return self.levels[clamped]

    def ante_for(self, mode: str, level: BlindLevel) -> int:
        """Dead-money ante per player for none / traditional / big-blind-ante."""
        if mode == "none":
            return 0
        if mode == "traditional":
            return max(0, level.big // 10)  # 10% of BB is a common default
        if mode == "bba":
            return level.big  # single big blind ante
        raise ValueError(f"unknown ante mode: {mode}")
