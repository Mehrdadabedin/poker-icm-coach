"""Opponent range estimation from position, actions and observed stats."""
from __future__ import annotations

import random

from app.ai.opponent_stats import OpponentStats
from app.ai.preflop_ranges import open_range_for
from app.strategy.hand_codec import HandCell, parse_range

# Extra offsuit hands aggressive players add to an opening range.
_AGGRESSIVE_EXTRA = "K5o+,Q8o+,J9o+,T9o,98o,87o,76o,65o"
_TIGHT_NARROW = "99+,AJs+,KQs,AQo+"


def estimate_range(position: str, raise_size: int, big_blind: int,
                   stats: OpponentStats | None) -> set[HandCell]:
    """Plausible opening range for a raise of the given size at a position."""
    base = set(open_range_for(position, 20).cells)
    if stats is None:
        return base
    # scale with observed looseness
    scale = stats.vpip * 1.1 + 0.5
    if scale > 0.85:
        base |= parse_range(_AGGRESSIVE_EXTRA)
    elif stats.pfr < 0.08:
        base = parse_range(_TIGHT_NARROW)
    return base


class RangeEstimator:
    """Session-adaptive range estimation keyed by opponent stats."""

    def __init__(self, rng: random.Random | None = None) -> None:
        self.rng = rng if rng is not None else random.Random()

    def range_for(self, position: str, stats: OpponentStats | None,
                  raise_size: int = 300, big_blind: int = 100) -> set[HandCell]:
        return estimate_range(position, raise_size, big_blind, stats)

    def postflop_bet_range(self, position: str, stats: OpponentStats | None) -> set[HandCell]:
        """Hands an opponent would bet postflop (value + bluffs)."""
        base = set(open_range_for(position, 20).cells)
        if stats is None or stats.aggression >= 0.7:
            base |= parse_range(_AGGRESSIVE_EXTRA)
        if stats is not None and stats.aggression < 0.3:
            # passive: narrowly value-heavy
            keep = {c for c in base if c.suited is None and c.lo >= 9 or c.hi >= 13}
            return keep
        return base
