"""Equity engine tests (Atomic Part 026)."""
from __future__ import annotations

from app.equity.equity_engine import EquityEngine, hero_vs_hand, hero_vs_random, hero_vs_range
from app.poker.card import card_from_str
from app.strategy.hand_codec import parse_range

H = card_from_str


def test_preflop_aa_vs_kk_known() -> None:
    result = hero_vs_hand(hero=[H("Ah"), H("Ad")], villain=[H("Ks"), H("Kd")], board=[], trials=20000, seed=1)
    assert result.method == "estimate"
    assert abs(result.equity - 0.812) < 0.015
    assert result.ci_half > 0


def test_preflop_aa_vs_kk_headsup() -> None:
    result = hero_vs_hand(hero=[H("Ah"), H("Ad")], villain=[H("Ks"), H("Kd")], board=[])
    assert result.method == "estimate"  # preflop uses Monte Carlo
    assert abs(result.equity - 0.8123) < 0.015


def test_preflop_aa_vs_random() -> None:
    result = hero_vs_random(hero=[H("Ah"), H("Ad")], board=[], trials=20000, seed=2)
    assert abs(result.equity - 0.852) < 0.02


def test_ak_vs_pair_underdog() -> None:
    result = hero_vs_hand(hero=[H("Ac"), H("Kd")], villain=[H("Qh"), H("Qs")], board=[])
    assert 0.40 < result.equity < 0.47  # AK vs QQ roughly 43%


def test_exact_postflop_nut_flush() -> None:
    board = [H("Ah"), H("9h"), H("2d"), H("7c")]  # turn: exact enumeration is fast
    result = hero_vs_hand(hero=[H("Kh"), H("Qh")], villain=[H("As"), H("Ad")], board=board)
    assert result.method == "exact"
    # only 7 of 9 heart rivers win: 2h and 7h give villain aces-full
    assert abs(result.equity - 7 / 44) < 1e-9


def test_equity_vs_range_between_extremes() -> None:
    board = [H("Kc"), H("7d"), H("2s")]
    hero = [H("Ac"), H("Ad")]
    range_cells = parse_range("AA,KK,QQ,AKs,AKo")
    result = hero_vs_range(hero=hero, cells=range_cells, board=board, trials=8000, seed=3)
    assert 0.4 < result.equity < 0.95
    assert result.method == "estimate"


def test_equity_vs_range_strong_hand() -> None:
    board = [H("Kc"), H("7d"), H("2s")]
    hero = [H("Ks"), H("Kd")]  # top set
    range_cells = parse_range("AA,KK,QQ,JJ,AKs,AKo,KQs")
    result = hero_vs_range(hero=hero, cells=range_cells, board=board, trials=8000, seed=4)
    assert result.equity > 0.7


def test_engine_class_interface() -> None:
    engine = EquityEngine(seed=9)
    assert engine.rng is not None


def test_invalid_inputs_raise() -> None:
    import pytest

    with pytest.raises(ValueError):
        hero_vs_hand(hero=[H("Ah")], villain=[H("Ks"), H("Kd")], board=[])
