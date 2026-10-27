"""Short-stack decisions from push/fold maths (plan 080 step B0).

Before: the small blind shoved about 20% of hands at every depth, a small
blind shove was read as an opening range, an all-in call needed pot odds plus
6%, and ICM changed only the wording. Each test names the old answer.
"""
from __future__ import annotations

import random

from app.icm.icm_engine import icm_equities
from app.poker.card import card_from_str
from app.services.game_session import GameSession
from app.services.session_coach import coach_request
from app.strategy import allin_preflop as ap
from app.strategy.coach import Coach, CoachRecommendation, CoachRequest
from tests.benchmark.spots import _shoved_into

BB = 100


def _cards(text: str) -> list:
    return [card_from_str(c) for c in text.split()]


def _sb(cards: str, hero_bb: float, bb_behind: float, *others: float) -> CoachRecommendation:
    """Folded to the hero in the small blind; `others` are limpers still in."""
    stack = round((hero_bb - 0.5) * BB)
    opponents = (round(bb_behind * BB), *(round(o * BB) for o in others))
    return Coach().recommend(CoachRequest(
        hero=_cards(cards), position="SB", stack=stack, big_blind=BB, small_blind=BB // 2, ante=0,
        pot=BB + BB // 2 + BB * len(others), to_call=BB // 2, board=[], street="preflop",
        players_remaining=9, paid_positions=1, stacks=[stack, *opponents], payout=[1.0],
        facing_raise=False, opponents=opponents))


def _bb_vs_shove(cards: str, hero_bb: float, shove_bb: float, btn_bb: float = 0,
                 payout: list[float] | None = None) -> CoachRecommendation:
    """The small blind shoved `shove_bb` in total; the hero is the big blind."""
    stack = round((hero_bb - 1) * BB)
    stacks = [stack, round(btn_bb * BB), 0] if btn_bb else [stack, 0]
    seat = len(stacks) - 1
    return Coach().recommend(CoachRequest(
        hero=_cards(cards), position="BB", stack=stack, big_blind=BB, small_blind=BB // 2, ante=0,
        pot=round((shove_bb + 1) * BB), to_call=round((shove_bb - 1) * BB), board=[],
        street="preflop", players_remaining=len(stacks), paid_positions=len(payout or [1.0]),
        stacks=stacks, payout=payout or [1.0], facing_raise=True, opponents=(0,),
        villain=_shoved_into(shove_bb, seat, {0: "BB", seat: "SB"})))


def test_the_small_blind_shoves_the_nash_range() -> None:
    advice = _sb("7s 6h", 8, 7)  # was FOLD: "76o is not in the SB jam range"
    assert advice.recommended_action == "OPEN JAM"
    assert advice.reasoning == "76o is in the SB shove range at 8 BB (push/fold equilibrium, 62% of hands)."


def test_a_hand_outside_the_range_folds() -> None:
    assert "32o" not in ap.shove_range(8)
    advice = _sb("3s 2h", 8, 7)
    assert (advice.recommended_action, advice.alternative_action) == ("FOLD", "OPEN JAM")


def test_a_short_big_blind_sets_the_depth() -> None:
    advice = _sb("Ks 2h", 40, 5)  # 6 BB effective: the big blind has 5 behind plus its blind
    assert advice.recommended_action == "OPEN JAM"
    assert "at 6 BB" in advice.reasoning


def test_a_limper_or_a_deep_stack_keeps_the_old_ranges() -> None:
    assert "push/fold" not in _sb("7s 6h", 8, 7, 7).reasoning  # a limper is still in the hand
    assert "push/fold" not in _sb("7s 6h", 15, 15).reasoning  # 15 BB is past push/fold


def test_the_big_blind_calls_a_shove_at_the_pot_odds() -> None:
    advice = _bb_vs_shove("Ks 7h", 15, 10)  # was FOLD: the call needed pot odds plus 6%
    assert advice.recommended_action == "CALL"
    assert advice.reasoning == "Equity 48% against the SB shove range at 10 BB beats the pot odds 45%."


def test_a_call_that_puts_the_hero_all_in_says_all_in() -> None:
    # equal stacks: CALL is greyed out and ALL-IN is the button; CALL graded it SUBOPTIMAL
    assert _bb_vs_shove("Ks 7h", 10, 10).recommended_action == "ALL-IN"


def test_calling_for_the_whole_stack_is_all_in_at_the_odds_it_gets() -> None:
    # 20 BB shoved into 6: the hero risks 5 BB to win the 7 that can be matched
    advice = _bb_vs_shove("Ks 7h", 6, 20)
    assert advice.recommended_action == "ALL-IN"
    assert advice.recommendation_detail["POT ODDS"] == "42%"
    assert "SB shove range at 6 BB" in advice.reasoning


def test_the_bubble_folds_a_call_that_only_wins_chips() -> None:
    payout = [0.65, 0.35]
    advice = _bb_vs_shove("As 2h", 10, 10, btn_bb=20, payout=payout)
    assert ap.equity_vs("A2o", ap.shove_range(10)) > 9 / 20  # in chips it is a call
    assert advice.recommended_action == "FOLD"
    assert advice.reasoning == ("Equity 50% against the SB shove range at 10 BB. "
                                "ICM: calling is worth 24.9% of the prize pool, folding 25.5%.")
    # folding gives the pot to the shover; it used to vanish, as if the shover were out
    fold = icm_equities([9 * BB, 20 * BB, 11 * BB], payout)[0]
    assert advice.recommendation_detail["TOURNAMENT EQUITY"] == f"{fold:.3f}"


def test_the_live_table_lists_the_opponents_still_in_the_hand() -> None:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    req = coach_request(session)
    players = session.tournament.players
    assert sorted(req.opponents) == sorted(
        p.stack for p in players if not p.folded and not p.is_eliminated and not p.sit_out
        and p.seat != session.hero_seat)
