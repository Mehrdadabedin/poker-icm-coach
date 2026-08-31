"""ICM engine tests (Atomic Part 022)."""
from __future__ import annotations

import pytest

from app.icm.icm_engine import ICMEngine, ICMResult, icm_equities
from app.tournament.tournament import PayoutStructure


def test_two_player_equal_stacks() -> None:
    eq = icm_equities([1000, 1000], [0.7, 0.3])
    assert abs(eq[0] - 0.5) < 1e-9
    assert abs(eq[1] - 0.5) < 1e-9


def test_two_player_proportional() -> None:
    # E_A = 0.7 * (s_A/S) + 0.3 * (s_B/S)
    eq = icm_equities([3000, 1000], [0.7, 0.3])
    expected_a = 0.7 * 0.75 + 0.3 * 0.25
    assert abs(eq[0] - expected_a) < 1e-9


def test_three_player_sums_to_payout_total() -> None:
    eq = icm_equities([1000, 1000, 1000], [0.5, 0.3, 0.2])
    assert abs(sum(eq) - 1.0) < 1e-9


def test_three_player_hand_computed() -> None:
    stacks = [2000, 1000, 1000]
    payouts = [0.5, 0.3, 0.2]
    eq = icm_equities(stacks, payouts)
    # derive with the classic recursion for verification
    s = sum(stacks)
    a, b, c = stacks
    e_a = payouts[0] * (a / s)
    e_a += payouts[1] * (b / s) * (a / (a + c))
    e_a += payouts[1] * (c / s) * (a / (a + b))
    e_a += payouts[2] * (b / s) * (c / (a + c))
    e_a += payouts[2] * (c / s) * (b / (a + b))
    assert abs(eq[0] - e_a) < 1e-9


def test_equal_stacks_equal_equity() -> None:
    eq = icm_equities([1000, 1000, 1000, 1000, 1000], [0.4, 0.25, 0.15, 0.1, 0.06, 0.04])
    # 5 players, 6 prizes: the 6th-place prize is unclaimed
    expected = sum([0.4, 0.25, 0.15, 0.1, 0.06]) / 5
    for value in eq:
        assert abs(value - expected) < 1e-9


def test_big_stack_lower_equity_per_chip_than_short() -> None:
    # 3 players: 4000, 4000, 1000 at bubble-like payouts [0.5, 0.3, 0.2]
    eq = icm_equities([4000, 4000, 1000], [0.5, 0.3, 0.2])
    big_per_chip = eq[0] / 4000
    short_per_chip = eq[2] / 1000
    assert short_per_chip > big_per_chip  # ICM bubble protection


def test_engine_object() -> None:
    engine = ICMEngine(stacks=[1000, 2000, 3000], payouts=[0.5, 0.3, 0.2])
    result = engine.calculate()
    assert isinstance(result, ICMResult)
    assert len(result.equities) == 3
    assert abs(sum(result.equities) - 1.0) < 1e-9
    assert result.method == "exact"


def test_engine_icm_not_active_without_payouts() -> None:
    engine = ICMEngine(stacks=[1000, 2000, 3000], payouts=[])
    result = engine.calculate()
    assert result.method == "not_active"
    assert result.equities == [0.0, 0.0, 0.0]


def test_invalid_stacks_raise() -> None:
    with pytest.raises(ValueError):
        icm_equities([1000, -5], [0.7, 0.3])
    with pytest.raises(ValueError):
        icm_equities([], [0.7, 0.3])

def test_zero_stacks_do_not_divide_by_zero() -> None:
    # Eliminated players remain in the stack list as 0 chips; the recursion
    # must not divide by zero when a fold leaves the hero at 0 (all-in call).
    eq = icm_equities([0, 0, 5000, 3000], [0.5, 0.3, 0.2])
    assert len(eq) == 4
    assert eq[0] == 0.0 and eq[1] == 0.0
    assert all(v >= 0.0 for v in eq)
    assert eq[2] > eq[3]  # bigger stack keeps more equity


def test_nine_player_icm_completes() -> None:
    stacks = [45000, 38000, 32000, 29000, 21000, 18000, 12000, 8000, 5000]
    payouts = PayoutStructure.nine_player().percentages
    eq = icm_equities(stacks, list(payouts))
    assert len(eq) == 9
    assert abs(sum(eq) - 1.0) < 1e-6
    # stack order preserved: bigger stack -> more equity
    assert eq[0] > eq[4] > eq[8]
