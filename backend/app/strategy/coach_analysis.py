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
    """ICM EV of calling an all-in when payouts are known."""
    hero = req.hero_seat
    stacks = list(req.stacks)
    try:
        hero_current = stacks[hero]
    except IndexError:
        return results
    payouts = list(req.payout)
    # fold equity: hero keeps stack - to_call
    fold_stack = hero_current - req.to_call
    if fold_stack < 0:
        return results
    stacks_fold = [s if i != hero else fold_stack for i, s in enumerate(stacks)]
    try:
        eq_fold = icm_equities(stacks_fold, payouts)[hero]
        # call: win -> hero takes villain stack + pot; lose -> bust (0 left)
        win_stack = hero_current + req.pot
        stacks_win = [s if i != hero else win_stack for i, s in enumerate(stacks)]
        # simplify: villain's stack absorbed; renormalize table
        eq_win = icm_equities(stacks_win, payouts)[hero]
        results.tournament_equity = round(eq_fold, 4)
        margin = eq_fold - (results.equity * eq_win)
        results.icm_ev = "NEGATIVE" if margin > 0.005 else ("POSITIVE" if margin < -0.005 else "NEUTRAL")
        results.icm_ev = f"{results.icm_ev} (fold {eq_fold:.3f} vs call ~{results.equity * eq_win:.3f})"
        results.extra["fold_equity"] = eq_fold
        results.extra["win_equity"] = eq_win
    except ValueError:
        return results
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
