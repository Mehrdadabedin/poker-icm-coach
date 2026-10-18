"""Short-stack preflop decisions from push/fold maths (plan 080 step B0).

The benchmark (plan 080 step A) found the coach folding almost every spot
near the edge: its small blind shoved about 20% of hands at every depth where
the maths shoves 58% at 10 BB, it read a small blind shove as an opening
range, it asked for pot odds plus 6% to call an all-in although no betting is
left, and ICM changed only the wording.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.strategy import allin_preflop as nash
from app.strategy.stack_analysis import SHORT_BB

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
    where = f"the SB shove range at {nash.depth(stack)} BB (Nash push/fold, {nash.share(shoves):.0%} of hands)"
    if a.hand_name in shoves:
        return "OPEN JAM", "FOLD", f"{a.hand_name} is in {where}."
    return "FOLD", "OPEN JAM", f"{a.hand_name} is not in {where}."

