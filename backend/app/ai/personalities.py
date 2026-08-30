"""Computer player personality profiles (tendency parameters).

Part 018 expands these into the full set of eight personalities; the
framework only needs a default profile at this stage.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class PersonalityProfile:
    """Tendency knobs used by every AI decision layer."""

    name: str = "balanced"
    vpip: float = 0.25        # voluntary chips in pot frequency 0..1
    pfr: float = 0.15         # preflop raise frequency 0..1
    three_bet: float = 0.08   # 3-bet frequency 0..1
    aggression: float = 0.5   # postflop aggression 0..1 (0=passive, 1=hyper)
    bluff: float = 0.15       # bluff tendency 0..1
    call_tendency: float = 0.5
    fold_tendency: float = 0.35
    four_bet: float = 0.04
    eager: bool = False


def tight_passive_profile() -> PersonalityProfile:
    """Default conservative profile (framework fallback behaviour)."""
    return PersonalityProfile(
        name="tight-passive", vpip=0.18, pfr=0.08, three_bet=0.04,
        aggression=0.25, bluff=0.08, call_tendency=0.45, fold_tendency=0.45,
    )
