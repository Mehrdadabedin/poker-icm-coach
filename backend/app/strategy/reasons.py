"""The coach's sentences, each with a code and its details (plan 093).

The coach writes its reason in English, and icmbot.es shows it in Spanish. A
Reason is the English sentence, an ordinary str for every caller and test,
that also carries a code and the details it was filled with, so the app can
write the same sentence in another language from its own message files.
"""
from __future__ import annotations

TEXT: dict[str, str] = {
    "open_in": "{hand} is in the {pos} open range.",
    "open_in_steal": "{hand} is in the {pos} open range. Steal spot from late position.",
    "open_out": "{hand} is not in the {pos} open range.",
    "jam_in": "{hand} is in the {pos} jam range",
    "jam_out": "{hand} is not in the {pos} jam range",
    "premium_short": "{hand} is premium; stack {bb} BB is short.",
    "premium_value": "{hand} is premium and can raise for value.",
    "call_clears": "{hand} equity ~{eq} clears pot odds {odds}.",
    "call_below": "{hand} equity ~{eq} below required {req}.",
    "call_below_icm": "{hand} equity ~{eq} below required {req}. ICM pressure {pressure}.",
    "bet_strong": "Strong equity {eq} on {hand}.",
    "check_medium": "Medium equity {eq}, keep pot small.",
    "check_weak": "Weak equity {eq}, no value to bet.",
    "raise_beats": "Equity {eq} beats pot odds {odds}.",
    "call_about": "Equity {eq} about equal to pot odds {odds}.",
    "fold_below": "Equity {eq} below required {req}.",
    "sb_shove_in": "{hand} is in the SB shove range at {depth} BB (push/fold equilibrium, {share} of hands).",
    "sb_shove_out": "{hand} is not in the SB shove range at {depth} BB (push/fold equilibrium, {share} of hands).",
    "allin_beats_sb": "Equity {eq} against the SB shove range at {depth} BB beats the pot odds {odds}.",
    "allin_below_sb": "Equity {eq} against the SB shove range at {depth} BB is below the pot odds {odds}.",
    "allin_icm_sb": "Equity {eq} against the SB shove range at {depth} BB. "
                    "ICM: calling is worth {call} of the prize pool, folding {fold}.",
    "allin_beats_pos": "Equity {eq} against the {pos} range beats the pot odds {odds}.",
    "allin_below_pos": "Equity {eq} against the {pos} range is below the pot odds {odds}.",
    "allin_icm_pos": "Equity {eq} against the {pos} range. "
                     "ICM: calling is worth {call} of the prize pool, folding {fold}.",
    # beginner mode keeps only the first sentence
    "allin_eq_sb": "Equity {eq} against the SB shove range at {depth} BB.",
    "allin_eq_pos": "Equity {eq} against the {pos} range.",
}

FIRST_SENTENCE = {
    "open_in_steal": "open_in", "call_below_icm": "call_below",
    "allin_icm_sb": "allin_eq_sb", "allin_icm_pos": "allin_eq_pos",
}


class Reason(str):
    """An English sentence of the coach with its code and details."""

    code: str
    params: dict[str, str]

    def __new__(cls, code: str, **params: object) -> Reason:
        details = {name: str(value) for name, value in params.items()}
        sentence = super().__new__(cls, TEXT[code].format(**details))
        sentence.code = code
        sentence.params = details
        return sentence

    def __reduce_ex__(self, protocol: object) -> tuple[type[str], tuple[str]]:
        # A copy or a pickle is the plain sentence: copy.deepcopy (dataclasses.asdict,
        # when a hand is saved) rebuilt it through __new__ with the sentence as the code.
        return str, (str(self),)


def code_of(reason: str) -> tuple[str, dict[str, str]]:
    """The code and details of a reason, or nothing for a plain sentence."""
    if isinstance(reason, Reason):
        return reason.code, dict(reason.params)
    return "", {}
