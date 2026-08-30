"""Risk premium: extra equity required to risk one's tournament life.

Labeled clearly: HEURISTIC when derived from pressure bands; ESTIMATED
when ICM equity deltas are supplied; CALCULATED reserved for exact
chip-EV comparisons (see coach module).
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from app.strategy.bubble import PressureLevel


class RiskType(StrEnum):
    CALCULATED = "CALCULATED"
    ESTIMATED = "ESTIMATED"
    HEURISTIC = "HEURISTIC"


@dataclass(frozen=True, slots=True)
class RiskPremium:
    premium: float            # equity percentage points required extra
    required_equity: float
    type: RiskType
    label: str
    hero_covering: bool
    hero_is_at_risk: bool
    fold_equity: float | None = None
    call_equity: float | None = None

    @property
    def coverage_label(self) -> str:
        return covering(self.hero_chips if hasattr(self, "hero_chips") else 0, 0)


def covering(hero: int, villain: int) -> str:
    if hero > villain:
        return "YOU COVER VILLAIN"
    if villain > hero:
        return "VILLAIN COVERS YOU"
    return "EQUAL STACKS"


def required_equity(pot_odds: float, premium: float) -> float:
    return min(1.0, pot_odds + premium)


_PREMIUM_BY_PRESSURE = {
    PressureLevel.LOW: 0.02,
    PressureLevel.MEDIUM: 0.05,
    PressureLevel.HIGH: 0.09,
    PressureLevel.VERY_HIGH: 0.14,
}


def analyze_risk(
    pressure: PressureLevel,
    pot_odds: float,
    hero_stack: int,
    villain_stack: int,
    bubble_distance: int,
    fold_equity: float | None = None,
    call_equity: float | None = None,
) -> RiskPremium:
    """Compute the risk premium at this decision point (heuristic unless given ICM EVs)."""
    base = _PREMIUM_BY_PRESSURE.get(pressure, 0.02)
    short_stack_penalty = 0.02 if hero_stack <= villain_stack * 0.25 else 0.0
    distance_bonus = 0.02 if bubble_distance == 0 else 0.0
    premium = min(0.2, base + short_stack_penalty + distance_bonus)
    if fold_equity is not None and call_equity is not None:
        premium = max(premium, min(0.2, max(0.0, fold_equity - call_equity)))
        risk_type = RiskType.ESTIMATED
    else:
        risk_type = RiskType.HEURISTIC
    return RiskPremium(
        premium=round(premium, 4),
        required_equity=round(required_equity(pot_odds, premium), 4),
        type=risk_type,
        label="HIGH" if premium >= 0.09 else ("MEDIUM" if premium >= 0.05 else "LOW"),
        hero_covering=hero_stack >= villain_stack,
        hero_is_at_risk=hero_stack < villain_stack,
        fold_equity=fold_equity,
        call_equity=call_equity,
    )
