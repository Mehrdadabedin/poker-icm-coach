"""EV / outs / education helpers for the strategy coach.

These are additional analytical layers. The coach recommendation (tournament
and ICM-aware) remains authoritative; chip EV, ICM EV, outs and educational
notes are computed for the DECIDED action vs a FOLD baseline so the displayed
values always refer to the same action and comparison.
"""
from __future__ import annotations

from app.icm.icm_engine import icm_equities
from app.strategy.coach_analysis import Analyses, _cell_key, _preflop_equity


def win_prob(req) -> float:
    """Best available winning probability for this decision point."""
    if len(req.board) >= 3:
        from app.strategy.outs import winning_probability

        return winning_probability(req.hero, list(req.board)).win_prob
    return _preflop_equity(_cell_key(req.hero))


def action_risk(req, action: str, amount: int | None = None) -> int:
    """Chips at risk for the decided action (used for EV display)."""
    if action in ("RESHOVE", "OPEN JAM", "ALL-IN"):
        return req.stack
    if action == "3-BET":
        return min(3 * max(req.to_call, req.big_blind), req.stack)
    if action == "RAISE":
        if req.to_call > 0:
            return min(2 * req.big_blind + req.to_call, req.stack)
        return min(2.5 * req.big_blind, req.stack)
    if amount:
        return min(amount, req.stack)
    return req.to_call


def chip_ev_for(req, a: Analyses, action: str = "CALL",
                amount: int | None = None) -> dict | None:
    """Chip EV of the DECIDED action vs FOLD baseline."""
    if action == "FOLD":
        return {"winProb": 0.0, "loseProb": 0.0, "pot": req.pot, "toCall": 0,
                "chipEv": 0, "evClass": "NEUTRAL", "action": "FOLD",
                "chipRecommendation": "FOLD"}
    if req.to_call <= 0 and action not in ("RAISE", "3-BET", "RESHOVE", "OPEN JAM", "ALL-IN"):
        return None
    win = win_prob(req)
    risk = action_risk(req, action, amount)
    if risk <= 0:
        return None
    from app.strategy.ev import chip_ev

    return chip_ev(win_prob=float(win), pot=req.pot, to_call=risk, action=action).to_dict()


def icm_ev_for(req, a: Analyses, action: str, amount: int | None = None) -> Analyses:
    """ICM EV of the DECIDED action vs FOLD (one consistent baseline).

    Folding keeps the hero's current stack. For CALL/RAISE the hero commits
    `risk` chips: win -> +pot; lose -> bust (0) if all-in else stack - risk.
    """
    if not req.payout:
        return a
    hero = req.hero_seat
    stacks = list(req.stacks)
    try:
        hero_current = stacks[hero]
    except IndexError:
        return a
    payouts = list(req.payout)
    try:
        eq_fold = icm_equities(stacks, payouts)[hero]
    except ValueError:
        return a
    a.extra["fold_equity"] = eq_fold
    a.tournament_equity = round(eq_fold, 4)
    if action == "FOLD":
        a.icm_ev = f"FOLD (fold equity {eq_fold:.3f})"
        a.extra["icm_ev_class"] = "NEUTRAL"
        return a
    risk = action_risk(req, action, amount)
    if risk <= 0:
        return a
    win = win_prob(req)
    win_stack = hero_current + req.pot
    stacks_win = [s if i != hero else win_stack for i, s in enumerate(stacks)]
    lose_stack = 0 if risk >= hero_current else hero_current - risk
    stacks_lose = [s if i != hero else lose_stack for i, s in enumerate(stacks)]
    try:
        eq_win = icm_equities(stacks_win, payouts)[hero]
        eq_lose = icm_equities(stacks_lose, payouts)[hero]
    except ValueError:
        return a
    ev = win * eq_win + (1 - win) * eq_lose
    margin = eq_fold - ev
    label = "NEGATIVE" if margin > 0.005 else ("POSITIVE" if margin < -0.005 else "NEUTRAL")
    a.icm_ev = f"{action} vs FOLD: {label} (fold {eq_fold:.3f} vs {action.lower()} {ev:.3f})"
    a.extra["icm_ev_class"] = label
    a.extra["call_equity"] = ev
    return a


def outs_for(req) -> dict | None:
    if len(req.board) < 3:
        return None
    from app.strategy.outs import winning_probability

    return winning_probability(req.hero, list(req.board)).to_dict()


def education_for(req, a: Analyses, ev: dict | None, outs: dict | None,
                  action: str = "CALL", amount: int | None = None) -> str:
    """Concise Swayne-concepts note derived from the actual analysis."""
    from app.strategy.education import education_note

    ev = ev or chip_ev_for(req, a, action, amount)
    outs = outs or outs_for(req)
    is_exact = req.exact_cards
    win = float((outs or {}).get("winProb") or a.equity or win_prob(req))
    return education_note(
        hand_name=a.hand_name, is_exact=is_exact,
        opponents=max(1, req.players_remaining - 1),
        position=req.position, to_call=req.to_call, pot=req.pot,
        win_prob=win, outs=int((outs or {}).get("outs", 0)),
        ev_class=(ev or {}).get("evClass", "NEUTRAL"),
    )
