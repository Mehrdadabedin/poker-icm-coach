"""The coach prices decisions against the opponent's likely hands (plan 073).

It used to price them against a random hand: top pair on Qc9c8s2c beat a random
hand 74% of the time, so it said RAISE facing a turn bet, and QJo got a fixed
"~20%" facing any raise. Spots below are the ones the owner reported.
"""
from __future__ import annotations

import random

from app.equity.equity_engine import _all_cards, range_combos
from app.game.hand_result import HandAction
from app.poker.card import card_from_str as card
from app.services.game_session import GameSession
from app.services.session_coach import coach_request
from app.strategy.coach import Coach, CoachRequest
from app.strategy.hand_codec import HandCell
from app.strategy.villain_range import VillainRead, equity_vs, read_villain

SEATS = {0: "CO", 3: "UTG", 5: "BTN", 6: "SB"}


def _cards(*names: str) -> list:
    return [card(n) for n in names]


def _request(hero: list, board: list, pot: int, to_call: int, stack: int,
             villain: VillainRead | None, position: str = "CO") -> CoachRequest:
    street = {0: "preflop", 3: "flop", 4: "turn", 5: "river"}[len(board)]
    return CoachRequest(
        hero=hero, position=position, stack=stack, big_blind=100, small_blind=100, ante=0,
        pot=pot, to_call=to_call, board=board, street=street, players_remaining=9,
        paid_positions=2, stacks=[stack] + [45_000] * 8, payout=[65.0, 35.0],
        facing_raise=to_call > 100, villain=villain)


def test_pairs_are_in_a_range() -> None:
    pool = _all_cards()
    assert len(range_combos({HandCell(14, 14, None)}, pool)) == 6
    one_ace_dead = [c for c in pool if c != card("As")]
    assert len(range_combos({HandCell(14, 14, None)}, one_ace_dead)) == 3


def test_the_opponent_is_the_one_who_bet_into_the_hero() -> None:
    log = [HandAction(3, "raise", 300, "preflop"), HandAction(5, "call", 300, "preflop"),
           HandAction(0, "call", 300, "preflop"), HandAction(3, "bet", 500, "flop")]
    assert read_villain(log, 0, {0, 3, 5}, SEATS, "flop") == VillainRead(3, "UTG", "open", True)
    # once the opener folds, the caller is the one left
    assert read_villain(log, 0, {0, 5}, SEATS, "flop") == VillainRead(5, "BTN", "call", False)
    reraise = log[:1] + [HandAction(5, "raise", 900, "preflop")]
    assert read_villain(reraise, 0, {0, 3, 5}, SEATS, "preflop").preflop == "3bet"
    assert read_villain([HandAction(6, "call", 100, "preflop")], 0, {0, 6}, SEATS, "preflop").preflop == "passive"
    assert read_villain([], 0, {0}, SEATS, "preflop") is None


def test_qjo_facing_a_raise_gets_its_real_equity() -> None:
    utg = equity_vs(_cards("Qs", "Jd"), [], VillainRead(3, "UTG", "open", True), 450)
    btn = equity_vs(_cards("Qs", "Jd"), [], VillainRead(5, "BTN", "open", True), 450)
    assert utg is not None and btn is not None
    assert 0.30 <= utg < btn <= 0.55, (utg, btn)  # was a fixed 0.20 for any raise


def test_qjo_folds_to_an_utg_raise_and_calls_a_button_raise_from_the_big_blind() -> None:
    coach = Coach()
    vs_utg = coach.recommend(_request(_cards("Qs", "Jd"), [], 500, 300, 45_000,
                                      VillainRead(3, "UTG", "open", True)))
    assert vs_utg.recommended_action == "FOLD"
    assert "~20%" not in vs_utg.reasoning
    vs_btn = coach.recommend(_request(_cards("Qs", "Jd"), [], 500, 200, 45_000,
                                      VillainRead(5, "BTN", "open", True), position="BB"))
    assert vs_btn.recommended_action == "CALL", vs_btn.reasoning


def test_top_pair_and_two_pair_call_a_bet_on_a_three_club_board_instead_of_raising() -> None:
    coach = Coach()
    caller_bets = VillainRead(5, "BTN", "call", True)
    turn = _request(_cards("Js", "Qd"), _cards("Qc", "9c", "8s", "2c"), 37_240, 18_620, 41_600, caller_bets)
    river = _request(_cards("Js", "Qd"), _cards("Qc", "9c", "8s", "2c", "Jd"), 46_000, 23_000, 23_000, caller_bets)
    for spot in (turn, river):
        advice = coach.recommend(spot)
        assert advice.recommended_action == "CALL", advice.reasoning
    # against a random hand the same turn spot was a raise
    assert coach.recommend(_request(_cards("Js", "Qd"), _cards("Qc", "9c", "8s", "2c"), 37_240, 18_620,
                                    41_600, None)).recommended_action == "RAISE"


def test_the_live_table_hands_the_coach_its_opponent() -> None:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    assert session.engine is not None
    req = coach_request(session)
    others = [a for a in session.engine._log if a.seat != session.hero_seat]
    if others:
        assert req.villain is not None and req.villain.seat != session.hero_seat
    else:
        assert req.villain is None
