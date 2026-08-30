"""Betting-round helpers: street bet state, action application."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.game.actions import Action, ActionType, amount_to_call
from app.game.player import Player


@dataclass(slots=True)
class StreetState:
    """State of the current betting round."""

    current_bet: int = 0
    last_raise: int = 0
    last_aggressor: int | None = None
    contributions: dict[int, int] = field(default_factory=dict)

    def reset_street(self) -> None:
        self.current_bet = 0
        self.last_raise = 0
        self.last_aggressor = None

    def record_contribution(self, seat: int, amount: int) -> None:
        self.contributions[seat] = self.contributions.get(seat, 0) + amount

    def total_contributions(self) -> int:
        return sum(self.contributions.values())


def round_can_finish(
    remaining_seats: list[int],
    contributions: dict[int, int],
    current_bet: int,
    all_in_seats: set[int],
    blind_posts: set[int],
) -> bool:
    """True when betting is complete: everyone matched (or is all-in/folded).

    At least one aggressor must exist on the street (or only blinds posted
    preflop, which counts as everyone matched).
    """
    if not remaining_seats:
        return True
    for seat in remaining_seats:
        if seat in all_in_seats:
            continue
        if contributions.get(seat, 0) < current_bet:
            return False
    return True


def apply_action(street: StreetState, player: Player, action: Action, street_contrib: int) -> None:
    """Apply an already-validated action to the street state and player."""
    if action.type == ActionType.FOLD:
        player.folded = True
    elif action.type == ActionType.CHECK:
        return
    elif action.type == ActionType.CALL:
        amount = min(amount_to_call(street.current_bet, street_contrib), player.stack)
        player.commit_bet(amount)
        street.contributions[player.seat] = street_contrib + amount
    elif action.type in (ActionType.BET, ActionType.RAISE):
        amount = int(action.amount or 0)
        player.commit_bet(amount - street_contrib)
        street.last_raise = amount - street.current_bet if action.type == ActionType.RAISE else amount
        street.contributions[player.seat] = amount
        street.current_bet = amount
    elif action.type == ActionType.ALL_IN:
        new_total = street_contrib + player.stack
        player.commit_bet(player.stack)
        street.contributions[player.seat] = new_total
        if new_total > street.current_bet:
            street.last_raise = new_total - street.current_bet
            street.current_bet = new_total
    else:
        raise ValueError(f"unsupported action {action.type}")
