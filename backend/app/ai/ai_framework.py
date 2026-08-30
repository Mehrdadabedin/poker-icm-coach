"""Computer AI framework: pluggable strategy + legality guarantee.

Strategy functions receive only the DecisionContext (own cards, visible
board, pot, bets, stacks, position, personality, action history) and never
gain access to hidden cards or future streets. Every returned action is
clamped to the legal action set.
"""
from __future__ import annotations

import random
from collections.abc import Callable

from app.ai.personalities import PersonalityProfile, tight_passive_profile
from app.game.actions import Action, ActionType
from app.game.decision_provider import DecisionContext

StrategyFn = Callable[[DecisionContext, "AIDecisionProvider"], Action]


class AIDecisionProvider:
    """Decision provider used by the hand engine for computer seats."""

    def __init__(
        self,
        rng: random.Random | None = None,
        strategy: StrategyFn | None = None,
        personality: PersonalityProfile | None = None,
    ) -> None:
        self.rng = rng if rng is not None else random.Random()
        self.strategy = strategy if strategy is not None else self._fallback_strategy
        self.personality = personality if personality is not None else tight_passive_profile()

    def decide(self, ctx: DecisionContext) -> Action:
        suggested = self.strategy(ctx, self)
        return clamp_to_legal(suggested, ctx.legal_actions, ctx, self.rng)

    def _fallback_strategy(self, ctx: DecisionContext, provider: AIDecisionProvider) -> Action:
        """Conservative default used until pre/postflop AI override it."""
        to_call = max(0, ctx.current_bet - ctx.contribution)
        if to_call == 0:
            return Action(ActionType.CHECK)
        if to_call >= ctx.stack:
            return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
        return Action(ActionType.CALL, amount=to_call)


def clamp_to_legal(
    suggested: Action,
    legal: list[Action],
    ctx: DecisionContext,
    rng: random.Random,
) -> Action:
    """Return a legal action closest to the suggestion (used by all AI)."""
    kinds = {a.type for a in legal}
    if suggested.type in kinds:
        if suggested.type == ActionType.RAISE or suggested.type == ActionType.BET:
            meta = next(a for a in legal if a.type == suggested.type)
            low = max(meta.min_amount or 0, suggested.amount or 0)
            high = meta.max_amount or ctx.stack
            if high < low:
                return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
            amount = min(max(suggested.amount or low, low), high)
            return Action(suggested.type, amount=amount, min_amount=meta.min_amount, max_amount=meta.max_amount)
        return suggested
    if ActionType.CHECK in kinds and ctx.current_bet <= ctx.contribution:
        return Action(ActionType.CHECK)
    if ActionType.CALL in kinds:
        to_call = max(0, ctx.current_bet - ctx.contribution)
        return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
    if ActionType.FOLD in kinds:
        return Action(ActionType.FOLD)
    return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)


def decide_for_seat(engine, seat: int) -> Action:
    """Pure decision query: build context, ask provider, no engine mutation."""
    provider = engine.provider
    ctx = engine._build_context(seat)
    return provider.decide(ctx)
