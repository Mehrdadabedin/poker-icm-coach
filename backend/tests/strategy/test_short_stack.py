"""Short-stack decisions from push/fold maths (plan 080 step B0).

Before: the small blind shoved about 20% of hands at every depth. Each test
names the old answer.
"""
from __future__ import annotations

import random

from app.poker.card import card_from_str
from app.services.game_session import GameSession
from app.services.session_coach import coach_request
from app.strategy import allin_preflop as ap
from app.strategy.coach import Coach, CoachRecommendation, CoachRequest

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


def test_the_small_blind_shoves_the_nash_range() -> None:
    advice = _sb("7s 6h", 8, 7)  # was FOLD: "76o is not in the SB jam range"
    assert advice.recommended_action == "OPEN JAM"
    assert advice.reasoning == "76o is in the SB shove range at 8 BB (Nash push/fold, 62% of hands)."


def test_a_hand_outside_the_range_folds() -> None:
    assert "32o" not in ap.shove_range(8)
    advice = _sb("3s 2h", 8, 7)
    assert (advice.recommended_action, advice.alternative_action) == ("FOLD", "OPEN JAM")


def test_a_short_big_blind_sets_the_depth() -> None:
    advice = _sb("Ks 2h", 40, 5)  # 6 BB effective: the big blind has 5 behind plus its blind
    assert advice.recommended_action == "OPEN JAM"
    assert "at 6 BB" in advice.reasoning


def test_a_limper_or_a_deep_stack_keeps_the_old_ranges() -> None:
    assert "Nash" not in _sb("7s 6h", 8, 7, 7).reasoning  # a limper is still in the hand
    assert "Nash" not in _sb("7s 6h", 15, 15).reasoning  # 15 BB is past push/fold


def test_the_live_table_lists_the_opponents_still_in_the_hand() -> None:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    req = coach_request(session)
    players = session.tournament.players
    assert sorted(req.opponents) == sorted(
        p.stack for p in players if not p.folded and not p.is_eliminated and not p.sit_out
        and p.seat != session.hero_seat)
