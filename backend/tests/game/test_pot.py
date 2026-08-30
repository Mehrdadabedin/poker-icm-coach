"""Pot engine tests (Atomic Part 010)."""
from __future__ import annotations

from app.game.player import Player
from app.game.pot import Pot


def make_players() -> list[Player]:
    return [Player(name=f"P{i}", stack=1000, seat=i) for i in range(3)]


def test_empty_pot() -> None:
    pot = Pot()
    assert pot.total() == 0


def test_add_to_pot() -> None:
    pot = Pot()
    pot.record(0, 100)
    pot.record(1, 100)
    pot.record(2, 50)
    assert pot.total() == 250
    assert pot.contributions == {0: 100, 1: 100, 2: 50}


def test_contribution_of() -> None:
    pot = Pot()
    pot.record(1, 200)
    assert pot.contribution_of(1) == 200
    assert pot.contribution_of(2) == 0


def test_award_adds_chips_to_winner() -> None:
    pot = Pot()
    pot.record(0, 100)
    pot.record(1, 100)
    winner = make_players()[0]
    pot.award_to([winner])
    assert winner.stack == 1200  # 1000 + pot 200
    assert pot.total() == 0


def test_award_splits_between_winners() -> None:
    pot = Pot()
    pot.record(0, 50)
    pot.record(1, 50)
    players = make_players()
    pot.award_to([players[0], players[1]])
    assert players[0].stack == 1050
    assert players[1].stack == 1050


def test_award_odd_chip_goes_to_first_winner() -> None:
    pot = Pot()
    pot.record(0, 100)
    pot.record(1, 100)
    pot.record(2, 50)
    players = make_players()
    pot.award_to([players[0], players[1]])
    assert players[0].stack == 1125
    assert players[1].stack == 1125
    # 250 total -> odd chip +1 to first
    assert pot.total() == 0


def test_reset() -> None:
    pot = Pot()
    pot.record(0, 300)
    pot.reset()
    assert pot.total() == 0
    assert pot.contributions == {}
