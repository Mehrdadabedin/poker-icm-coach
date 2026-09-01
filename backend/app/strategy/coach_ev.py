"""EV / outs / education helpers for the strategy coach.

These are additional analytical layers. The coach recommendation (tournament
and ICM-aware) remains authoritative; chip EV, outs and educational notes are
shown alongside it so the distinction is explicit.
"""
from __future__ import annotations

from app.strategy.coach_analysis import Analyses


def win_prob(req: CoachRequest) -> float:
    """Best available winning probability for this decision point."""
    if len(req.board) >= 3:
        from app.strategy.outs import winning_probability

        return winning_probability(req.hero, list(req.board)).win_prob
    return _preflop_equity(_cell_key(req.hero))


def chip_ev_for(req: CoachRequest, a: Analyses) -> dict | None:
    """Chip EV layer (POSITIVE/NEGATIVE EV with CALL/FOLD).

    Winning probability prefers the Monte-Carlo outs report (postflop) so EV,
    outs and win-probability are consistent; preflop uses the heuristic.
    """
    if req.to_call <= 0:
        return None
    from app.strategy.outs import winning_probability

    if len(req.board) >= 3:
        win = winning_probability(req.hero, list(req.board)).win_prob
    else:
        win = win_prob(req)
    from app.strategy.ev import chip_ev

    return chip_ev(win_prob=float(win), pot=req.pot, to_call=req.to_call).to_dict()


def outs_for(req: CoachRequest) -> dict | None:
    if len(req.board) < 3:
        return None
    from app.strategy.outs import winning_probability

    return winning_probability(req.hero, list(req.board)).to_dict()


def education_for(req: CoachRequest, a: Analyses, ev: dict | None,
                  outs: dict | None) -> str:
    """Concise Swayne-concepts note derived from the actual analysis."""
    from app.strategy.education import education_note

    ev = ev or chip_ev_for(req, a)
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


def _cell_key(hero) -> str:
    from app.strategy.range_matrix import cell_name

    hi = max(hero[0].rank.value, hero[1].rank.value)
    lo = min(hero[0].rank.value, hero[1].rank.value)
    suited = None if hi == lo else hero[0].suit == hero[1].suit
    return cell_name(hi, lo, suited)


def _preflop_equity(name: str) -> float:
    """Heuristic preflop equity vs a typical raise range (mirrors coach)."""
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
