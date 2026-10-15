"""Benchmark spots as the live coach sees them (plan 080).

A spot is a JSON object: category, hand, cards, stacks in big blinds, the
correct action from the maths, and how much the wrong choice costs (gap).
`request_for` builds the CoachRequest a real table would send for it, the
way `session_coach.coach_request` does, so the benchmark measures the coach
exactly as players meet it.
"""
from __future__ import annotations

from typing import Any

from app.game.hand_result import HandAction
from app.poker.card import card_from_str
from app.strategy.coach import CoachRequest
from app.strategy.villain_range import read_villain

BB = 100
NINE_HANDED_PAYOUT = [0.4, 0.25, 0.15, 0.1, 0.06, 0.04]
BUBBLE_PAYOUT = [0.65, 0.35]  # three players left, two paid
PLAYS = {"OPEN JAM", "RESHOVE", "ALL-IN", "RAISE", "3-BET", "CALL", "CALL JAM", "OPEN RAISE"}


def played(action: str) -> bool:
    """The coach put chips in (shove, call or raise) rather than folding."""
    return action in PLAYS


def _shoved_into(stack_bb: float, villain_seat: int, positions: dict[int, str]) -> Any:
    log = [HandAction(villain_seat, "all_in", round(stack_bb * BB), "preflop")]
    return read_villain(log, 0, {0, villain_seat}, positions, "preflop")


def request_for(spot: dict[str, Any]) -> CoachRequest:
    cards = [card_from_str(c) for c in spot["cards"]]
    stacks = spot["stacks"]
    base = {"hero": cards, "big_blind": BB, "small_blind": BB // 2, "ante": 0, "board": [],
            "street": "preflop", "hero_seat": 0}
    if spot["category"] == "sb_shove":
        s = stacks[0]
        table = [round((s - 0.5) * BB), round((s - 1) * BB)] + [s * BB] * 7
        return CoachRequest(**base, position="SB", stack=table[0], pot=BB + BB // 2, to_call=BB // 2,
                            players_remaining=9, paid_positions=6, stacks=table,
                            payout=NINE_HANDED_PAYOUT, facing_raise=False)
    if spot["category"] == "bb_call":
        s = stacks[0]
        table = [round((s - 1) * BB)] + [s * BB] * 7 + [0]
        return CoachRequest(**base, position="BB", stack=table[0], pot=(s + 1) * BB, to_call=(s - 1) * BB,
                            players_remaining=9, paid_positions=6, stacks=table, payout=NINE_HANDED_PAYOUT,
                            facing_raise=True, villain=_shoved_into(s, 8, {0: "BB", 8: "SB"}))
    btn, sb, bb = stacks  # bubble_call: button folded, small blind shoved
    table = [round((bb - 1) * BB), round(btn * BB), 0]
    return CoachRequest(**base, position="BB", stack=table[0], pot=round((sb + 1) * BB),
                        to_call=round((min(sb, bb) - 1) * BB), players_remaining=3, paid_positions=2,
                        stacks=table, payout=BUBBLE_PAYOUT, facing_raise=True,
                        villain=_shoved_into(sb, 2, {0: "BB", 1: "BTN", 2: "SB"}))
