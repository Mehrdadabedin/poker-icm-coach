"""Push/fold engine: open jam, reshove and call-jam decisions (<= 10 BB).

Uses the baseline jam frequencies from the range matrix plus equity
estimates vs the reshover's range for call decisions. Heuristic, not
solver-exact.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.equity.equity_engine import hero_vs_range
from app.poker.card import Card
from app.strategy.baseline_ranges import matrix_for_position
from app.strategy.hand_codec import HandCell


def _jam_frequency_cells(position: str, stack_bb: int, action: str,
                         threshold: float = 0.2) -> set[HandCell]:
    matrix = matrix_for_position(position, stack_bb)
    cells: set[HandCell] = set()
    for key, freqs in matrix.cells.items():
        if freqs.get(action, 0.0) >= threshold:
            hi, lo, suited = _parse_key(key)
            cells.add(HandCell(hi, lo, suited))
    return cells


def _parse_key(key: str) -> tuple[int, int, bool | None]:
    from app.strategy.hand_codec import CHAR_RANK

    tag = key[-1] if key[-1] in {"s", "o"} else None
    body = key[:-1] if tag else key
    return CHAR_RANK[body[0]], CHAR_RANK[body[1]], None if tag is None else tag == "s"


def open_jam_range(position: str, stack_bb: int) -> set[HandCell]:
    """Hands the baseline treats as open-jams at this depth."""
    return _jam_frequency_cells(position, stack_bb, "OPEN JAM")


def reshove_range(position: str, stack_bb: int) -> set[HandCell]:
    """Narrower jamming range when facing a raise: premium subset."""
    cells = _jam_frequency_cells(position, stack_bb, "OPEN JAM")
    keep: set[HandCell] = set()
    for cell in cells:
        if cell.suited is None and cell.lo >= 8 or cell.hi == 14 and cell.lo >= 9 or cell.hi >= 13 and cell.lo >= 12:
            keep.add(cell)
    return keep


@dataclass(frozen=True, slots=True)
class PushFoldDecision:
    recommendation: str  # OPEN JAM | RESHOVE | CALL JAM | RAISE | FOLD
    reason: str
    equity: float | None = None
    pot_odds: float | None = None


def call_jam_decision(
    hero: list[Card],
    position: str,
    stack_bb: int,
    to_call: int,
    pot: int,
    villain_range: set[HandCell],
    trials: int = 4000,
    seed: int | None = 11,
) -> PushFoldDecision:
    """Decide whether to call an all-in jam from the given range."""
    pot_odds = to_call / max(1, pot + to_call)
    try:
        equity = hero_vs_range(hero=hero, cells=villain_range, board=[], trials=trials, seed=seed)
        eq = equity.equity
    except ValueError:
        eq = 0.5
    if eq >= pot_odds + 0.06:
        return PushFoldDecision("CALL JAM", f"equity {eq:.2f} vs pot odds {pot_odds:.2f}", eq, pot_odds)
    if eq >= pot_odds + 0.02 and pot_odds > 0.3:
        return PushFoldDecision("CALL JAM", f"good odds: equity {eq:.2f} vs {pot_odds:.2f}", eq, pot_odds)
    return PushFoldDecision("FOLD", f"equity {eq:.2f} below required {pot_odds + 0.06:.2f}", eq, pot_odds)


class PushFoldEngine:
    """Facade for push/fold decision points."""

    def decide(self, hero: list[Card], position: str, stack_bb: int,
               facing_raise: bool = False, to_call: int = 0, pot: int = 0) -> PushFoldDecision:
        if facing_raise:
            villain_range = reshove_range(position, stack_bb)
            if hero[0].rank.value == hero[1].rank.value and hero[0].rank.value >= 8:
                return PushFoldDecision("RESHOVE", "premium pair reshoves")
            return call_jam_decision(hero, position, stack_bb, to_call, pot, villain_range)
        jam = open_jam_range(position, stack_bb)
        cell = HandCell(hero[0].rank.value, hero[1].rank.value,
                        None if hero[0].rank == hero[1].rank else hero[0].suit == hero[1].suit)
        if cell in jam:
            return PushFoldDecision("OPEN JAM", f"{cell.name()} is in the {position} jam range")
        return PushFoldDecision("FOLD", f"{cell.name()} is not in the {position} jam range")
