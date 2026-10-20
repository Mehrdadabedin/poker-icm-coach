"""Concise concept explanations for the ICM Coach.

Educational notes are derived from the actual analysis (hand class, exact
cards, opponents, position, pot odds, EV, outs). They supplement the
recommendation; they never replace the ICM decision model. No book text.

Each note has a code and its details, like the coach's reason, so icmbot.es
writes it in Spanish (plan 093). An exact combo and a hand class are separate
codes because Spanish words the two differently.
"""
from __future__ import annotations

from app.strategy.reasons import Reason

TEXT: dict[str, str] = {
    "no_call_exact": "With exact two-card combo from {pos} vs {opponents} opponent(s), you "
                     "face no call: pot control and betting initiative matter more than "
                     "pot odds right now.",
    "no_call_class": "With {hand} starting-hand class from {pos} vs {opponents} opponent(s), you "
                     "face no call: pot control and betting initiative matter more than "
                     "pot odds right now.",
    "positive_exact": "exact two-card combo has positive chip EV against {opponents} opponent(s): "
                      "winning probability plus the pot you win outweigh the amount to call.",
    "positive_class": "{hand} starting-hand class has positive chip EV against {opponents} opponent(s): "
                      "winning probability plus the pot you win outweigh the amount to call.",
    "negative_outs": "Although there are {outs} outs / draws available, drawing "
                     "probability alone is not enough: the probability of actually winning "
                     "and the {call} call determine that this spot is negative EV.",
    "negative_some": "Although there are some outs / draws available, drawing "
                     "probability alone is not enough: the probability of actually winning "
                     "and the {call} call determine that this spot is negative EV.",
    "pot_odds_exact": "exact two-card combo from {pos} vs {opponents} opponent(s): pot odds "
                      "({pot} pot, {call} to call) and board texture shape whether "
                      "calling or folding preserves tournament equity.",
    "pot_odds_class": "{hand} starting-hand class from {pos} vs {opponents} opponent(s): pot odds "
                      "({pot} pot, {call} to call) and board texture shape whether "
                      "calling or folding preserves tournament equity.",
}


class Lesson(Reason):
    """An English teaching note with its code and details."""

    texts = TEXT


def education_note(hand_name: str, is_exact: bool, opponents: int,
                   position: str, to_call: int, pot: int,
                   win_prob: float, outs: int, ev_class: str) -> Lesson:
    """One concise, state-accurate explanation string."""
    kind = "exact" if is_exact else "class"
    hand = {} if is_exact else {"hand": hand_name}
    pos = position or "position"
    if to_call <= 0:
        return Lesson(f"no_call_{kind}", **hand, pos=pos, opponents=opponents)
    if win_prob >= 0.5 and ev_class == "POSITIVE EV":
        return Lesson(f"positive_{kind}", **hand, opponents=opponents)
    if ev_class == "NEGATIVE EV":
        if outs:
            return Lesson("negative_outs", outs=outs, call=f"{to_call:,}")
        return Lesson("negative_some", call=f"{to_call:,}")
    return Lesson(f"pot_odds_{kind}", **hand, pos=pos, opponents=opponents,
                  pot=f"{pot:,}", call=f"{to_call:,}")
