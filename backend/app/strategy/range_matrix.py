"""13x13 poker hand matrix: pairs, suited, offsuit cells with mixed action frequency."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.strategy.hand_codec import HAND_RANK_CHARS

RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]


def matrix_size() -> int:
    return 13


def cell_name(hi: int, lo: int, suited: bool | None) -> str:
    high = HAND_RANK_CHARS[hi]
    low = HAND_RANK_CHARS[lo]
    if suited is None:
        return f"{high}{low}"
    return f"{high}{low}{'s' if suited else 'o'}"


def cell_key(hi: int, lo: int, suited: bool | None) -> str:
    return cell_name(hi, lo, suited)


@dataclass(slots=True)
class RangeMatrix:
    """A position/depth range: 169 cell keys -> action frequency maps."""

    position: str
    stack_bb: int
    cells: dict[str, dict[str, float]] = field(default_factory=dict)

    def cell_frequencies(self, key: str) -> dict[str, float]:
        return self.cells.get(key, {"FOLD": 1.0})

    def as_grid(self) -> list[list[str]]:
        """13x13 grid of dominant action labels for the UI matrix."""
        grid: list[list[str]] = []
        for hi in RANKS:
            row: list[str] = []
            for lo in RANKS:
                if hi == lo:
                    key = cell_key(hi, lo, None)
                elif hi > lo:
                    key = cell_key(hi, lo, True)
                else:
                    key = cell_key(lo, hi, False)
                freqs = sorted(self.cell_frequencies(key).items(), key=lambda kv: -kv[1])
                row.append(freqs[0][0])
            grid.append(row)
        return grid
