"""Computer player personalities: tendency profiles and adaptation.

Each of the eight opponents gets a distinct profile driving VPIP/PFR /
3-bet / aggression / bluff / calling / folding behaviour. Adaptive
profiles tweak parameters from observed session results. All values are
bounded to [0, 1].
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class PersonalityProfile:
    """Tendency knobs used by every AI decision layer."""

    name: str = "balanced"
    vpip: float = 0.25
    pfr: float = 0.15
    three_bet: float = 0.08
    aggression: float = 0.5
    bluff: float = 0.15
    call_tendency: float = 0.5
    fold_tendency: float = 0.35
    four_bet: float = 0.04
    results: list[bool] = field(default_factory=list)  # won/lost history

    def observe_result(self, won: bool, shown_down: bool = False) -> None:
        """Feed a hand result; adaptive profiles shift tendencies bounded."""
        self.results.append(won)
        recent = self.results[-20:]
        win_rate = sum(recent) / len(recent)
        if win_rate < 0.4:
            self.bluff = max(0.03, self.bluff - 0.01)
            self.call_tendency = min(0.9, self.call_tendency + 0.01)
        elif win_rate > 0.6:
            self.bluff = min(0.4, self.bluff + 0.01)
            self.call_tendency = max(0.1, self.call_tendency - 0.01)
        self._clamp()

    def _clamp(self) -> None:
        for attr in ("vpip", "pfr", "three_bet", "aggression", "bluff",
                     "call_tendency", "fold_tendency", "four_bet"):
            value = getattr(self, attr)
            setattr(self, attr, max(0.0, min(1.0, value)))


def validate_profile(p: PersonalityProfile) -> None:
    for attr in ("vpip", "pfr", "three_bet", "aggression", "bluff",
                 "call_tendency", "fold_tendency", "four_bet"):
        value = getattr(p, attr)
        if not 0 <= value <= 1:
            raise ValueError(f"{p.name}.{attr} out of range: {value}")


def _p(name: str, vpip: float, pfr: float, three_bet: float, aggression: float,
       bluff: float, call: float, fold: float, four_bet: float) -> PersonalityProfile:
    return PersonalityProfile(name=name, vpip=vpip, pfr=pfr, three_bet=three_bet,
                              aggression=aggression, bluff=bluff,
                              call_tendency=call, fold_tendency=fold, four_bet=four_bet)


def profiles() -> list[PersonalityProfile]:
    """The eight opponent archetypes (distinct, bounded tendencies)."""
    return [
        _p("tight", 0.18, 0.11, 0.07, 0.40, 0.08, 0.35, 0.50, 0.04),
        _p("aggressive", 0.32, 0.24, 0.12, 0.85, 0.30, 0.30, 0.30, 0.08),
        _p("tag", 0.24, 0.19, 0.11, 0.75, 0.16, 0.35, 0.40, 0.06),
        _p("loose", 0.52, 0.22, 0.07, 0.45, 0.18, 0.65, 0.22, 0.04),
        _p("lag", 0.48, 0.36, 0.15, 0.90, 0.38, 0.42, 0.20, 0.10),
        _p("passive", 0.28, 0.06, 0.02, 0.20, 0.05, 0.70, 0.25, 0.01),
        _p("balanced", 0.28, 0.17, 0.09, 0.55, 0.16, 0.50, 0.35, 0.05),
        adaptive_profile(),
    ]


def adaptive_profile() -> PersonalityProfile:
    """Starts balanced and shifts with observed results."""
    return PersonalityProfile(name="adaptive", vpip=0.28, pfr=0.17, three_bet=0.09,
                              aggression=0.55, bluff=0.16, call_tendency=0.50,
                              fold_tendency=0.35, four_bet=0.05)


def profile_for(name: str) -> PersonalityProfile:
    for p in profiles():
        if p.name == name:
            return p
    raise KeyError(f"unknown personality: {name}")


def assign_personalities(count: int) -> list[str]:
    """Cycle through the eight archetypes for `count` computer seats."""
    pool = [p.name for p in profiles()]
    return [pool[i % len(pool)] for i in range(count)]
