"""Preflop AI: position-and-depth-aware opening and raise responses.

Uses BASELINE STRATEGY RANGES (heuristic, not solver-exact) blended with
each bot's personality tendencies. Every returned action is clamped to
legality by the AI framework.
"""
from __future__ import annotations

from app.ai.ai_framework import AIDecisionProvider
from app.ai.preflop_ranges import open_range_for
from app.game.actions import Action, ActionType
from app.game.decision_provider import DecisionContext
from app.strategy.hand_codec import HandCell


def _open_frequency(cell: HandCell, provider: AIDecisionProvider) -> float:
    """How eagerly this hand is raised vs checked/called when opening."""
    pers = provider.personality
    if cell.suited is None and cell.lo >= 10:  # TT+
        return min(0.95, pers.pfr * 2.5 + 0.35)
    if cell.hi == 14 and cell.lo >= 11:
        return min(0.95, pers.pfr * 2.0 + 0.30)
    if cell.hi >= 13 and cell.lo >= 11:
        return min(0.9, pers.pfr * 1.6 + 0.20)
    return min(0.8, pers.pfr * 1.2 + 0.10)


def _raiseable(cell: HandCell) -> bool:
    """Top-of-range hands worth 3-betting / jamming."""
    if cell.suited is None:
        return cell.lo >= 10
    if cell.hi == 14 and cell.lo >= 11:
        return True
    return cell.hi >= 13 and cell.lo >= 12


def preflop_strategy(
    ctx: DecisionContext,
    provider: AIDecisionProvider,
    hole_ranks: tuple[int, int],
    suited: bool,
) -> Action:
    """Choose a preflop action for the bot (caller clamps to legality)."""
    bb = max(ctx.big_blind, 1)
    depth_bb = ctx.stack / bb
    cell = HandCell(max(hole_ranks), min(hole_ranks),
                    None if hole_ranks[0] == hole_ranks[1] else suited)
    open_set = open_range_for(ctx.position, int(depth_bb)).cells
    to_call = max(0, ctx.current_bet - ctx.contribution)
    is_unopened = ctx.current_bet == 0 or (
        ctx.position == "BB" and ctx.current_bet == bb and ctx.contribution == bb
    )

    if is_unopened:
        return _open(ctx, provider, cell, open_set, depth_bb, bb)
    return _vs_raise(ctx, provider, cell, open_set, depth_bb, bb, to_call)


def _open(ctx: DecisionContext, provider: AIDecisionProvider, cell: HandCell,
          open_set: frozenset[HandCell], depth_bb: float, bb: int) -> Action:
    rng = provider.rng
    pers = provider.personality
    if cell not in open_set:
        # big blind option: check instead of folding
        if ctx.position == "BB" and ctx.contribution == bb:
            return Action(ActionType.CHECK)
        return Action(ActionType.FOLD)
    if depth_bb <= 8 and rng.random() < 0.85:
        return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
    freq = _open_frequency(cell, provider) * (0.8 + 0.4 * pers.aggression)
    if rng.random() < freq:
        size = 2.5 * bb if depth_bb > 25 else 2.2 * bb
        if depth_bb <= 12:
            return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
        return Action(ActionType.RAISE, amount=int(min(size, ctx.stack)))
    if ctx.position == "BB" and ctx.contribution == bb:
        return Action(ActionType.CHECK)
    return Action(ActionType.CALL, amount=min(ctx.current_bet - ctx.contribution, ctx.stack))


def _vs_raise(ctx: DecisionContext, provider: AIDecisionProvider, cell: HandCell,
              open_set: frozenset[HandCell], depth_bb: float, bb: int, to_call: int) -> Action:
    rng = provider.rng
    pers = provider.personality
    pot_odds = to_call / max(1, ctx.pot + to_call)
    if depth_bb <= 10:
        if (cell in open_set and _raiseable(cell)) and rng.random() < 0.75:
            return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
        if cell in open_set and rng.random() < 0.5 + 0.3 * pers.call_tendency:
            return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
        if pot_odds > 0.30 and cell.hi >= 12 and rng.random() < 0.4:
            return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
        return Action(ActionType.FOLD)
    if _raiseable(cell) and cell in open_set and rng.random() < pers.three_bet * 2.2:
        size = 3 * max(ctx.current_bet, bb)
        if depth_bb <= 14:
            return Action(ActionType.ALL_IN, amount=ctx.stack, is_all_in=True)
        return Action(ActionType.RAISE, amount=int(min(size, ctx.stack)))
    est_equity = 0.42 if _raiseable(cell) else (0.34 if cell in open_set else 0.22)
    if cell in open_set and (est_equity >= pot_odds or rng.random() < 0.25 * pers.call_tendency):
        return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
    if est_equity >= pot_odds + 0.12 and rng.random() < 0.5 * pers.call_tendency:
        return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
    return Action(ActionType.FOLD)


def range_for_position(ctx: DecisionContext, provider: AIDecisionProvider) -> set[HandCell]:
    """Expose the effective opening range (used by stats/coach)."""
    depth_bb = ctx.stack / max(ctx.big_blind, 1)
    return set(open_range_for(ctx.position, int(depth_bb)).cells)
