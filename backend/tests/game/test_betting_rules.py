"""No-limit betting rules the engine used to get wrong.

Four defects, all found by review of the all-in sizing work:
antes counted as a live bet, the big blind's option offered an illegal BET,
an all-in short of a full raise shrank the minimum raise and reopened the
betting, and the action log recorded the caller's number rather than the
chips that actually went in.
"""
from __future__ import annotations

import pytest

from app.game.actions import Action, ActionType, legal_actions, validate_action
from app.game.betting import StreetState, apply_action
from app.game.hand_setup import post_blinds_and_antes
from app.game.player import Player
from app.tournament.tournament import build_default_tournament


def _kinds(*args, **kwargs) -> set[str]:
    return {a.type.value for a in legal_actions(*args, **kwargs)}


def _street(current_bet: int, last_raise: int, contributions: dict[int, int]) -> StreetState:
    street = StreetState()
    street.current_bet = current_bet
    street.last_raise = last_raise
    street.contributions = dict(contributions)
    return street


# --- antes are dead money, not a live bet -------------------------------------

def _tournament(ante_mode: str):
    tournament = build_default_tournament(
        starting_stack=45_000, small_blind=100, big_blind=200, level_minutes=20,
    )
    tournament.ante_mode = ante_mode
    return tournament


def test_a_big_blind_ante_is_not_part_of_the_bet_to_call() -> None:
    """It used to land in current_bet, so every player had to call the blind
    plus an ante only the big blind had posted."""
    for mode in ("none", "bba", "traditional"):
        tournament = _tournament(mode)
        street = StreetState()
        post_blinds_and_antes(tournament, street)
        assert street.current_bet == 200, f"{mode}: current_bet is not the big blind"


def test_a_traditional_ante_does_not_reduce_what_a_player_owes() -> None:
    tournament = _tournament("traditional")
    street = StreetState()
    post_blinds_and_antes(tournament, street)
    button = tournament.button
    non_blind = next(
        seat for seat in range(len(tournament.players))
        if street.contributions.get(seat, 0) == 0 and seat != button
    )
    assert street.contributions.get(non_blind, 0) == 0, "an ante was recorded as a live bet"


def test_antes_still_reach_the_pot() -> None:
    """Taking the ante out of the street must not take it out of the money."""
    plain = _tournament("none")
    post_blinds_and_antes(plain, StreetState())
    anted = _tournament("traditional")
    post_blinds_and_antes(anted, StreetState())
    ante = anted.structure.ante_for("traditional", anted.current_blind_level())
    if ante:
        assert sum(p.bet_total for p in anted.players) > sum(p.bet_total for p in plain.players)


# --- the big blind's option ---------------------------------------------------

def test_the_big_blind_option_offers_a_raise_not_a_bet() -> None:
    """Nothing to call but a bet is already there. BET was offered and
    validate_action rejects a bet whenever a bet is present, so it was
    guaranteed to fail."""
    kinds = _kinds(200, 200, 44_800, 200, 0)  # BB, unraised, 200 already in
    assert "check" in kinds
    assert "bet" not in kinds
    assert "raise" in kinds
    with pytest.raises(ValueError, match="cannot bet when a bet is already present"):
        validate_action(Action(ActionType.BET, amount=400), 200, 200, 44_800, 0, 200)


def test_the_first_player_in_still_gets_a_bet() -> None:
    kinds = _kinds(0, 0, 45_000, 200, 0)
    assert "bet" in kinds and "raise" not in kinds


# --- an all-in short of a full raise ------------------------------------------

def test_a_short_all_in_does_not_shrink_the_minimum_raise() -> None:
    """A bets 1000 over a 0 bet, B shoves 1200. The 200 increment is not a full
    raise, so the next minimum raise-to stays 2000, not 1400."""
    street = _street(current_bet=1000, last_raise=1000, contributions={0: 1000})
    shover = Player(seat=1, name="B", stack=1200)
    apply_action(street, shover, Action(ActionType.ALL_IN, is_all_in=True), street_contrib=0)
    assert street.current_bet == 1200
    assert street.last_raise == 1000, "the incomplete raise became the new minimum"


def test_a_full_all_in_raise_does_set_the_minimum() -> None:
    street = _street(current_bet=1000, last_raise=1000, contributions={0: 1000})
    shover = Player(seat=1, name="B", stack=2500)
    apply_action(street, shover, Action(ActionType.ALL_IN, is_all_in=True), street_contrib=0)
    assert street.current_bet == 2500
    assert street.last_raise == 1500


def test_a_short_all_in_does_not_reopen_the_betting() -> None:
    """TDA rules 45 and 49. The player who already bet may call or fold."""
    street = _street(current_bet=1000, last_raise=1000, contributions={0: 1000})
    bettor = Player(seat=0, name="A", stack=44_000)
    apply_action(street, bettor, Action(ActionType.BET, amount=1000), street_contrib=0)
    shover = Player(seat=1, name="B", stack=1200)
    apply_action(street, shover, Action(ActionType.ALL_IN, is_all_in=True), street_contrib=0)

    assert street.may_raise(0) is False
    kinds = _kinds(street.current_bet, 1000, 44_000, 200, street.last_raise, False)
    assert "raise" not in kinds
    assert "all_in" not in kinds, "shoving past the bet would be raising"
    assert kinds == {"fold", "call"}


def test_a_player_who_has_not_acted_may_still_raise_over_a_short_all_in() -> None:
    street = _street(current_bet=1000, last_raise=1000, contributions={0: 1000})
    apply_action(street, Player(seat=0, name="A", stack=44_000),
                 Action(ActionType.BET, amount=1000), street_contrib=0)
    apply_action(street, Player(seat=1, name="B", stack=1200),
                 Action(ActionType.ALL_IN, is_all_in=True), street_contrib=0)
    assert street.may_raise(2) is True
    assert "raise" in _kinds(street.current_bet, 0, 44_000, 200, street.last_raise, True)


def test_a_full_raise_reopens_the_betting_for_everyone() -> None:
    street = _street(current_bet=1000, last_raise=1000, contributions={0: 1000})
    apply_action(street, Player(seat=0, name="A", stack=44_000),
                 Action(ActionType.BET, amount=1000), street_contrib=0)
    apply_action(street, Player(seat=1, name="B", stack=44_000),
                 Action(ActionType.RAISE, amount=3000), street_contrib=0)
    assert street.may_raise(0) is True


def test_validation_refuses_a_raise_once_the_betting_is_closed() -> None:
    with pytest.raises(ValueError, match="not reopened"):
        validate_action(Action(ActionType.RAISE, amount=4000), 1200, 1000, 44_000, 1000, 200,
                        can_raise=False)
    with pytest.raises(ValueError, match="not reopened"):
        validate_action(Action(ActionType.ALL_IN, is_all_in=True), 1200, 1000, 44_000, 1000, 200,
                        can_raise=False)


def test_a_player_shorter_than_the_call_may_still_shove_when_closed() -> None:
    """All-in for less than what is owed is a call, not a raise."""
    kinds = _kinds(1200, 0, 900, 200, 1000, False)
    assert "all_in" in kinds
    validate_action(Action(ActionType.ALL_IN, is_all_in=True), 1200, 0, 900, 1000, 200,
                    can_raise=False)


def test_checking_records_the_actor_even_though_it_changes_nothing() -> None:
    street = _street(current_bet=0, last_raise=0, contributions={})
    apply_action(street, Player(seat=4, name="D", stack=1000),
                 Action(ActionType.CHECK), street_contrib=0)
    assert street.may_raise(4) is False
