"""No-limit betting rules the engine used to get wrong.

Four defects from review of the all-in sizing work: antes counted as a live
bet, the big blind's option offered an illegal BET, an all-in short of a full
raise shrank the minimum raise, and it also reopened the betting.
"""
from __future__ import annotations

import pytest

from app.game.actions import (
    Action,
    ActionType,
    legal_actions,
    min_raise_amount,
    validate_action,
)
from app.game.betting import StreetState, apply_action
from app.game.player import Player

BB = 200


def _kinds(*args, **kwargs) -> set[str]:
    return {a.type.value for a in legal_actions(*args, **kwargs)}


def _street(current_bet: int = 0, last_raise: int = 0, **contributions: int) -> StreetState:
    street = StreetState()
    street.current_bet = current_bet
    street.last_raise = last_raise
    street.contributions = {int(seat[1:]): amount for seat, amount in contributions.items()}
    return street


def _act(street: StreetState, seat: int, action: Action, stack: int) -> Player:
    player = Player(seat=seat, name=f"P{seat}", stack=stack)
    apply_action(street, player, action, street.contributions.get(seat, 0), BB)
    return player


# --- the big blind's option ---------------------------------------------------

def test_the_big_blind_option_offers_a_raise_not_a_bet() -> None:
    """Nothing to call but a bet is already there. BET was offered, and
    validate_action rejects a bet whenever a bet is present, so every one of
    those offers was illegal."""
    kinds = _kinds(BB, BB, 44_800, BB, 0)
    assert "check" in kinds and "raise" in kinds and "bet" not in kinds
    with pytest.raises(ValueError, match="cannot bet when a bet is already present"):
        validate_action(Action(ActionType.BET, amount=400), BB, BB, 44_800, 0, BB)


def test_the_big_blind_option_raise_endpoints_are_both_legal() -> None:
    raise_action = next(a for a in legal_actions(BB, BB, 44_800, BB, 0) if a.type == ActionType.RAISE)
    assert raise_action.min_amount == 2 * BB  # no previous raise, so double the blind
    assert raise_action.max_amount == BB + 44_800
    for amount in (raise_action.min_amount, raise_action.max_amount):
        validate_action(Action(ActionType.RAISE, amount=amount), BB, BB, 44_800, 0, BB)


def test_the_first_player_in_on_a_later_street_still_gets_a_bet() -> None:
    kinds = _kinds(0, 0, 45_000, BB, 0)
    assert "bet" in kinds and "raise" not in kinds


# --- an all-in short of a full raise ------------------------------------------

def test_a_short_all_in_does_not_shrink_the_minimum_raise() -> None:
    """A bets 1000 into nothing, B shoves 1200. The 200 increment is not a full
    raise, so the next minimum raise-to stays 2200, not 1400."""
    street = _street(current_bet=1000, last_raise=1000, p0=1000)
    _act(street, 1, Action(ActionType.ALL_IN, is_all_in=True), stack=1200)
    assert street.current_bet == 1200
    assert street.last_raise == 1000, "the incomplete raise became the new minimum"
    assert min_raise_amount(street.current_bet, street.last_raise) == 2200


def test_a_full_all_in_raise_sets_the_minimum() -> None:
    street = _street(current_bet=1000, last_raise=1000, p0=1000)
    _act(street, 1, Action(ActionType.ALL_IN, is_all_in=True), stack=2500)
    assert street.current_bet == 2500 and street.last_raise == 1500


def test_an_all_in_exactly_the_size_of_a_full_raise_counts_as_one() -> None:
    street = _street(current_bet=1000, last_raise=1000, p0=1000)
    _act(street, 1, Action(ActionType.ALL_IN, is_all_in=True), stack=2000)
    assert street.last_raise == 1000
    assert street.may_raise(0, BB) is True, "an exact full raise has to reopen"


def test_the_full_raise_size_is_never_below_the_big_blind() -> None:
    """On a fresh street last_raise is 0. An all-in for 80 into a 200 blind is
    not a full bet, so it must not reopen or become the minimum."""
    street = _street(current_bet=0, last_raise=0)
    _act(street, 0, Action(ActionType.CHECK), stack=44_000)
    _act(street, 1, Action(ActionType.ALL_IN, is_all_in=True), stack=80)
    assert street.current_bet == 80
    assert street.last_raise == 0
    assert street.may_raise(0, BB) is False


# --- reopening rights ----------------------------------------------------------

def _bet_then_short_shove() -> StreetState:
    street = _street()
    _act(street, 0, Action(ActionType.BET, amount=1000), stack=44_000)
    _act(street, 1, Action(ActionType.ALL_IN, is_all_in=True), stack=1200)
    return street


def test_a_short_all_in_does_not_reopen_the_betting() -> None:
    """TDA rules 45 and 49. The player who already bet may call or fold."""
    street = _bet_then_short_shove()
    assert street.may_raise(0, BB) is False
    kinds = _kinds(street.current_bet, 1000, 43_000, BB, street.last_raise, False)
    assert kinds == {"fold", "call"}, "shoving past the bet would be raising"


def test_a_player_who_has_not_acted_may_still_raise_over_a_short_all_in() -> None:
    street = _bet_then_short_shove()
    assert street.may_raise(2, BB) is True
    assert "raise" in _kinds(street.current_bet, 0, 44_000, BB, street.last_raise, True)


def test_short_all_ins_add_up_and_reopen_the_betting() -> None:
    """TDA rule 47. A bets 1000, B shoves 1600, C shoves 2200. A now faces a
    cumulative 1200, which is a full raise, so A may raise again."""
    street = _bet_then_short_shove()
    street.current_bet = 1200  # B's shove stands
    _act(street, 2, Action(ActionType.ALL_IN, is_all_in=True), stack=2200)
    assert street.current_bet == 2200
    assert street.may_raise(0, BB) is True, "1200 owed is a full raise over 1000"


def test_a_full_raise_reopens_the_betting_for_everyone() -> None:
    street = _bet_then_short_shove()
    _act(street, 2, Action(ActionType.RAISE, amount=3000), stack=44_000)
    assert street.may_raise(0, BB) is True


def test_a_fresh_street_gives_everyone_their_rights_back() -> None:
    street = _bet_then_short_shove()
    street.reset_street()
    assert street.may_raise(0, BB) is True and street.acted_since_full_raise == set()


def test_validation_refuses_a_raise_once_the_betting_is_closed() -> None:
    for action in (
        Action(ActionType.RAISE, amount=4000),
        Action(ActionType.ALL_IN, is_all_in=True),
    ):
        with pytest.raises(ValueError, match="not reopened"):
            validate_action(action, 1200, 1000, 44_000, 1000, BB, can_raise=False)


def test_a_player_shorter_than_the_call_may_still_shove_when_closed() -> None:
    """All-in for less than what is owed is a call, not a raise."""
    assert "all_in" in _kinds(1200, 0, 900, BB, 1000, False)
    validate_action(Action(ActionType.ALL_IN, is_all_in=True), 1200, 0, 900, 1000, BB,
                    can_raise=False)


def test_checking_records_the_actor_even_though_it_changes_nothing() -> None:
    street = _street()
    _act(street, 4, Action(ActionType.CHECK), stack=1000)
    assert street.may_raise(4, BB) is False
