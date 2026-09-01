"""Outs / probability tests (Atomic Part 052)."""
from __future__ import annotations

from app.poker.card import Card, Rank, Suit
from app.strategy.outs import compute_outs, winning_probability


def flush_draw() -> tuple[list[Card], list[Card]]:
    hero = [Card(Rank.ACE, Suit(0)), Card(Rank.KING, Suit(0))]      # Ah Kh
    board = [Card(Rank.TEN, Suit(0)), Card(Rank.NINE, Suit(0)), Card(Rank.TWO, Suit(1))]
    return hero, board


def test_outs_flush_draw_has_9_flush_outs() -> None:
    hero, board = flush_draw()
    report = compute_outs(hero, board)
    assert report.unknown == 47
    # at least the 9 flush cards plus pair/straight improvers
    assert report.outs >= 9
    assert report.improve_turn > 0
    assert report.improve_river > 0


def test_winning_probability_random() -> None:
    hero, board = flush_draw()
    report = winning_probability(hero, board, trials=2000, seed=3)
    assert 0 < report.win_prob < 1
    assert report.method in ("exact", "estimate")


def test_winning_probability_exact_opponent() -> None:
    hero, board = flush_draw()
    villain = [Card(Rank.TWO, Suit(0)), Card(Rank.THREE, Suit(0))]
    report = winning_probability(hero, board, opponent_cards=villain, trials=2000, seed=3)
    assert 0 <= report.win_prob <= 1
