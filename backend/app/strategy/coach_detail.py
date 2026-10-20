"""The coach panel's factor rows (moved out of coach.py, plan 093)."""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.strategy.coach import CoachRequest
    from app.strategy.coach_analysis import Analyses


def build_detail(req: CoachRequest, a: Analyses, action: str, alt: str,
                  reason: str, rp_label: str) -> dict[str, str]:
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
        "RISK PREMIUM": rp_label,
        "COVERAGE": a.coverage,
        "SPR": f"{a.spr}",
        "ALTERNATIVE": alt,
        "BOARD TEXTURE": texture_label(a),
        "EST. EQUITY": f"{a.equity:.0%}",
        "CHIP EV": a.chip_ev,
        "ICM EV": a.icm_ev or "n/a",
    }
    if a.tournament_equity is not None:
        detail["TOURNAMENT EQUITY"] = f"{a.tournament_equity:.3f}"
    return detail

def texture_label(a: Analyses) -> str:
    if a.board_texture is None:
        return "n/a"
    t = a.board_texture
    for label, flag in (("PAIRED", t.paired), ("MONOTONE", t.monotone),
                        ("WET", t.wet), ("CONNECTED", t.connected)):
        if flag:
            return label
    return "DRY"
