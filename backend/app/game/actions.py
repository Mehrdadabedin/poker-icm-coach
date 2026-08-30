"""Poker action value objects and legality rules."""
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ActionType(StrEnum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    BET = "bet"
    RAISE = "raise"
    ALL_IN = "all_in"


@dataclass(frozen=True, slots=True)
class Action:
    """A player action. `amount` is the total bet/raise-to amount."""

    type: ActionType
    amount: int | None = None
    min_amount: int | None = None
    max_amount: int | None = None
    is_all_in: bool = False


def amount_to_call(current_bet: int, player_contribution: int) -> int:
    """Chips the player must put in to match the current bet."""
    return max(0, current_bet - player_contribution)


def min_raise_amount(current_bet: int, last_raise: int) -> int:
    """Smallest legal raise-to amount (no-limit: current bet + last raise size)."""
    if last_raise <= 0:
        return current_bet * 2 if current_bet > 0 else 0
    return current_bet + last_raise


def legal_actions(
    current_bet: int,
    player_contribution: int,
    stack: int,
    big_blind: int,
    last_raise: int,
) -> list[Action]:
    """Actions the player may legally take right now (bounded by stack)."""
    to_call = amount_to_call(current_bet, player_contribution)
    min_raise = min_raise_amount(current_bet, last_raise)
    actions: list[Action] = []
    actions.append(Action(ActionType.FOLD))
    if to_call == 0:
        actions.append(Action(ActionType.CHECK))
        if stack >= big_blind:
            actions.append(Action(ActionType.BET, min_amount=big_blind, max_amount=stack))
    else:
        if to_call < stack:  # a call that equals/exceeds stack is an all-in call
            actions.append(Action(ActionType.CALL, amount=to_call, max_amount=stack))
        if stack > to_call and min_raise > 0:
            actions.append(
                Action(ActionType.RAISE, min_amount=min_raise, max_amount=stack, amount=None)
            )
    if stack > 0:
        actions.append(Action(ActionType.ALL_IN, amount=stack, is_all_in=True))
    return actions


def _raise_to_amount(amount: int, current_bet: int, contribution: int, stack: int, last_raise: int) -> None:
    min_raise = min_raise_amount(current_bet, last_raise)
    if amount < min_raise:
        raise ValueError(f"raise to {amount} below minimum {min_raise}")
    if amount > current_bet + stack:
        raise ValueError(f"raise to {amount} beyond stack reach")


def validate_action(
    action: Action,
    current_bet: int,
    contribution: int,
    stack: int,
    last_raise: int,
    big_blind: int | None = None,
) -> None:
    """Raise ValueError if the action is illegal in the given betting state."""
    to_call = amount_to_call(current_bet, contribution)
    if action.type == ActionType.FOLD:
        return
    if action.type == ActionType.CHECK:
        if to_call > 0:
            raise ValueError("cannot check when facing a bet")
        return
    if action.type == ActionType.BET:
        bb = big_blind or 0
        if current_bet > 0:
            raise ValueError("cannot bet when a bet is already present")
        if bb > 0 and action.amount is not None and action.amount < bb:
            raise ValueError("bet below big blind")
        if action.amount is not None and action.amount > stack:
            raise ValueError("bet beyond stack")
        return
    if action.type == ActionType.CALL:
        if to_call == 0:
            raise ValueError("cannot call with nothing to call")
        if to_call > stack:
            raise ValueError("call exceeds stack (use ALL_IN)")
        return
    if action.type == ActionType.RAISE:
        if action.amount is None:
            raise ValueError("raise requires an amount")
        _raise_to_amount(action.amount, current_bet, contribution, stack, last_raise)
        return
    if action.type == ActionType.ALL_IN:
        return
    raise ValueError(f"unknown action type: {action.type}")
