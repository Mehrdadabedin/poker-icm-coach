"""Baseline strategy ranges: 13x13 matrices per position and stack depth.

BASELINE STRATEGY RANGE — heuristic practice tables shared by the AI and
the coach (not solver-exact). Mixed frequencies are representative.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.ai.preflop_ranges import open_range_for
from app.strategy.hand_codec import HandCell
from app.strategy.range_matrix import RangeMatrix, cell_key, cell_name

RANGE_TYPES = [
    "OPEN RAISE", "CALL", "3-BET", "4-BET", "3-BET JAM", "CALL 3-BET",
    "FOLD TO 3-BET", "SB OPEN", "BB DEFENSE", "BB VS BTN", "BTN VS BLINDS",
    "RESHOVE", "OPEN JAM", "CALL JAM", "FOLD TO JAM",
]


def range_types() -> list[str]:
    return list(RANGE_TYPES)


@dataclass(frozen=True, slots=True)
class _HandClass:
    premium: frozenset[str]
    strong: frozenset[str]


_PREMIUM = frozenset({"AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo"})
_STRONG = frozenset(
    {"99", "88", "AQs", "AQo", "AJs", "KQs", "KJs", "QJs", "ATs", "AJo", "KQo", "JTs"}
)


def _class_of(cell: HandCell) -> int:
    """0 = premium, 1 = strong, 2 = rest-of-range."""
    name = cell_name(cell.hi, cell.lo, cell.suited)
    if name in _PREMIUM:
        return 0
    if name in _STRONG:
        return 1
    return 2


def _open_frequencies(cell: HandCell, stack_bb: int) -> dict[str, float]:
    cls = _class_of(cell)
    if stack_bb <= 10:
        if cls == 0:
            return {"OPEN JAM": 0.8, "OPEN RAISE": 0.1, "FOLD": 0.1}
        if cls == 1:
            return {"OPEN JAM": 0.45, "OPEN RAISE": 0.3, "CALL": 0.1, "FOLD": 0.15}
        return {"OPEN JAM": 0.25, "OPEN RAISE": 0.25, "CALL": 0.2, "FOLD": 0.3}
    if cls == 0:
        return {"OPEN RAISE": 0.85, "CALL": 0.08, "FOLD": 0.07}
    if cls == 1:
        return {"OPEN RAISE": 0.65, "CALL": 0.18, "FOLD": 0.17}
    return {"OPEN RAISE": 0.5, "CALL": 0.28, "FOLD": 0.22}


def matrix_for_position(position: str, stack_bb: int) -> RangeMatrix:
    """Build the baseline open-action matrix for a position at a depth."""
    cells: dict[str, dict[str, float]] = {}
    open_cells = set(open_range_for(position, stack_bb).cells)
    for hi in range(14, 1, -1):
        for lo in range(hi, 1, -1):
            candidates = [HandCell(hi, hi, None)] if lo == hi else [
                HandCell(hi, lo, True), HandCell(hi, lo, False),
            ]
            for c in candidates:
                key = cell_key(c.hi, c.lo, c.suited)
                if c in open_cells:
                    cells[key] = _open_frequencies(c, stack_bb)
                else:
                    cells[key] = {"FOLD": 1.0}
    return RangeMatrix(position=position, stack_bb=stack_bb, cells=cells)


def baseline_action_frequencies(position: str, stack_bb: int,
                                range_type: str) -> dict[str, float]:
    """Return a representative frequency map for a named range type."""
    if range_type == "OPEN RAISE":
        return {"OPEN RAISE": 0.7, "CALL": 0.2, "FOLD": 0.1}
    if range_type == "3-BET":
        return {"3-BET": 0.6, "CALL": 0.2, "FOLD": 0.2}
    if range_type == "4-BET":
        return {"4-BET": 0.5, "3-BET JAM": 0.3, "FOLD": 0.2}
    if range_type == "OPEN JAM":
        return {"OPEN JAM": 0.75, "OPEN RAISE": 0.15, "FOLD": 0.1}
    if range_type == "CALL JAM":
        return {"CALL JAM": 0.55, "FOLD": 0.45}
    if range_type == "FOLD TO 3-BET":
        return {"FOLD TO 3-BET": 0.7, "CALL 3-BET": 0.2, "3-BET": 0.1}
    if range_type == "BB DEFENSE":
        return {"CALL": 0.5, "3-BET": 0.2, "FOLD": 0.3}
    if range_type == "SB OPEN":
        return {"OPEN RAISE": 0.6, "CALL": 0.25, "FOLD": 0.15}
    matrix = matrix_for_position(position, stack_bb)
    dominant: dict[str, float] = {}
    for freqs in matrix.cells.values():
        for action, freq in freqs.items():
            dominant[action] = dominant.get(action, 0.0) + freq
    total = sum(dominant.values()) or 1.0
    return {k: round(v / total, 4) for k, v in dominant.items()}
