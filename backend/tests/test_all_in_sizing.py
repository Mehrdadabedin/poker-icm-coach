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


def test_raise_is_not_offered_when_the_minimum_is_out_of_reach() -> None:
    """Hero has 900 behind facing 1000 with 200 in: the minimum raise-to is
    1900 and the reach is 1100, so both ends of the offered range were illegal.
    The shove stays available."""
    short = {a.type.value: a for a in legal_actions(CURRENT_BET, CONTRIBUTION, 900, BIG_BLIND, LAST_RAISE)}
    assert "raise" not in short
    assert short["all_in"].amount == 1100


def test_raise_is_offered_when_the_reach_exactly_meets_the_minimum() -> None:
    stack = 1700  # reach 1900, which is the minimum raise-to
    edge = {a.type.value: a for a in legal_actions(CURRENT_BET, CONTRIBUTION, stack, BIG_BLIND, LAST_RAISE)}
    assert edge["raise"].min_amount == edge["raise"].max_amount == 1900
    validate_action(Action(ActionType.RAISE, amount=1900), CURRENT_BET, CONTRIBUTION,
                    stack, LAST_RAISE, BIG_BLIND)


def test_a_call_that_takes_the_whole_stack_is_offered_as_a_shove() -> None:
    """to_call == stack: CALL is withheld, since calling would leave nothing,
    and the all-in totals what the hero can actually reach."""
    exact = {a.type.value: a for a in legal_actions(CURRENT_BET, CONTRIBUTION, 800, BIG_BLIND, LAST_RAISE)}
    assert "call" not in exact
    assert exact["all_in"].amount == 1000 == CURRENT_BET
