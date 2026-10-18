"""Preflop all-in maths for short stacks (plan 080 step B0).

Reads app/strategy/data/allin_preflop.json, exported from our own solver by
tests/benchmark/export.py: heads-up Nash shoving and calling ranges from 2 to
20 big blinds, and the all-in equity of every hand class against every other.
A table lookup is exact to the table and instant; the live simulation (1,000
showdowns) was out by about 3 points, more than the 0.5 point that separates
a call from a fold near the edge of a range.
"""
from __future__ import annotations

import json
from functools import cache, lru_cache
from pathlib import Path

from app.strategy.hand_codec import HandCell, parse_hand

DATA = Path(__file__).parent / "data" / "allin_preflop.json"
MIN_BB, MAX_BB = 2, 20


@cache
def _data() -> dict:
    return json.loads(DATA.read_text())


@cache
def _index() -> dict[str, int]:
    return {name: i for i, name in enumerate(_data()["classes"])}


@cache
def _equity() -> list[list[float]]:
    data = _data()
    n, scale = len(data["classes"]), 2 * data["trials"]
    wins = iter(data["equityWins"])
    table = [[0.5] * n for _ in range(n)]
    for i in range(n):
        for j in range(i, n):
            e = next(wins) / scale
            table[i][j], table[j][i] = e, 1.0 - e
    return table


def _combos(cell: HandCell) -> list[frozenset[tuple[int, int]]]:
    if cell.suited is None:
        return [frozenset({(cell.hi, a), (cell.hi, b)}) for a in range(4) for b in range(a + 1, 4)]
    if cell.suited:
        return [frozenset({(cell.hi, s), (cell.lo, s)}) for s in range(4)]
    return [frozenset({(cell.hi, a), (cell.lo, b)}) for a in range(4) for b in range(4) if a != b]


@lru_cache(maxsize=169)
def _weights(hero: str) -> tuple[float, ...]:
    """Villain combos of each class left, on average, once the hero's cards are out."""
    mine = _combos(parse_hand(hero))
    return tuple(sum(sum(1 for b in theirs if not a & b) for a in mine) / len(mine)
                 for theirs in (_combos(parse_hand(name)) for name in _data()["classes"]))


def depth(stack_bb: float) -> int:
    """The solved stack nearest to this one, within 2 to 20 big blinds."""
    return min(MAX_BB, max(MIN_BB, round(stack_bb)))


def shove_range(stack_bb: float) -> frozenset[str]:
    """Hands the small blind shoves heads-up at this effective stack."""
    return frozenset(_data()["nash"][str(depth(stack_bb))]["shove"])


def call_range(stack_bb: float) -> frozenset[str]:
    """Hands the big blind calls a Nash shove with, heads-up, in chip EV."""
    return frozenset(_data()["nash"][str(depth(stack_bb))]["call"])


def share(names: frozenset[str]) -> float:
    """Fraction of all 1,326 starting hands the classes make up."""
    return sum(len(_combos(parse_hand(n))) for n in names) / 1326


def equity_vs(hero: str, villain: frozenset[str]) -> float | None:
    """All-in equity of the hero's class against a range of classes."""
    i, index = _index()[hero], _index()
    row, weights = _equity()[i], _weights(hero)
    mass = sum(weights[index[v]] for v in villain)
    if mass == 0:
        return None
    return sum(weights[index[v]] * row[index[v]] for v in villain) / mass
