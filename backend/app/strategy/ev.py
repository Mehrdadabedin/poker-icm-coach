"""Chip Expected Value for a call decision (Swayne-based conceptual model).

EV = P(win) x amount-won - P(lose) x amount-invested.

For a simple call: amount won is the current pot (excluding the hero's call),
amount invested is the call. The result is an additional analytical layer:
the existing ICM/tournament recommendation remains authoritative.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ChipEV:
    win_prob: float
    lose_prob: float
    pot: int
    to_call: int
    value: float  # chips
    classification: str  # POSITIVE EV | NEGATIVE EV | NEUTRAL

    def to_dict(self) -> dict:
        return {
            "winProb": round(self.win_prob, 4),
            "loseProb": round(self.lose_prob, 4),
            "pot": self.pot,
            "toCall": self.to_call,
            "chipEv": round(self.value),
            "evClass": self.classification,
            "chipRecommendation": self.chip_recommendation(),
        }

    def chip_recommendation(self) -> str:
        if self.to_call <= 0:
            return "CHECK/BET"
        return "CALL" if self.value >= 0 else "FOLD"


def chip_ev(win_prob: float, pot: int, to_call: int) -> ChipEV:
    """EV of calling `to_call` to win `pot`.

    With no call (to_call <= 0) there is no call decision; value is computed
    as the expected share of the pot when checked down for information only.
    """
    if win_prob < 0 or win_prob > 1:
        raise ValueError("win_prob must be in [0, 1]")
    if pot < 0 or to_call < 0:
        raise ValueError("pot and to_call must be non-negative")
    if to_call <= 0:
        classification = "NEUTRAL"
        value = 0.0
    else:
        value = win_prob * pot - (1.0 - win_prob) * to_call
        classification = "POSITIVE EV" if value > 0 else ("NEGATIVE EV" if value < 0 else "NEUTRAL")
    return ChipEV(win_prob=win_prob, lose_prob=1.0 - win_prob,
                  pot=pot, to_call=to_call, value=value,
                  classification=classification)
