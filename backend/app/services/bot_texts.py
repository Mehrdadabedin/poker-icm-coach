"""The bots' decisions in the hand review, each with a code and its details (plan 093).

As in strategy/reasons.py: the review keeps the English sentence and sends its
code and details next to it, so icmbot.es writes it in Spanish from its own
message files.
"""
from __future__ import annotations

DECISION: dict[str, str] = {
    "fold": "Folding {hand} - {eq} equity is below the {odds} pot odds needed "
            "from {pos} under {pressure} ICM pressure.",
    "call_profitable": "Calling with {hand} - {eq} equity vs {odds} pot odds "
                       "from {pos}; ICM pressure {pressure} (profitable).",
    "call_marginal": "Calling with {hand} - {eq} equity vs {odds} pot odds "
                     "from {pos}; ICM pressure {pressure} (marginal).",
    "bet": "Betting {hand} from {pos} - {eq} equity, {bb} BB behind, pot odds {odds}.",
    "check": "Checking {hand} from {pos} - {eq} equity, {bb} BB behind.",
    "all_in": "All-in with {hand} for {bb} BB - {eq} equity at {pressure} ICM pressure.",
}

FACED: dict[str, str] = {
    "unopened": "Unopened",
    "no_bet": "No bet",
    "raise_to": "Raise to {amount}",
    "big_blind": "Big blind {amount}",
    "bet": "Bet {amount}",
}


def coded(table: dict[str, str], code: str, **params: object) -> dict[str, object]:
    """The English text with its code and details, as the review sends them."""
    details = {name: str(value) for name, value in params.items()}
    return {"text": table[code].format(**details), "code": code, "params": details}
