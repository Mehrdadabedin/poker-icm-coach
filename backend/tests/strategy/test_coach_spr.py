"""SPR is the effective stack divided by the pot (plan 086).

The coach divided the pot by the big blind instead, so the panel showed
SPR 0.8 for a 108 BB stack (the owner's screenshot, 18 Oct), and the rule
"bet with 50% equity when SPR is 3 or less" really meant "when the pot is 3
big blinds or less".
"""
from __future__ import annotations

import pytest

from app.poker.card import card_from_str
from app.strategy.coach import Coach, CoachRequest
from app.strategy.coach_analysis import analyze_request


def _request(stack: int, villain: int, pot: int, board: str = "", big_blind: int = 200) -> CoachRequest:
    cards = [card_from_str(c) for c in board.split()]
    return CoachRequest(
        hero=[card_from_str("Ah"), card_from_str("Td")], position="BTN", stack=stack,
        big_blind=big_blind, small_blind=big_blind // 2, ante=0, pot=pot, to_call=0, board=cards,
        street="flop" if cards else "preflop", players_remaining=9, paid_positions=6,
        stacks=[stack, villain] + [30_000] * 7, payout=[0.4, 0.25, 0.15, 0.1, 0.06, 0.04],
        facing_raise=False, hero_seat=0, level_index=1, mode="advanced",
    )


def test_spr_is_the_effective_stack_over_the_pot() -> None:
    assert analyze_request(_request(10_000, 20_000, 2_000)).spr == 5.0  # was 10.0, the pot in BB
    # the screenshot: 43,550 chips at 200/400 with 300 in the pot
    assert analyze_request(_request(43_550, 45_000, 300, big_blind=400)).spr == 145.2  # was 0.8


@pytest.mark.parametrize(("stack", "pot", "advice"), [
    (30_000, 600, "CHECK"),  # deep: SPR 50; the old rule bet because the pot was 3 BB
    (1_500, 1_000, "BET"),   # shallow: SPR 1.5, a medium hand bets
])
def test_a_medium_hand_bets_only_when_the_stacks_are_short_against_the_pot(
        monkeypatch: pytest.MonkeyPatch, stack: int, pot: int, advice: str) -> None:
    monkeypatch.setattr("app.strategy.coach.win_probability_for", lambda req: 0.55)
    rec = Coach().recommend(_request(stack, 30_000, pot, board="Ks 7d 2c"))
    assert rec.recommended_action == advice
