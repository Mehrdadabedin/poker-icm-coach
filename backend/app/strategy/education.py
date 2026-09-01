"""Concise Swayne-concept explanations for the ICM Coach.

Educational notes are derived from the actual analysis (hand class, exact
cards, opponents, position, pot odds, EV, outs). They supplement the
recommendation; they never replace the ICM decision model. No book text.
"""
from __future__ import annotations


def education_note(hand_name: str, is_exact: bool, opponents: int,
                   position: str, to_call: int, pot: int,
                   win_prob: float, outs: int, ev_class: str) -> str:
    """One concise, state-accurate explanation string."""
    exact_note = "exact two-card combo" if is_exact else f"{hand_name} starting-hand class"
    pos_note = f"{position}" if position else "position"
    if to_call <= 0:
        return (
            f"With {exact_note} from {pos_note} vs {opponents} opponent(s), you "
            "face no call: pot control and betting initiative matter more than "
            "pot odds right now."
        )
    if win_prob >= 0.5 and ev_class == "POSITIVE EV":
        return (
            f"{exact_note} has positive chip EV against {opponents} opponent(s): "
            "winning probability plus the pot you win outweigh the amount to call."
        )
    if ev_class == "NEGATIVE EV":
        return (
            f"Although there are {outs or 'some'} outs / draws available, drawing "
            "probability alone is not enough: the probability of actually winning "
            f"and the {to_call:,} call determine that this spot is negative EV."
        )
    return (
        f"{exact_note} from {pos_note} vs {opponents} opponent(s): pot odds "
        f"({pot:,} pot, {to_call:,} to call) and board texture shape whether "
        "calling or folding preserves tournament equity."
    )
