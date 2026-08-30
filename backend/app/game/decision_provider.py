"""Decision provider protocol: the hook where computer AI plugs in.

Phase 1 ships a deterministic scripted provider and a simple default bot.
Phase 2 (parts 17-21) replaces the default bot with the real poker AI.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from app.game.actions import Action, ActionType
from app.poker.card import Card


@dataclass(slots=True)
class DecisionContext:
    """Everything a computer player may legally know at a decision point.

    Deliberately does NOT include other players' hole cards or future
    community cards.
    """

    seat: int
    hole_cards: list[Card]
    board: list[Card]
    street: str
    pot: int
    current_bet: int
    contribution: int
    stack: int
    big_blind: int
    legal_actions: list[Action]
    position: str = ""
    action_history: list[tuple[int, str, int | None]] = field(default_factory=list)


class DecisionProvider(Protocol):
    def decide(self, ctx: DecisionContext) -> Action:
        """Return a legal action for the given context."""
        ...


class ScriptedProvider:
    """Deterministic action script for tests: seat -> [actions...]."""

    def __init__(self, script: dict[int, list[Action]]) -> None:
        self._script = script
        self._calls: dict[int, int] = {}

    def decide(self, ctx: DecisionContext) -> Action:
        seat_calls = self._calls.get(ctx.seat, 0)
        actions = self._script[ctx.seat]
        if seat_calls >= len(actions):
            return Action(ActionType.CHECK if not ctx.current_bet else ActionType.FOLD)
        action = actions[seat_calls]
        self._calls[ctx.seat] = seat_calls + 1
        return action


class DefaultBot:
    """Ultra-simple phase-1 bot: call any bet it can afford, else fold.

    Replaced by the real AI framework in part 017.
    """

    def decide(self, ctx: DecisionContext) -> Action:
        from app.game.actions import Action, amount_to_call

        to_call = amount_to_call(ctx.current_bet, ctx.contribution)
        if to_call == 0:
            return Action(ActionType.CHECK)
        if to_call >= ctx.stack and ctx.stack > 0:
            return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
        if to_call < ctx.stack:
            return Action(ActionType.CALL, amount=to_call)
        return Action(ActionType.FOLD)
