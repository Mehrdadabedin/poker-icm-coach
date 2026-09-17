"""Antes are dead money, not a live bet.

post_blinds_and_antes wrote them into street.contributions and read current_bet
straight off the big blind's contribution, so a big blind ante made every
player call the blind plus an ante only one seat had posted, and a traditional
ante cut everyone's to_call by the ante they had already put in.
"""
from __future__ import annotations

from app.game.actions import amount_to_call
from app.game.betting import StreetState
from app.game.hand_setup import active_seats, post_blinds_and_antes
from app.tournament.tournament import build_default_tournament

SMALL, BIG = 100, 200


def _tournament(mode: str, level_index: int = 0, stacks: dict[int, int] | None = None):
    tournament = build_default_tournament(
        starting_stack=45_000, small_blind=SMALL, big_blind=BIG, level_minutes=20,
    )
    tournament.ante_mode = mode
    tournament.level_index = level_index
    for seat, stack in (stacks or {}).items():
        tournament.players[seat].stack = stack
    return tournament


def _bba_level_with_an_ante() -> int:
    """The big blind ante is 0 for the early levels, so a test at level 1 proves
    nothing about antes at all."""
    structure = build_default_tournament(
        starting_stack=45_000, small_blind=SMALL, big_blind=BIG, level_minutes=20,
    ).structure
    for index, level in enumerate(structure.levels):
        if structure.ante_for("bba", level) > 0:
            return index
    raise AssertionError("the structure never charges a big blind ante")


def _post(mode: str, level_index: int = 0, stacks: dict[int, int] | None = None):
    tournament = _tournament(mode, level_index, stacks)
    street = StreetState()
    post_blinds_and_antes(tournament, street)
    return tournament, street


def test_a_big_blind_ante_is_not_part_of_the_bet_to_call() -> None:
    level_index = _bba_level_with_an_ante()
    tournament, street = _post("bba", level_index)
    level = tournament.current_blind_level()
    assert tournament.structure.ante_for("bba", level) > 0, "the level has to charge an ante"
    assert street.current_bet == level.big, "the ante was counted as part of the bet"


def test_a_traditional_ante_does_not_reduce_what_a_player_owes() -> None:
    tournament, street = _post("traditional")
    ante = tournament.structure.ante_for("traditional", tournament.current_blind_level())
    assert ante > 0
    seats = active_seats(tournament.players)
    blinds = {seat for seat, amount in street.contributions.items() if amount}
    non_blind = next(seat for seat in seats if seat not in blinds)
    owed = amount_to_call(street.current_bet, street.contributions.get(non_blind, 0))
    assert owed == BIG, "the ante was deducted from the call"
    assert tournament.players[non_blind].ante_total == ante, "the ante never reached the pot"


def test_every_posted_chip_still_reaches_the_pot() -> None:
    for mode, level_index in (("none", 0), ("traditional", 0), ("bba", _bba_level_with_an_ante())):
        tournament, _ = _post(mode, level_index)
        committed = sum(p.bet_total + p.ante_total for p in tournament.players)
        missing = sum(45_000 - p.stack for p in tournament.players)
        assert committed == missing, f"{mode}: chips left the stacks without reaching the pot"


def test_a_short_big_blind_does_not_lower_the_bet_for_the_table() -> None:
    """current_bet used to be whatever the big blind could afford, so the rest
    of the table could call less than a big blind."""
    tournament, street = _post("none", stacks={})
    bb_seat = max(street.contributions, key=lambda s: street.contributions[s])
    short, short_street = _post("none", stacks={bb_seat: 50})
    assert short_street.current_bet == BIG
    assert short_street.contributions[bb_seat] == 50, "the short blind posts what it has"
    assert short.players[bb_seat].stack == 0


def test_a_traditional_ante_is_posted_before_the_blind() -> None:
    """A stack too short for both is all-in for the ante, with no live blind."""
    tournament, street = _post("traditional")
    ante = tournament.structure.ante_for("traditional", tournament.current_blind_level())
    bb_seat = max(street.contributions, key=lambda s: street.contributions[s])
    short, short_street = _post("traditional", stacks={bb_seat: ante})
    assert short.players[bb_seat].ante_total == ante
    assert short.players[bb_seat].bet_total == 0, "the ante was recorded as a live bet"
    assert short_street.contributions.get(bb_seat, 0) == 0, "the ante became a live blind"


def test_a_big_blind_ante_is_posted_after_the_blind() -> None:
    """TDA recommended procedure 11: the live blind takes priority over the
    big blind ante, which is the opposite of a traditional ante."""
    level_index = _bba_level_with_an_ante()
    tournament, street = _post("bba", level_index)
    bb_seat = max(street.contributions, key=lambda s: street.contributions[s])
    short, short_street = _post("bba", level_index, stacks={bb_seat: BIG})
    assert short_street.contributions[bb_seat] == BIG, "the ante was taken before the blind"
    assert short.players[bb_seat].stack == 0
