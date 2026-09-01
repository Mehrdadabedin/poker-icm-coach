"""Supporting analyses for the strategy coach (stateless helpers)."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.ai.board_texture import BoardTexture, classify_board
from app.icm.icm_engine import icm_equities
from app.strategy.bubble import PressureLevel, StageInfo, bubble_pressure, detect_stage
from app.strategy.range_matrix import cell_name
from app.strategy.risk_premium import RiskType, analyze_risk
from app.strategy.stack_analysis import classify_stack, effective_stack, snapshot_for


@dataclass(slots=True)
class Analyses:
    """Every fact the coach decisions and details rely on."""

    stack_bb: float
    eff_stack_bb: float
    pot_odds: float
    spr: float
    equity: float = 0.0
    effective: int = 0
    coverage: str = ""
    stage: StageInfo | None = None
    pressure: str = "LOW"
    stack_band: str = ""
    table: object | None = None
    hand_name: str = ""
    board_texture: BoardTexture | None = None
    chip_ev: str = "NEUTRAL"
    icm_ev: str | None = None
    tournament_equity: float | None = None
    risk_label: str = "LOW"
    risk_type: str = RiskType.HEURISTIC
    extra: dict = field(default_factory=dict)


def pot_odds(to_call: int, pot: int) -> float:
    return to_call / max(1, pot + to_call)


def _cell_key(hero) -> str:
    hi = max(hero[0].rank.value, hero[1].rank.value)
    lo = min(hero[0].rank.value, hero[1].rank.value)
    suited = None if hi == lo else hero[0].suit == hero[1].suit
    return cell_name(hi, lo, suited)


def _preflop_equity(name: str) -> float:
    """Heuristic preflop equity vs a typical raise range."""
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


def _win_probability(req) -> float:
    """Best available win probability at analysis time."""
    if len(req.board) >= 3:
        from app.ai.postflop_ai import equity_estimate

        return equity_estimate(req.hero, list(req.board), [])
    return _preflop_equity(_cell_key(req.hero))


def analyze_request(req) -> Analyses:
    """Compute all supporting numbers for a coach request."""
    bb = max(req.big_blind, 1)
    stack_bb = round(req.stack / bb, 1)
    others = [s for s in req.stacks if s != req.stack] or [req.stack]
    effective = effective_stack(req.stack, max(others))
    results = Analyses(
        stack_bb=stack_bb,
        eff_stack_bb=round(effective / bb, 1),
        pot_odds=pot_odds(req.to_call, req.pot),
        spr=round(req.pot / bb, 1),
        effective=effective,
        hand_name=cell_name(
            max(req.hero[0].rank.value, req.hero[1].rank.value),
            min(req.hero[0].rank.value, req.hero[1].rank.value),
            None if req.hero[0].rank == req.hero[1].rank else req.hero[0].suit == req.hero[1].suit,
        ),
    )
    results.coverage = (
        "YOU COVER VILLAIN" if req.stack >= effective else "VILLAIN COVERS YOU"
    )
    results.stack_band = classify_stack(stack_bb)
    try:
        results.table = snapshot_for(req.hero_seat, req.stacks, bb)
    except ValueError:
        results.table = None
    info = detect_stage(
        players_remaining=req.players_remaining,
        paid_positions=req.paid_positions,
        hero_stack_bb=stack_bb,
        average_stack_bb=(sum(req.stacks) / max(1, len(req.stacks))) / bb,
        shortest_stack_bb=min(req.stacks) / bb,
        level_index=req.level_index if hasattr(req, "level_index") else 1,
    )
    results.stage = info
    results.pressure = bubble_pressure(info).label
    if req.board:
        results.board_texture = classify_board(req.board)
    if req.payout and req.to_call > 0 and req.facing_raise:
        results = _icm_overlay(req, results)
    return results


def _icm_overlay(req, results: Analyses) -> Analyses:
    """Preliminary ICM signal (fold vs call) for the decision logic.

    The displayed ICM EV is computed decision-aware in coach_ev.icm_ev_for;
    this only sets the class and fold equity for internal use. Folding keeps
    the hero's current stack (correct baseline).
    """
    hero = req.hero_seat
    stacks = list(req.stacks)
    try:
        hero_current = stacks[hero]
    except IndexError:
        return results
    payouts = list(req.payout)
    if not payouts:
        return results
    try:
        eq_fold = icm_equities(stacks, payouts)[hero]
    except ValueError:
        return results
    results.extra["fold_equity"] = eq_fold
    results.tournament_equity = round(eq_fold, 4)
    risk = min(req.to_call, hero_current)
    if risk <= 0:
        return results
    win_stack = hero_current + req.pot
    stacks_win = [s if i != hero else win_stack for i, s in enumerate(stacks)]
    lose_stack = 0 if risk >= hero_current else hero_current - risk
    stacks_lose = [s if i != hero else lose_stack for i, s in enumerate(stacks)]
    try:
        eq_win = icm_equities(stacks_win, payouts)[hero]
        eq_lose = icm_equities(stacks_lose, payouts)[hero]
    except ValueError:
        return results
    win = _win_probability(req)
    ev = win * eq_win + (1 - win) * eq_lose
    margin = eq_fold - ev
    results.extra["icm_ev_class"] = (
        "NEGATIVE" if margin > 0.005 else ("POSITIVE" if margin < -0.005 else "NEUTRAL")
    )
    results.extra["call_equity"] = ev
    return results


def risk_premium_for(req, results: Analyses) -> tuple[str, str]:
    """Pressure-driven risk premium (heuristic unless ICM EV present)."""
    pressure = PressureLevel[results.pressure.replace(" ", "_")]
    rp = analyze_risk(
        pressure=pressure, pot_odds=results.pot_odds,
        hero_stack=req.stack, villain_stack=max([s for s in req.stacks if s != req.stack] or [req.stack]),
        bubble_distance=max(0, req.players_remaining - req.paid_positions),
        fold_equity=results.extra.get("fold_equity"),
        call_equity=None,
    )
    return rp.label, rp.type.value
