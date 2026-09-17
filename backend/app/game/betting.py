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
    # Seats that have acted since the last full raise. A player in this set has
    # already had their say at the current level, so an all-in that raises by
    # less than a full raise does not give them the right to raise again
    # (TDA rules 45 and 49). It is cleared by every full bet or raise.
    acted_since_full_raise: set[int] = field(default_factory=set)

    def reset_street(self) -> None:
        self.current_bet = 0
        self.last_raise = 0
        self.last_aggressor = None
        self.acted_since_full_raise = set()

    def full_increment(self, big_blind: int) -> int:
        """The smallest raise increment that counts as a full raise.

        Never below the big blind: on a fresh street last_raise is 0, and
        treating any increment as full let an all-in for 80 into a 200 blind
        reopen the betting and become the new minimum."""
        return max(self.last_raise, big_blind)

    def may_raise(self, seat: int, big_blind: int) -> bool:
        """Whether the seat may still raise.

        Acting closes the right, and an all-in short of a full raise does not
        give it back (TDA rules 45 and 49). Short all-ins do add up though: once
        what the seat owes since it last acted reaches a full raise, the betting
        is reopened for it (TDA rule 47)."""
        if seat not in self.acted_since_full_raise:
            return True
        owed = self.current_bet - self.contributions.get(seat, 0)
        return owed >= self.full_increment(big_blind)

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


def apply_action(street: StreetState, player: Player, action: Action, street_contrib: int,
                 big_blind: int = 0) -> bool:
    """Apply an already-validated action to the street state and player.

    Returns whether this was a full bet or raise, i.e. one that reopens the
    betting for players who have already acted (TDA rules 45, 47, 49). Only
    meaningful when the action raised street.current_bet; callers that care
    check that first.
    """
    # Recorded before the branches because CHECK returns early, and because a
    # full bet or raise below replaces the set outright.
    street.acted_since_full_raise.add(player.seat)
    if action.type == ActionType.FOLD:
        player.folded = True
        return False
    elif action.type == ActionType.CHECK:
        return False
    elif action.type == ActionType.CALL:
        amount = min(amount_to_call(street.current_bet, street_contrib), player.stack)
        player.commit_bet(amount)
        street.contributions[player.seat] = street_contrib + amount
        return False
    elif action.type in (ActionType.BET, ActionType.RAISE):
        amount = int(action.amount or 0)
        player.commit_bet(amount - street_contrib)
        street.last_raise = amount - street.current_bet if action.type == ActionType.RAISE else amount
        street.contributions[player.seat] = amount
        street.current_bet = amount
        street.acted_since_full_raise = {player.seat}  # a full raise reopens
        return True
    elif action.type == ActionType.ALL_IN:
        new_total = street_contrib + player.stack
        player.commit_bet(player.stack)
        street.contributions[player.seat] = new_total
        if new_total > street.current_bet:
            increment = new_total - street.current_bet
            street.current_bet = new_total
            if increment >= street.full_increment(big_blind):
                # A full raise. It reopens the betting and sets the new minimum.
                street.last_raise = increment
                street.acted_since_full_raise = {player.seat}
                return True
            # Short of a full raise. It takes the bet up, but it must not
            # shrink the minimum raise for whoever acts after it, and it does
            # not reopen the betting for anyone who has already acted (the
            # seat was already added to acted_since_full_raise above).
            return False
        return False
    else:
        raise ValueError(f"unsupported action {action.type}")
