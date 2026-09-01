"""Chip EV tests (Atomic Part 051)."""
from __future__ import annotations

import pytest

from app.strategy.ev import ChipEV, chip_ev


def test_positive_ev_call() -> None:
    ev = chip_ev(win_prob=0.6, pot=2000, to_call=500)
    assert ev.value == pytest.approx(0.6 * 2000 - 0.4 * 500)
    assert ev.classification == "POSITIVE EV"
    assert ev.chip_recommendation() == "CALL"


def test_negative_ev_call() -> None:
    ev = chip_ev(win_prob=0.2, pot=1000, to_call=800)
    assert ev.value < 0
    assert ev.classification == "NEGATIVE EV"
    assert ev.chip_recommendation() == "FOLD"


def test_neutral_no_call() -> None:
    ev = chip_ev(win_prob=0.5, pot=1000, to_call=0)
    assert ev.classification == "NEUTRAL"
    assert ev.chip_recommendation() == "CHECK/BET"


def test_invalid_probability_raises() -> None:
    with pytest.raises(ValueError):
        chip_ev(1.5, 100, 100)


def test_to_dict_fields() -> None:
    d = chip_ev(0.55, 1000, 300).to_dict()
    assert d["evClass"] == "POSITIVE EV"
    assert d["chipEv"] == round(0.55 * 1000 - 0.45 * 300)
    assert "winProb" in d and "loseProb" in d and "toCall" in d
