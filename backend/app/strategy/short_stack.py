"""Short-stack preflop decisions from push/fold maths (plan 080 step B0).

The benchmark (plan 080 step A) found the coach folding almost every spot
near the edge: its small blind shoved about 20% of hands at every depth where
the maths shoves 58% at 10 BB, it read a small blind shove as an opening
range, it asked for pot odds plus 6% to call an all-in although no betting is
left, and ICM changed only the wording.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.icm.icm_engine import icm_equities
from app.strategy import allin_preflop as nash
from app.strategy.reasons import Reason
from app.strategy.stack_analysis import SHORT_BB
from app.strategy.villain_range import preflop_cells

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.strategy.coach import CoachRequest
    from app.strategy.coach_analysis import Analyses

Decision = tuple[str, str, str]


def _lone_opponent(req: CoachRequest) -> int | None:
    """Chips behind of the only opponent left in the hand, else None."""
    return req.opponents[0] if len(req.opponents) == 1 else None


def sb_shove(req: CoachRequest, a: Analyses) -> Decision | None:
    """Folded to the small blind: shove or fold by heads-up Nash."""
    villain = _lone_opponent(req)
    if req.position != "SB" or villain is None or req.facing_raise or req.board:
        return None
    stack = min(req.stack + req.small_blind, villain + req.big_blind) / max(req.big_blind, 1)
    if stack > SHORT_BB:
        return None
    shoves = nash.shove_range(stack)
    where = {"hand": a.hand_name, "depth": nash.depth(stack), "share": f"{nash.share(shoves):.0%}"}
    if a.hand_name in shoves:
        return "OPEN JAM", "FOLD", Reason("sb_shove_in", **where)
    return "FOLD", "OPEN JAM", Reason("sb_shove_out", **where)


def _shover_range(req: CoachRequest) -> tuple[frozenset[str], dict[str, object]]:
    """The hands the all-in player shoves, and how to name them (sb or pos)."""
    read = req.villain
    assert read is not None
    if read.position == "SB" and req.position == "BB":
        stack = min(req.to_call, req.stack) / max(req.big_blind, 1) + 1
        if stack <= nash.MAX_BB:
            return nash.shove_range(stack), {"kind": "sb", "depth": nash.depth(stack)}
    cells = preflop_cells(read, int(req.stack / max(req.big_blind, 1)))
    return frozenset(c.name() for c in cells), {"kind": "pos", "pos": read.position}


def allin_call(req: CoachRequest, a: Analyses) -> Decision | None:
    """Heads-up against an all-in: call when it pays, in chips or in ICM."""
    if _lone_opponent(req) != 0 or req.villain is None or not req.facing_raise or req.board:
        return None
    shoves, who = _shover_range(req)
    kind = who.pop("kind")
    equity = nash.equity_vs(a.hand_name, shoves)
    if equity is None:
        return None
    excess = max(0, req.to_call - req.stack)  # the part of the shove the hero cannot match
    risk = req.to_call - excess
    a.equity, a.pot_odds = equity, risk / max(1, req.pot - excess + risk)
    a.extra["win"] = equity
    call = "ALL-IN" if risk >= req.stack else "CALL"
    priced = _icm(req, equity, excess, risk)
    if priced is None:
        if equity >= a.pot_odds:
            return call, "FOLD", Reason(f"allin_beats_{kind}", **who, eq=f"{equity:.0%}", odds=f"{a.pot_odds:.0%}")
        return "FOLD", call, Reason(f"allin_below_{kind}", **who, eq=f"{equity:.0%}", odds=f"{a.pot_odds:.0%}")
    fold_eq, call_eq = priced
    a.extra.update(allin_icm=priced, fold_equity=fold_eq)
    a.tournament_equity = round(fold_eq, 4)
    total = sum(p for p in req.payout or [] if p > 0)
    icm = Reason(f"allin_icm_{kind}", **who, eq=f"{equity:.0%}", call=f"{call_eq / total:.1%}",
                 fold=f"{fold_eq / total:.1%}")
    if call_eq > fold_eq:
        return call, "FOLD", icm
    return "FOLD", call, icm


def _icm(req: CoachRequest, equity: float, excess: int, risk: int) -> tuple[float, float] | None:
    """Tournament equity of folding and of calling, or None when chips are the money
    (one place paid, so ICM equals chip EV) or the seats are unknown."""
    payout = [p for p in req.payout or [] if p > 0]
    hero, villain = req.hero_seat, req.villain.seat if req.villain else -1
    if len(payout) < 2 or not (0 <= hero < len(req.stacks) and 0 <= villain < len(req.stacks)):
        return None

    def worth(hero_gets: int, villain_gets: int) -> float:
        stacks = list(req.stacks)
        stacks[hero] += hero_gets
        stacks[villain] += villain_gets
        return icm_equities(stacks, req.payout or [])[hero]

    fold = worth(0, req.pot)
    win = worth(req.pot - excess, excess)
    lose = worth(-risk, req.pot + risk)
    return fold, equity * win + (1 - equity) * lose
