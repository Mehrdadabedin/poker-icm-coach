"""Dynamic strategy coach: combines all engines into one recommendation.

The coach is advisory only — it never controls the hero. Recommendations
recompute from the full request every time (no stale state).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.ai.postflop_ai import equity_estimate
from app.poker.card import Card
from app.strategy.baseline_ranges import matrix_for_position
from app.strategy.coach_analysis import Analyses, analyze_request, risk_premium_for
from app.strategy.push_fold import PushFoldEngine
from app.strategy.range_matrix import cell_name

PREMIUM = {"AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo"}


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


@dataclass(slots=True)
class CoachRecommendation:
    recommended_action: str
    confidence: float
    reasoning: str
    alternative_action: str
    recommendation_detail: dict[str, str] = field(default_factory=dict)
    icm_pressure: str = "LOW"
    risk_premium: str = "LOW"


class Coach:
    """Produces a recommendation for any hero decision point."""

    _pushfold = PushFoldEngine()

    def recommend(self, req: CoachRequest) -> CoachRecommendation:
        analyses = analyze_request(req)
        action, alt, reason = self._decide(req, analyses)
        if req.mode == "beginner":
            reason = reason.split(".")[0] + "."
        detail = _build_detail(req, analyses, action, alt, reason)
        rp_label, _label_type = risk_premium_for(req, analyses)
        return CoachRecommendation(
            recommended_action=action, confidence=_confidence(analyses),
            reasoning=reason, alternative_action=alt,
            recommendation_detail=detail, icm_pressure=analyses.pressure,
            risk_premium=rp_label,
        )

    def _decide(self, req: CoachRequest, a: Analyses) -> tuple[str, str, str]:
        if req.street == "preflop":
            return self._preflop(req, a)
        return self._postflop(req, a)

    def _preflop(self, req: CoachRequest, a: Analyses) -> tuple[str, str, str]:
        name = a.hand_name
        premium = name in PREMIUM
        if not req.facing_raise or req.to_call == 0:
            if a.stack_bb <= 10:
                decision = self._pushfold.decide(
                    req.hero, req.position, int(a.stack_bb),
                )
                if decision.recommendation == "OPEN JAM":
                    return "OPEN JAM", "FOLD", decision.reason
                return "FOLD", "CHECK", decision.reason
            matrix = matrix_for_position(req.position, int(a.stack_bb))
            freqs = matrix.cell_frequencies(_cell_key(req.hero))
            if freqs.get("OPEN RAISE", 0) >= 0.5:
                alt = "CALL"
                if req.position in ("CO", "BTN", "SB"):
                    alt = "CHECK"
                steal = " Steal spot from late position." if req.position in ("CO", "BTN", "SB") else ""
                return "RAISE", alt, f"{name} is in the {req.position} open range.{steal}"
            return "FOLD", "CHECK", f"{name} is not in the {req.position} open range."
        # facing a raise
        if premium:
            if a.stack_bb <= 14:
                return "RESHOVE", "ALL-IN", f"{name} is premium; stack {a.stack_bb} BB is short."
            return "3-BET", "CALL", f"{name} is premium and can raise for value."
        est = _preflop_equity(name)
        if est >= a.pot_odds + 0.06:
            return "CALL", "FOLD", f"{name} equity ~{est:.0%} clears pot odds {a.pot_odds:.0%}."
        icm_note = f" ICM pressure {a.pressure}." if a.icm_ev == "NEGATIVE" else ""
        return "FOLD", "CALL", f"{name} equity ~{est:.0%} below required {a.pot_odds + 0.06:.0%}.{icm_note}"

    def _postflop(self, req: CoachRequest, a: Analyses) -> tuple[str, str, str]:
        board = req.board
        hero = req.hero
        equity = equity_estimate(hero, board, [])
        a.equity = equity
        if req.to_call == 0:
            if equity >= 0.62 or (equity >= 0.5 and a.spr <= 3):
                return "BET", "CHECK", f"Strong equity {equity:.0%} on {a.hand_name}."
            if equity >= 0.45:
                return "CHECK", "BET", f"Medium equity {equity:.0%} — keep pot small."
            return "CHECK", "FOLD", f"Weak equity {equity:.0%} — no value to bet."
        required = a.pot_odds + 0.08
        if equity >= required + 0.05:
            return "RAISE", "CALL", f"Equity {equity:.0%} beats pot odds {a.pot_odds:.0%}."
        if equity >= required:
            return "CALL", "FOLD", f"Equity {equity:.0%} about equal to pot odds {a.pot_odds:.0%}."
        return "FOLD", "CALL", f"Equity {equity:.0%} below required {required:.0%}."


def _preflop_equity(name: str) -> float:
    """Heuristic preflop all-in equity vs a typical raise range."""
    if name in ("AA", "KK"):
        return 0.68
    if name in ("QQ", "JJ", "AKs"):
        return 0.55
    if name in ("TT", "AQs", "AKo", "99", "AJs"):
        return 0.47
    if name[0] == name[1]:
        return 0.42
    if name[-1] == "s" and name[0] in ("A", "K"):
        return 0.40
    if name[-1] == "s":
        return 0.35
    if name[0] in ("A", "K"):
        return 0.33
    return 0.20


def _cell_key(hero: list[Card]) -> str:
    hi = max(hero[0].rank.value, hero[1].rank.value)
    lo = min(hero[0].rank.value, hero[1].rank.value)
    suited = None if hi == lo else hero[0].suit == hero[1].suit
    return cell_name(hi, lo, suited)


def _confidence(a: Analyses) -> float:
    margin = abs(a.equity - a.pot_odds) if a.pot_odds > 0 else abs(a.equity - 0.5)
    return round(min(0.95, 0.5 + margin), 2)


def _build_detail(req: CoachRequest, a: Analyses, action: str, alt: str,
                  reason: str) -> dict[str, str]:
    detail: dict[str, str] = {
        "ACTION": action,
        "WHY": reason,
        "POSITION": req.position,
        "STACK": f"{req.stack:,} chips ({a.stack_bb} BB)",
        "EFFECTIVE STACK": f"{a.effective} chips ({a.eff_stack_bb} BB)",
        "POT ODDS": f"{a.pot_odds:.0%}",
        "ICM PRESSURE": a.pressure,
        "BUBBLE": a.stage.label if a.stage else "?",
        "STACK BAND": a.stack_band,
        "RISK PREMIUM": risk_premium_for(req, a)[0],
        "COVERAGE": a.coverage,
        "SPR": f"{a.spr}",
        "ALTERNATIVE": alt,
        "BOARD TEXTURE": _texture_label(a),
        "EST. EQUITY": f"{a.equity:.0%}",
        "CHIP EV": a.chip_ev,
        "ICM EV": a.icm_ev or "n/a",
    }
    if a.tournament_equity is not None:
        detail["TOURNAMENT EQUITY"] = f"{a.tournament_equity:.3f}"
    return detail


def _texture_label(a: Analyses) -> str:
    if a.board_texture is None:
        return "n/a"
    t = a.board_texture
    if t.paired:
        return "PAIRED"
    if t.monotone:
        return "MONOTONE"
    if t.wet:
        return "WET"
    if t.connected:
        return "CONNECTED"
    return "DRY"
