"""Hand-cell encoding shared by AI ranges and the coach range matrix.

A hand cell is (hi, lo, suited) with hi >= lo and suited in
{True (suited), False (offsuit), None (pair)}. Parses shorthand like
"22+", "A2s+", "AJo+", "KQo" used by the baseline range tables.
"""
from __future__ import annotations

from dataclasses import dataclass

RANK_CHAR = {2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9",
             10: "T", 11: "J", 12: "Q", 13: "K", 14: "A"}
CHAR_RANK = {v: k for k, v in RANK_CHAR.items()}


@dataclass(frozen=True, slots=True)
class HandCell:
    """One range cell: highest rank, lowest rank, suited flag."""

    hi: int
    lo: int
    suited: bool | None = None  # None == pair

    def __post_init__(self) -> None:
        if self.hi < self.lo:
            raise ValueError("hi < lo")

    def name(self) -> str:
        a, b = RANK_CHAR[self.hi], RANK_CHAR[self.lo]
        if self.suited is None:
            return f"{a}{b}"
        return f"{a}{b}{'s' if self.suited else 'o'}"

    def combos(self) -> int:
        if self.suited is None:
            return 6
        return 4 if self.suited else 12


def cell(hi: int, lo: int, suited: bool | None = None) -> HandCell:
    return HandCell(max(hi, lo), min(hi, lo), suited)


def _char_rank(c: str) -> int:
    try:
        return CHAR_RANK[c.upper()]
    except KeyError as exc:
        raise ValueError(f"bad rank char {c!r}") from exc


def parse_hand(text: str) -> HandCell:
    """Parse one hand token: 'AA', 'AKs', 'AKo'."""
    if len(text) == 2:
        return HandCell(_char_rank(text[0]), _char_rank(text[1]), None)
    if len(text) == 3:
        hi, lo, tag = _char_rank(text[0]), _char_rank(text[1]), text[2].lower()
        if tag == "s":
            return HandCell(hi, lo, True)
        if tag == "o":
            return HandCell(hi, lo, False)
    raise ValueError(f"bad hand token {text!r}")


def parse_shorthand(token: str) -> list[HandCell]:
    """Parse '22+', 'A2s+', 'AJo+' or a single hand into a list of cells."""
    token = token.strip()
    if token.endswith("+"):
        base = parse_hand(token[:-1])
        cells: list[HandCell] = []
        if base.suited is None:
            # pairs: 22+ -> 22, 33, ..., AA
            for rank in range(base.hi, 15):
                cells.append(HandCell(rank, rank, None))
        else:
            # suited/offsuit: A2s+ -> A2s, A3s, ..., AKs (hi fixed)
            for lo in range(base.lo, base.hi + 1):
                cells.append(HandCell(base.hi, lo, base.suited))
        return cells
    return [parse_hand(token)]


def parse_range(text: str) -> set[HandCell]:
    """Parse comma-separated shorthand into a set of cells."""
    cells: set[HandCell] = set()
    for token in text.split(","):
        token = token.strip()
        if not token:
            continue
        cells.update(parse_shorthand(token))
    return cells


def range_weight(cells: set[HandCell]) -> int:
    return sum(c.combos() for c in cells)
