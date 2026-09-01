"""Configurable tournament blind structures."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BlindLevel:
    """One blind level: small blind, big blind, ante amount, break after."""

    small: int
    big: int
    ante: int = 0
    break_after: int = 0  # seconds of break after this level (0 = none)


def default_structure(
    level_minutes: int = 20,
    small_blind: int = 100,
    big_blind: int = 100,
) -> BlindStructure:
    """Exact 21-level schedule with BB ante from level 6 and three breaks.

    Level format: (SB, BB, BB-ante, break_seconds).
    """
    schedule = [
        (100, 100, 0, 0), (100, 200, 0, 0), (100, 300, 0, 0),
        (200, 400, 0, 0), (200, 500, 0, 5 * 60),
        (300, 600, 600, 0), (400, 800, 800, 0), (500, 1000, 1000, 0),
        (600, 1200, 1200, 0), (800, 1600, 1600, 0), (1000, 2000, 2000, 15 * 60),
        (1500, 3000, 3000, 0), (2000, 4000, 4000, 0), (3000, 6000, 6000, 0),
        (4000, 8000, 8000, 0), (5000, 10000, 10000, 0), (6000, 12000, 12000, 15 * 60),
        (8000, 16000, 16000, 0), (10000, 20000, 20000, 0),
        (15000, 30000, 30000, 0), (20000, 40000, 40000, 0),
    ]
    # Honor the configured starting blinds exactly at level 1; scale the
    # schedule per-axis so later levels keep the same relative shape.
    sb_scale = small_blind / max(1, 100)
    bb_scale = big_blind / max(1, 100)
    levels = [
        BlindLevel(
            small=int(s * sb_scale), big=int(b * bb_scale),
            ante=int(a * bb_scale) if a else 0, break_after=br,
        )
        for s, b, a, br in schedule
    ]
    return BlindStructure(levels=levels, level_duration=level_minutes * 60)


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
            return level.ante  # per-level big blind ante (0 for early levels)
        raise ValueError(f"unknown ante mode: {mode}")
