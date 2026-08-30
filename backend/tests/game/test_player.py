"""Player model tests (Atomic Part 004)."""
from __future__ import annotations

import pytest

from app.game.player import Player
from app.poker.card import card_from_str


def make_player(stack: int = 5000, **kw) -> Player:
    return Player(name="Hero", stack=stack, seat=0, is_human=True, **kw)


def test_initial_state() -> None:
    p = Player(name="A", stack=45000, seat=2)
    assert p.name == "A"
    assert p.stack == 45000
    assert p.seat == 2
    assert not p.is_human
    assert not p.is_eliminated
    assert p.hole_cards == []
    assert not p.folded
    assert p.bet_total == 0


def test_remove_and_add_chips() -> None:
    p = make_player(5000)
    p.remove_chips(1200)
    assert p.stack == 3800
    p.add_chips(800)
    assert p.stack == 4600


def test_cannot_remove_more_than_stack() -> None:
    p = make_player(100)
    with pytest.raises(ValueError):
        p.remove_chips(101)


def test_elimination_is_explicit() -> None:
    p = make_player(100)
    p.remove_chips(100)
    assert p.stack == 0
    assert not p.is_eliminated  # busted out only when tournament marks eliminate()
    p.eliminate()
    assert p.is_eliminated


def test_hole_cards_set_and_get() -> None:
    p = make_player()
    cards = [card_from_str("As"), card_from_str("Kh")]
    p.set_hole_cards(cards)
    assert p.hole_cards == cards
    p.clear_hole_cards()
    assert p.hole_cards == []


def test_hole_cards_rejected_if_duplicate() -> None:
    p = make_player()
    with pytest.raises(ValueError):
        p.set_hole_cards([card_from_str("As"), card_from_str("As")])


def test_fold_reset_per_hand() -> None:
    p = make_player()
    p.folded = True
    p.new_hand()
    assert not p.folded
    assert p.hole_cards == []
    assert p.bet_total == 0


def test_bet_tracking() -> None:
    p = make_player(1000)
    p.commit_bet(200)
    assert p.bet_total == 200
    assert p.stack == 800
    p.commit_bet(300)
    assert p.bet_total == 500
    assert p.stack == 500


def test_all_in_flag() -> None:
    p = make_player(500)
    p.commit_bet(500)
    assert p.is_all_in


def test_committing_bet_beyond_stack_raises() -> None:
    p = make_player(100)
    with pytest.raises(ValueError):
        p.commit_bet(150)


def test_repr_and_str() -> None:
    p = make_player(45000)
    assert "Hero" in str(p)
    assert "45000" in repr(p)
