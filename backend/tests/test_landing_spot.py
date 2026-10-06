"""A47 — pin the landing-page "TRY ONE SPOT" coach answer (v2 bubble spot).

The public landing page shows one real tournament spot and reveals what the
backend coach/ICM engine recommends for it. The landing copy is written from
THIS engine output, never a guess, so these assertions are the source of truth
for frontend/src/landing/LandingQuiz.tsx.

Spot (v2): 4 players left, 3 paid — the engine's own BUBBLE stage — payouts
50/30/20, hero KJo (K♠ J♥) 14 BB in the big blind, the chip leader (40 BB)
shoved from the SB, one short stack at 3 BB and one other player at 18 BB.
"""
from __future__ import annotations

from app.poker.card import card_from_str as H
from app.strategy.coach import Coach, CoachRequest

PAYOUT = [0.5, 0.3, 0.2]


def quiz_request() -> CoachRequest:
    """The exact A47 v2 spot: 4 left / 3 paid, hero KJo 14 BB in the BB,
    chip leader (40 BB) shoved from the SB (to_call 12 BB, facing a raise),
    short stack at 3 BB, on the engine's BUBBLE stage."""
    return CoachRequest(
        hero=[H("Ks"), H("Jh")],
        position="BB",
        stack=1400,
        big_blind=100,
        small_blind=100,
        ante=0,
        pot=2400,
        to_call=1200,
        board=[],
        street="preflop",
        players_remaining=4,
        paid_positions=3,
        stacks=[1400, 4000, 1800, 300],
        payout=list(PAYOUT),
        facing_raise=True,
        hero_seat=0,
        level_index=1,
        mode="advanced",
    )


def test_landing_quiz_spot_is_a_real_bubble_fold() -> None:
    """The question, the recommendation and the ICM reason (v2)."""
    rec = Coach().recommend(quiz_request())
    assert rec.recommended_action == "FOLD"
    assert rec.alternative_action == "CALL"
    assert round(rec.confidence, 2) == 0.5
    # The pressure note is appended only when the call is ICM-negative, so it
    # is the engine's own proof that the ICM reason drives the fold.
    assert rec.reasoning == (
        "KJo equity ~33% below required 39%. ICM pressure VERY HIGH."
    )
    assert rec.icm_pressure == "VERY HIGH"
    assert rec.risk_premium == "HIGH"
    assert rec.recommendation_detail["BUBBLE"] == "BUBBLE"
    assert rec.recommendation_detail["STACK BAND"] == "MEDIUM STACK"


def test_landing_quiz_spot_detail_matches_the_landing_copy() -> None:
    """Every number the quiz card prints comes from this detail dict."""
    rec = Coach().recommend(quiz_request())
    detail = rec.recommendation_detail
    assert detail["STACK"] == "1,400 chips (14.0 BB)"
    assert detail["ICM PRESSURE"] == "VERY HIGH"
    assert detail["RISK PREMIUM"] == "HIGH"
    assert detail["SPR"] == "24.0"
    assert detail["ICM EV"].startswith("FOLD")
    assert rec.education == (
        "KJo starting-hand class from BB vs 3 opponent(s): pot odds "
        "(2,400 pot, 1,200 to call) and board texture shape whether calling "
        "or folding preserves tournament equity."
    )
