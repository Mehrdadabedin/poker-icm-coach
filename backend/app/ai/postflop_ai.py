"""Postflop AI: strength/draw evaluation and betting decisions.

Heuristic practice logic: made-hand strength + draws vs pot odds, board
texture, SPR and personality. Not solver-accurate.
"""
from __future__ import annotations

from app.ai.ai_framework import AIDecisionProvider
from app.ai.board_texture import BoardTexture, classify_board
from app.game.actions import Action, ActionType
from app.game.decision_provider import DecisionContext
from app.poker.card import Card
from app.poker.hand_evaluator import best_hand
from app.poker.hand_rank import HandCategory

_CATEGORY_EQUITY = {
    HandCategory.HIGH_CARD: 0.32,
    HandCategory.PAIR: 0.58,
    HandCategory.TWO_PAIR: 0.74,
    HandCategory.THREE_OF_A_KIND: 0.84,
    HandCategory.STRAIGHT: 0.88,
    HandCategory.FLUSH: 0.92,
    HandCategory.FULL_HOUSE: 0.95,
    HandCategory.FOUR_OF_A_KIND: 0.97,
    HandCategory.STRAIGHT_FLUSH: 0.99,
}


def equity_estimate(hole: list[Card], board: list[Card], _draws: list) -> float:
    """Rough win-probability estimate from category + draw bonuses."""
    hand = best_hand(hole + board)
    equity = _CATEGORY_EQUITY.get(hand.category, 0.3)
    if board:
        ranks = [c.rank.value for c in hole]
        suits = [c.suit for c in hole]
        board_ranks = {c.rank.value for c in board}
        flush_draw = any(
            len([c for c in hole + board if c.suit == s]) >= 4 for s in suits
        )
        kickers = [r for r in ranks if r not in board_ranks]
        sorted_r = sorted(set(ranks) | board_ranks, reverse=True)
        oesd = any(
            all(v in sorted_r for v in range(top, top - 4, -1)) or
            {14, 2, 3, 4, 5} <= set(sorted_r)
            for top in sorted_r
        ) and hand.category <= HandCategory.PAIR
        if flush_draw and hand.category <= HandCategory.PAIR:
            equity += 0.14
        if oesd:
            equity += 0.10
        if flush_draw and oesd:
            equity += 0.04
        if hand.category == HandCategory.HIGH_CARD and max(kickers, default=0) >= 14 and len(board) == 3:
            equity += 0.08  # overcards
    return min(0.99, equity)


def _was_aggressor(ctx: DecisionContext, seat: int) -> bool:
    return any(
        a[0] == seat and a[1] in {"bet", "raise", "all_in"} for a in ctx.action_history
    )


def postflop_strategy(
    ctx: DecisionContext,
    provider: AIDecisionProvider,
    hole_ranks: tuple[int, int],
    suited: bool,
) -> Action:
    """Choose a postflop action (framework clamps to legality)."""
    p = provider
    hole = _hole_cards(hole_ranks, suited, ctx.board)
    texture = classify_board(ctx.board)
    equity = equity_estimate(hole, ctx.board, [])
    to_call = max(0, ctx.current_bet - ctx.contribution)
    pot_odds = to_call / max(1, ctx.pot + to_call)

    if to_call == 0:
        return _no_bet_decision(ctx, p, equity, texture, hole, hole_ranks, suited)
    return _vs_bet_decision(ctx, p, equity, pot_odds, to_call)


def _hole_cards(ranks: tuple[int, int], suited: bool, board: list[Card]) -> list[Card]:
    """Build representative hole cards avoiding rank/suit collisions with the board."""
    high = max(ranks)
    low = min(ranks)
    from app.poker.card import Rank, Suit

    blocked = {(c.rank.value, c.suit) for c in board}
    suits = list(Suit)
    sa = next(s for s in suits if (high, s) not in blocked)
    if high == low:  # pair: need two distinct free suits
        sb = next(s for s in suits if s != sa and (low, s) not in blocked)
        return [Card(Rank(high), sa), Card(Rank(low), sb)]
    candidates = [s for s in suits if (low, s) not in blocked]
    sb = next(s for s in candidates if not suited or s != sa or len(candidates) == 1)
    return [Card(Rank(high), sa), Card(Rank(low), sb)]


def _no_bet_decision(ctx: DecisionContext, provider: AIDecisionProvider, equity: float,
                     texture: BoardTexture, hole: list[Card], ranks: tuple[int, int],
                     suited: bool) -> Action:
    rng = provider.rng
    pers = provider.personality
    spr = ctx.stack / max(1, ctx.pot)
    aggressor = _was_aggressor(ctx, ctx.seat)
    value = equity >= 0.7 or (equity >= 0.55 and spr <= 3)
    bluff = (equity < 0.45 and not texture.wet and max(ranks) >= 12 and rng.random() < pers.bluff * 0.5)
    if value and rng.random() < 0.4 + 0.5 * pers.aggression:
        size = int(min(ctx.stack, ctx.pot * (0.5 if spr > 6 else 0.75)))
        return Action(ActionType.BET, amount=size)
    if aggressor and ctx.street == "flop" and rng.random() < pers.aggression * 0.5 + 0.25:
        size = int(min(ctx.stack, ctx.pot * 0.6))
        return Action(ActionType.BET, amount=size)
    if bluff:
        return Action(ActionType.BET, amount=int(min(ctx.stack, ctx.pot * 0.5)))
    if equity >= 0.5 and rng.random() < 0.3:
        size = int(min(ctx.stack, ctx.pot * 0.4))
        return Action(ActionType.BET, amount=size)
    return Action(ActionType.CHECK)


def _vs_bet_decision(ctx: DecisionContext, provider: AIDecisionProvider, equity: float,
                     pot_odds: float, to_call: int) -> Action:
    rng = provider.rng
    pers = provider.personality
    margin = 0.08 + 0.05 * pers.aggression
    if equity >= 0.8 and rng.random() < pers.aggression * 0.6 + 0.3:
        size = int(min(ctx.stack, ctx.pot))
        return Action(ActionType.RAISE, amount=size)
    if equity >= pot_odds + margin or (equity >= pot_odds and rng.random() < 0.7):
        return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
    if equity >= pot_odds - 0.06 and pers.call_tendency > 0.5 and rng.random() < 0.4:
        return Action(ActionType.CALL, amount=min(to_call, ctx.stack))
    return Action(ActionType.FOLD)
