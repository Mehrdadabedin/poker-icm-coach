"""Dynamic strategy coach: combines all engines into one recommendation.

The coach is advisory only, it never controls the hero. Recommendations
recompute from the full request every time (no stale state).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.poker.card import Card
from app.strategy.baseline_ranges import PREMIUM_HANDS, matrix_for_position
from app.strategy.coach_analysis import (
    Analyses,
    _cell_key,
    analyze_request,
    risk_premium_for,
    win_probability_for,
)
from app.strategy.coach_detail import build_detail
from app.strategy.coach_ev import (
    action_risk,
    chip_ev_for,
    education_for,
    icm_ev_for,
    outs_for,
)
from app.strategy.push_fold import PushFoldEngine
from app.strategy.reasons import FIRST_SENTENCE, Reason, code_of
from app.strategy.short_stack import allin_call, sb_shove
from app.strategy.stack_analysis import SHORT_BB
from app.strategy.villain_range import VillainRead

LATE_POSITIONS = ("CO", "BTN", "SB")
# a raise is called mostly by the stronger part of the betting range, so being
# ahead of the pot odds is not enough to raise for value (plan 073)
RAISE_MIN_EQUITY = 0.65

@dataclass(slots=True)
class CoachRequest:
    """A single hero decision point snapshot (authoritative game state)."""

    hero: list[Card]
    position: str
    stack: int
    big_blind: int
    small_blind: int
    ante: int
    pot: int
    to_call: int
    board: list[Card]
    street: str
    players_remaining: int
    paid_positions: int
    stacks: list[int]
    payout: list[float] | None
    facing_raise: bool
    hero_seat: int = 0
    level_index: int = 1
    mode: str = "advanced"
    exact_cards: bool = False
    villain: VillainRead | None = None  # who bet into the hero, and how (plan 073)
    opponents: tuple[int, ...] = ()  # chips behind of each opponent still in the hand (plan 080)

@dataclass(slots=True)
class CoachRecommendation:
    recommended_action: str
    confidence: float
    reasoning: str
    alternative_action: str
    recommendation_detail: dict[str, str] = field(default_factory=dict)
    icm_pressure: str = "LOW"
    risk_premium: str = "LOW"
    ev: dict | None = None
    outs: dict | None = None
    education: str = ""
    street: str = ""  # the street the advice is for (plan 075)
    reason_code: str = ""  # the reasoning as a code and its details, for other languages (plan 093)
    reason_params: dict[str, str] = field(default_factory=dict)

class Coach:
    """Produces a recommendation for any hero decision point."""

    _pushfold = PushFoldEngine()

    def recommend(self, req: CoachRequest) -> CoachRecommendation:
        analyses = analyze_request(req)
        action, alt, reason = self._decide(req, analyses)
        code, details = code_of(reason)
        if req.mode == "beginner":
            reason = reason.split(".")[0] + "."
            code = FIRST_SENTENCE.get(code, code)
        # One consistent decision model: EV/ICM values are computed for the
        # DECIDED action vs a FOLD baseline, so labels and recommendation
        # always refer to the same action.
        amount = action_risk(req, action)
        analyses = icm_ev_for(req, analyses, action, amount)
        ev = chip_ev_for(req, analyses, action, amount)
        analyses.chip_ev = f"{ev['evClass']} ({ev['chipEv']:+,})" if ev else "n/a"
        rp_label, _ = risk_premium_for(req, analyses)
        detail = build_detail(req, analyses, action, alt, reason, rp_label)
        outs = outs_for(req)
        return CoachRecommendation(
            recommended_action=action, confidence=_confidence(analyses),
            reasoning=reason, alternative_action=alt,
            recommendation_detail=detail, icm_pressure=analyses.pressure,
            risk_premium=rp_label, ev=ev,
            outs=outs,
            education=education_for(req, analyses, ev, outs, action, amount),
            street=req.street, reason_code=code, reason_params=details,
        )

    def _decide(self, req: CoachRequest, a: Analyses) -> tuple[str, str, str]:
        # "complete" hands reuse preflop advice (empty board, e.g. preflop walk).
        if len(req.board) < 3:
            return self._preflop(req, a)
        return self._postflop(req, a)

    def _preflop(self, req: CoachRequest, a: Analyses) -> tuple[str, str, str]:
        short = allin_call(req, a) if req.facing_raise else sb_shove(req, a)
        if short:
            return short
        name = a.hand_name
        premium = name in PREMIUM_HANDS
        if not req.facing_raise or req.to_call == 0:
            if a.stack_bb <= SHORT_BB:
                decision = self._pushfold.decide(
                    req.hero, req.position, int(a.stack_bb),
                )
                if decision.recommendation == "OPEN JAM":
                    return "OPEN JAM", "FOLD", decision.reason
                return "FOLD", "CHECK", decision.reason
            matrix = matrix_for_position(req.position, int(a.stack_bb))
            freqs = matrix.cell_frequencies(_cell_key(req.hero))
            if freqs.get("OPEN RAISE", 0) >= 0.5:
                is_late = req.position in LATE_POSITIONS
                alt = "CHECK" if is_late else "CALL"
                return "RAISE", alt, Reason("open_in_steal" if is_late else "open_in", hand=name, pos=req.position)
            return "FOLD", "CHECK", Reason("open_out", hand=name, pos=req.position)
        # facing a raise
        if premium:
            if a.stack_bb <= 14:
                return "RESHOVE", "ALL-IN", Reason("premium_short", hand=name, bb=a.stack_bb)
            return "3-BET", "CALL", Reason("premium_value", hand=name)
        est = a.equity  # against the raiser's range when the coach can read it (plan 073)
        if est >= a.pot_odds + 0.06:
            return "CALL", "FOLD", Reason("call_clears", hand=name, eq=f"{est:.0%}", odds=f"{a.pot_odds:.0%}")
        below = {"hand": name, "eq": f"{est:.0%}", "req": f"{a.pot_odds + 0.06:.0%}"}
        if a.extra.get("icm_ev_class") == "NEGATIVE":
            return "FOLD", "CALL", Reason("call_below_icm", **below, pressure=a.pressure)
        return "FOLD", "CALL", Reason("call_below", **below)

    def _postflop(self, req: CoachRequest, a: Analyses) -> tuple[str, str, str]:
        equity = win_probability_for(req)
        a.equity = equity
        if req.to_call == 0:
            if equity >= 0.62 or (equity >= 0.5 and a.spr <= 3):
                return "BET", "CHECK", Reason("bet_strong", eq=f"{equity:.0%}", hand=a.hand_name)
            if equity >= 0.45:
                return "CHECK", "BET", Reason("check_medium", eq=f"{equity:.0%}")
            return "CHECK", "FOLD", Reason("check_weak", eq=f"{equity:.0%}")
        required = a.pot_odds + 0.08
        if equity >= max(required + 0.05, RAISE_MIN_EQUITY):
            return "RAISE", "CALL", Reason("raise_beats", eq=f"{equity:.0%}", odds=f"{a.pot_odds:.0%}")
        if equity >= required:
            return "CALL", "FOLD", Reason("call_about", eq=f"{equity:.0%}", odds=f"{a.pot_odds:.0%}")
        return "FOLD", "CALL", Reason("fold_below", eq=f"{equity:.0%}", req=f"{required:.0%}")

def _confidence(a: Analyses) -> float:
    margin = abs(a.equity - a.pot_odds) if a.pot_odds > 0 else abs(a.equity - 0.5)
    return round(min(0.95, 0.5 + margin), 2)
