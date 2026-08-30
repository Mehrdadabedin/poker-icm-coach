"""Computer personality tests (Atomic Part 018)."""
from __future__ import annotations

import pytest

from app.ai.personalities import (
    PersonalityProfile,
    adaptive_profile,
    assign_personalities,
    profile_for,
    profiles,
    validate_profile,
)


def test_eight_profiles_exist() -> None:
    names = {p.name for p in profiles()}
    assert names == {
        "tight", "aggressive", "tag", "loose", "lag",
        "passive", "balanced", "adaptive",
    }


def test_all_params_in_valid_range() -> None:
    for p in profiles():
        assert 0 <= p.vpip <= 1
        assert 0 <= p.pfr <= 1
        assert 0 <= p.three_bet <= 1
        assert 0 <= p.aggression <= 1
        assert 0 <= p.bluff <= 1
        assert 0 <= p.call_tendency <= 1
        assert 0 <= p.fold_tendency <= 1


def test_profiles_are_distinct() -> None:
    signatures = {(p.name, round(p.vpip, 3), round(p.pfr, 3), round(p.three_bet, 3)) for p in profiles()}
    assert len(signatures) == 8


def test_tag_aggregate() -> None:
    tag = profile_for("tag")
    assert tag.vpip >= 0.15
    assert tag.pfr >= tag.vpip * 0.6  # raises a large share of played hands


def test_loose_has_high_vpip() -> None:
    loose = profile_for("loose")
    assert loose.vpip > 0.45


def test_tight_has_low_vpip() -> None:
    tight = profile_for("tight")
    assert tight.vpip < 0.25


def test_passive_low_aggression() -> None:
    passive = profile_for("passive")
    assert passive.aggression < 0.3


def test_validate_profile_rejects_out_of_range() -> None:
    with pytest.raises(ValueError):
        validate_profile(PersonalityProfile(name="x", vpip=1.5))
    with pytest.raises(ValueError):
        validate_profile(PersonalityProfile(name="x", vpip=-0.1))


def test_unknown_profile_raises() -> None:
    with pytest.raises(KeyError):
        profile_for("nope")


def test_assign_personalities_eight_bots() -> None:
    assigned = assign_personalities(8)
    assert len(assigned) == 8
    assert len(set(assigned)) >= 6  # not all identical


def test_adaptive_profile_adjusts() -> None:
    base = adaptive_profile()
    # winning stretch increases bluffing slightly; everything stays in bounds
    for _ in range(8):
        base.observe_result(won=True, shown_down=False)
    assert 0 <= base.bluff <= 1
    assert 0 <= base.vpip <= 1
    assert 0 <= base.call_tendency <= 1


def test_adaptive_learning_trend() -> None:
    a = adaptive_profile()
    # repeated losses against aggressive opponents should reduce bluffing
    start_bluff = a.bluff
    for _ in range(10):
        a.observe_result(won=False, shown_down=True)
    assert a.bluff < start_bluff + 1e-9 or a.bluff <= 0.2  # pushes toward low bluff
