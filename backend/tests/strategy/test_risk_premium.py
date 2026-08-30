"""Risk premium tests (Atomic Part 025)."""
from __future__ import annotations

from app.strategy.bubble import PressureLevel
from app.strategy.risk_premium import (
    RiskType,
    analyze_risk,
    covering,
    required_equity,
)


def test_covering_flags() -> None:
    assert covering(hero=20000, villain=18000) == "YOU COVER VILLAIN"
    assert covering(hero=15000, villain=18000) == "VILLAIN COVERS YOU"
    assert covering(hero=18000, villain=18000) == "EQUAL STACKS"


def test_required_equity() -> None:
    # pot 10000, call 5000 -> pot odds 25%; premium 5% -> 30%
    assert abs(required_equity(pot_odds=0.25, premium=0.05) - 0.30) < 1e-9


def test_premium_grows_with_pressure() -> None:
    low = analyze_risk(pressure=PressureLevel.LOW, pot_odds=0.25, hero_stack=15000,
                       villain_stack=18000, bubble_distance=4)
    high = analyze_risk(pressure=PressureLevel.HIGH, pot_odds=0.25, hero_stack=15000,
                        villain_stack=18000, bubble_distance=1)
    assert high.premium > low.premium
    assert high.required_equity > low.required_equity


def test_very_high_pressure_largest_premium() -> None:
    vh = analyze_risk(pressure=PressureLevel.VERY_HIGH, pot_odds=0.3, hero_stack=8000,
                      villain_stack=20000, bubble_distance=0)
    high = analyze_risk(pressure=PressureLevel.HIGH, pot_odds=0.3, hero_stack=8000,
                       villain_stack=20000, bubble_distance=0)
    assert vh.premium > high.premium


def test_risk_type_heuristic_by_default() -> None:
    r = analyze_risk(pressure=PressureLevel.MEDIUM, pot_odds=0.25, hero_stack=10000,
                     villain_stack=12000, bubble_distance=2)
    assert r.type == RiskType.HEURISTIC


def test_risk_type_calculated_when_icm_ev_present() -> None:
    r = analyze_risk(pressure=PressureLevel.MEDIUM, pot_odds=0.25, hero_stack=10000,
                     villain_stack=12000, bubble_distance=2,
                     fold_equity=0.30, call_equity=0.26)
    assert r.type == RiskType.ESTIMATED  # from ICM equity deltas
    assert r.fold_equity == 0.30
    assert r.call_equity == 0.26


def test_short_stack_covered_premium() -> None:
    covered = analyze_risk(pressure=PressureLevel.HIGH, pot_odds=0.2, hero_stack=3000,
                           villain_stack=45000, bubble_distance=1)
    assert covered.hero_is_at_risk
    assert not covered.hero_covering
