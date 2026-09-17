"""All-in and raise sizing are street totals, not bare-stack amounts.

The hero who has already bet this street shoves for contribution + stack. Sizing
either off the stack alone understated the all-in by what was already in front
of them and put the real maximum raise out of reach.
"""
from __future__ import annotations

import pytest

from app.game.actions import Action, ActionType, legal_actions, validate_action
from app.game.betting import StreetState, apply_action
from app.game.player import Player

# Hero has 200 in this street, faces a bet of 1000, and has 5000 behind.
CURRENT_BET = 1000
CONTRIBUTION = 200
STACK = 5000
LAST_RAISE = 900
BIG_BLIND = 100
REACH = CONTRIBUTION + STACK  # 5200


def _actions() -> dict[str, Action]:
    return {
        a.type.value: a
        for a in legal_actions(CURRENT_BET, CONTRIBUTION, STACK, BIG_BLIND, LAST_RAISE)
    }


def _street() -> tuple[StreetState, Player]:
    street = StreetState()
    street.current_bet = CURRENT_BET
    street.last_raise = LAST_RAISE
    street.contributions = {0: CONTRIBUTION}
    return street, Player(seat=0, name="Hero", stack=STACK)


def test_all_in_amount_is_what_the_shove_actually_totals() -> None:
    assert _actions()["all_in"].amount == REACH
    street, hero = _street()
    apply_action(street, hero, Action(ActionType.ALL_IN, amount=REACH, is_all_in=True),
                 street_contrib=CONTRIBUTION)
    assert street.contributions[0] == REACH, "advertised all-in must match what it commits"
    assert hero.stack == 0


def test_max_raise_reaches_the_whole_stack() -> None:
    assert _actions()["raise"].max_amount == REACH
    validate_action(Action(ActionType.RAISE, amount=REACH), CURRENT_BET, CONTRIBUTION,
                    STACK, LAST_RAISE, BIG_BLIND)
    street, hero = _street()
    apply_action(street, hero, Action(ActionType.RAISE, amount=REACH),
                 street_contrib=CONTRIBUTION)
    assert hero.stack == 0 and street.current_bet == REACH


def test_raise_beyond_reach_is_rejected_by_validation() -> None:
    """It used to pass validation and fail inside commit_bet, which reported a
    bet amount the caller never sent."""
    with pytest.raises(ValueError, match="beyond stack reach"):
        validate_action(Action(ActionType.RAISE, amount=REACH + 1), CURRENT_BET,
                        CONTRIBUTION, STACK, LAST_RAISE, BIG_BLIND)


def test_all_in_is_offered_only_while_the_hero_has_chips() -> None:
    assert "all_in" in _actions()
    broke = {a.type.value for a in legal_actions(CURRENT_BET, CONTRIBUTION, 0, BIG_BLIND, LAST_RAISE)}
    assert "all_in" not in broke


def test_nothing_committed_yet_leaves_the_sizing_at_the_stack() -> None:
    first_in = {a.type.value: a for a in legal_actions(0, 0, STACK, BIG_BLIND, 0)}
    assert first_in["all_in"].amount == STACK
