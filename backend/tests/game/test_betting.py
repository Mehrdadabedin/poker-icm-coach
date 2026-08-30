"""Betting engine tests (Atomic Part 009)."""
from __future__ import annotations

import pytest

from app.game.actions import (
    Action,
    ActionType,
    amount_to_call,
    legal_actions,
    min_raise_amount,
    validate_action,
)
from app.game.player import Player


def make_player(stack: int = 1000) -> Player:
    return Player(name="T", stack=stack, seat=0)


def test_action_creation() -> None:
    a = Action(ActionType.CALL)
    assert a.type == ActionType.CALL
    assert a.amount is None
    b = Action(ActionType.RAISE, 500)
    assert b.amount == 500


def test_amount_to_call() -> None:
    # current bet 400, player contributed 150 -> call 250
    assert amount_to_call(400, 150) == 250
    assert amount_to_call(400, 400) == 0
    assert amount_to_call(400, 500) == 0  # overpaid -> no call


def test_min_raise_amount() -> None:
    # current bet 400, last raise 200 (from 200 to 400) -> min raise to 600
    assert min_raise_amount(current_bet=400, last_raise=200) == 600
    # first bet -> min raise is 2x bet
    assert min_raise_amount(current_bet=300, last_raise=300) == 600
    # no current bet -> min bet is big blind context handled by caller


def test_legal_actions_no_bet() -> None:
    acted = legal_actions(
        current_bet=0, player_contribution=0, stack=1000,
        big_blind=100, last_raise=0,
    )
    types = {a.type for a in acted}
    assert ActionType.FOLD in types
    assert ActionType.CHECK in types
    assert ActionType.BET in types
    assert ActionType.ALL_IN in types
    assert ActionType.CALL not in types
    assert ActionType.RAISE not in types


def test_legal_actions_facing_bet() -> None:
    acted = legal_actions(
        current_bet=300, player_contribution=100, stack=1000,
        big_blind=100, last_raise=300,
    )
    types = {a.type for a in acted}
    assert ActionType.FOLD in types
    assert ActionType.CALL in types
    assert ActionType.RAISE in types
    assert ActionType.ALL_IN in types
    assert ActionType.CHECK not in types
    assert ActionType.BET not in types


def test_legal_actions_all_in_short_stack() -> None:
    # stack 200, facing call 300 -> only fold / all-in (call would be all-in)
    acted = legal_actions(
        current_bet=500, player_contribution=200, stack=200,
        big_blind=100, last_raise=500,
    )
    types = {a.type for a in acted}
    assert ActionType.FOLD in types
    assert ActionType.ALL_IN in types
    assert ActionType.CALL in types
    assert ActionType.RAISE not in types


def test_legal_actions_bet_sizing() -> None:
    acted = legal_actions(
        current_bet=0, player_contribution=0, stack=1000,
        big_blind=100, last_raise=0,
    )
    bet = next(a for a in acted if a.type == ActionType.BET)
    assert bet.min_amount == 100
    assert bet.max_amount == 1000


def test_validate_action_ok() -> None:
    validate_action(Action(ActionType.FOLD), current_bet=0, contribution=0, stack=100, last_raise=0)
    validate_action(Action(ActionType.CHECK), current_bet=0, contribution=0, stack=100, last_raise=0)


def test_validate_check_invalid_with_bet() -> None:
    with pytest.raises(ValueError):
        validate_action(Action(ActionType.CHECK), current_bet=200, contribution=0, stack=1000, last_raise=200)


def test_validate_call_invalid_without_bet() -> None:
    with pytest.raises(ValueError):
        validate_action(Action(ActionType.CALL), current_bet=0, contribution=0, stack=1000, last_raise=0)


def test_validate_raise_below_min_invalid() -> None:
    # current bet 400, last raise 200 -> min raise 600; raising to 300 invalid
    with pytest.raises(ValueError):
        validate_action(Action(ActionType.RAISE, 300), current_bet=400, contribution=100, stack=2000, last_raise=200)


def test_validate_raise_beyond_stack_invalid() -> None:
    with pytest.raises(ValueError):
        validate_action(Action(ActionType.RAISE, 5000), current_bet=400, contribution=100, stack=2000, last_raise=200)


def test_validate_bet_below_big_blind_invalid() -> None:
    with pytest.raises(ValueError):
        validate_action(Action(ActionType.BET, 50), current_bet=0, contribution=0, stack=2000, last_raise=0, big_blind=100)


def test_call_amount_is_capped_by_stack() -> None:
    # call 300 but only 200 stack -> all-in represents it; validate call of 300 invalid
    with pytest.raises(ValueError):
        validate_action(Action(ActionType.CALL), current_bet=300, contribution=0, stack=200, last_raise=300)


def test_fold_always_valid() -> None:
    validate_action(Action(ActionType.FOLD), current_bet=300, contribution=100, stack=500, last_raise=300)
    validate_action(Action(ActionType.ALL_IN), current_bet=300, contribution=100, stack=500, last_raise=300)
