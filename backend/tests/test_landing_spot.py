"""A47 — pin the landing-page "TRY ONE SPOT" coach answer.

The public landing page shows one real tournament spot and reveals what the
backend coach/ICM engine recommends for it. The landing copy is written from
THIS engine output, never a guess, so these assertions are the source of truth
for frontend/src/landing/LandingQuiz.tsx.
"""
from __future__ import annotations

from app.poker.card import card_from_str as H
from app.strategy.coach import Coach, CoachRequest

PAYOUT = [0.4, 0.25, 0.15, 0.1, 0.06, 0.04]


def quiz_request() -> CoachRequest:
    """The exact A47 spot: A♥Q♠ in the big blind, 25 BB blinds, 18 BB left
    (450 chips), 17 BB paid into the pot (425), the chip leader shoved from
    the SB (to_call 400, facing a raise), two short stacks under 5 BB
    elsewhere (120 and 100 chips)."""
    return CoachRequest(
        hero=[H("Ah"), H("Qs")],
        position="BB",
        stack=450,
        big_blind=25,
        small_blind=12,
        ante=0,
        pot=425,
        to_call=400,
        board=[],
        street="preflop",
        players_remaining=9,
        paid_positions=6,
        stacks=[450, 425, 425, 425, 120, 100, 425, 425, 425],
        payout=list(PAYOUT),
        facing_raise=True,
        hero_seat=0,
        level_index=1,
        mode="advanced",
    )


def test_landing_quiz_spot_pins_the_coach_fold() -> None:
    """The question, the recommendation and the kept reasoning string."""
    rec = Coach().recommend(quiz_request())
    assert rec.recommended_action == "FOLD"
    assert rec.alternative_action == "CALL"
    assert round(rec.confidence, 2) == 0.65
    assert rec.reasoning == (
        "AQo equity ~33% below required 54%. ICM pressure MEDIUM."
    )
    assert rec.icm_pressure == "MEDIUM"
    assert rec.risk_premium == "MEDIUM"


def test_landing_quiz_spot_detail_matches_the_landing_copy() -> None:
    """Every number the quiz card prints comes from this detail dict."""
    rec = Coach().recommend(quiz_request())
    detail = rec.recommendation_detail
    assert detail["STACK"] == "450 chips (18.0 BB)"
    assert detail["EFFECTIVE STACK"] == "425 chips (17.0 BB)"
    assert detail["POT ODDS"] == "48%"
    assert detail["EST. EQUITY"] == "33%"
    assert detail["ICM PRESSURE"] == "MEDIUM"
    assert detail["ICM EV"].startswith("FOLD")
    assert detail["SPR"] == "17.0"
    assert rec.education == (
        "AQo starting-hand class from BB vs 8 opponent(s): pot odds "
        "(425 pot, 400 to call) and board texture shape whether calling or "
        "folding preserves tournament equity."
    )
