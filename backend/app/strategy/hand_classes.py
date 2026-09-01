"""The 169 standard Hold'em starting-hand classes plus a representative combo.

Two-card combinations (exact cards) are handled by the consumer; the class
list gives every suited/offsuit/pair cell with suits chosen so the combo is
unique per class. No book text: this is the standard combinatorial table.
"""
from __future__ import annotations

_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]
_RANK_ORDER = {r: i for i, r in enumerate(_RANKS)}


def _pair(name: str) -> list[dict]:
    return [
        {"name": f"{name}{name}",
         "cards": [{"rank": name, "suit": "s"}, {"rank": name, "suit": "h"}]}
    ]


def _two(hi: str, lo: str) -> list[dict]:
    suited = {"name": f"{hi}{lo}s",
              "cards": [{"rank": hi, "suit": "s"}, {"rank": lo, "suit": "s"}]}
    offsuit = {"name": f"{hi}{lo}o",
               "cards": [{"rank": hi, "suit": "s"}, {"rank": lo, "suit": "d"}]}
    return [suited, offsuit]


def all_starting_hands() -> list[dict]:
    """Return the 169 classes in standard order: pairs, suited, offsuit."""
    hands: list[dict] = []
    for r in _RANKS:
        hands += _pair(r)
    for hi in _RANKS:
        for lo in _RANKS:
            if _RANK_ORDER[lo] <= _RANK_ORDER[hi]:
                continue
            hands += _two(hi, lo)
    return hands
