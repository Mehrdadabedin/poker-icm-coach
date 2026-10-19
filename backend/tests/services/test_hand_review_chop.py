"""CHOPPED means the hero tied for a pot, nothing else.

The owner's hand #14 (19 Oct): all-in for 26,025 with AJ, they made two pair
and won the whole main pot, 78,175. Two bigger stacks had a side pot the hero
was not in; one of them won it. The result read CHOPPED because two players
had won something, and the owner read it as a loss.
"""
from __future__ import annotations

from app.game.hand_result import HandWinner
from app.game.player import Player
from app.game.showdown import settle
from app.poker.card import card_from_str
from app.services.hand_review import hero_chopped

BOARD = [card_from_str(c) for c in ("Jd", "7h", "5s", "5d", "9d")]


def _player(seat: int, cards: str, committed: int, behind: int = 0) -> Player:
    player = Player(seat=seat, name=f"P{seat}", stack=behind)
    player.set_hole_cards([card_from_str(c) for c in cards.split()])
    player.bet_total = committed
    return player


def test_the_owners_hand_pays_the_main_pot_to_the_hero_and_is_not_a_chop() -> None:
    hero = _player(0, "Js Ad", 26_025)  # two pair, jacks and fives, all-in
    emma = _player(1, "4h Qc", 26_735)  # pair of fives, queen kicker, all-in
    alex = _player(2, "Th 2s", 29_700, behind=47_770)  # pair of fives, lower kickers
    small_blind = _player(3, "2c 3c", 100)  # folded
    players = [hero, emma, alex, small_blind]

    winners, _showed, pot = settle(players, {0, 1, 2}, BOARD)

    assert pot == 82_560  # the POT on the owner's screen, uncalled chips included
    # the stacks on the owner's screen after the hand
    assert (hero.stack, emma.stack, alex.stack) == (78_175, 1_420, 50_735)
    assert [(w.seats, w.amount) for w in winners] == [([0], 78_175), ([1], 1_420)]
    assert not hero_chopped(winners, 0)


def test_a_tie_for_a_pot_is_a_chop() -> None:
    assert hero_chopped([HandWinner(seats=[0, 2], amount=400)], 0)
    assert hero_chopped([HandWinner(seats=[0], amount=900), HandWinner(seats=[0, 1], amount=200)], 0)


def test_losing_while_two_others_tie_is_not_a_chop_for_the_hero() -> None:
    assert not hero_chopped([HandWinner(seats=[1, 2], amount=600)], 0)
