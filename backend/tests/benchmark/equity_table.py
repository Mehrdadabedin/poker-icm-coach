"""All-in preflop equity between the 169 starting-hand classes (plan 080).

The benchmark needs every class against every other: 14,365 pairs. Exact
enumeration is too slow in Python, so each pair is simulated with a fixed
seed (TRIALS showdowns); averaged over a range the error is a few hundredths
of a big blind. The table is a cache built once (minutes, all cores) and is
not committed: the benchmark spots it produces are.
"""
from __future__ import annotations

import json
import random
from concurrent.futures import ProcessPoolExecutor
from itertools import combinations
from pathlib import Path

from app.equity.fast_eval import score
from app.strategy.range_matrix import cell_name

TRIALS = 3000
Combo = tuple[tuple[int, int], tuple[int, int]]
DECK = [(rank, suit) for rank in range(2, 15) for suit in range(4)]


def classes() -> list[tuple[int, int, bool | None]]:
    """(high, low, suited) for all 169: pairs have suited None."""
    out: list[tuple[int, int, bool | None]] = []
    for hi in range(14, 1, -1):
        out.append((hi, hi, None))
        for lo in range(hi - 1, 1, -1):
            out += [(hi, lo, True), (hi, lo, False)]
    return out


NAMES = [cell_name(*c) for c in classes()]


def combos(hi: int, lo: int, suited: bool | None) -> list[Combo]:
    if suited is None:
        return [((hi, a), (hi, b)) for a, b in combinations(range(4), 2)]
    if suited:
        return [((hi, s), (lo, s)) for s in range(4)]
    return [((hi, a), (lo, b)) for a in range(4) for b in range(4) if a != b]


def _pair_equity(job: tuple[int, int]) -> tuple[int, int, float]:
    i, j = job
    rng = random.Random(i * 1000 + j)
    mine, theirs = combos(*classes()[i]), combos(*classes()[j])
    wins = 0.0
    for _ in range(TRIALS):
        a = rng.choice(mine)
        b = rng.choice([c for c in theirs if not set(c) & set(a)])
        rest = [c for c in DECK if c not in a and c not in b]
        board = rng.sample(rest, 5)
        sa, sb = score([*a, *board]), score([*b, *board])
        wins += 1.0 if sa > sb else 0.5 if sa == sb else 0.0
    return i, j, wins / TRIALS


def weights() -> list[list[float]]:
    """Villain combos of class j left on average when the hero holds class i."""
    all_combos = [combos(*c) for c in classes()]
    return [[sum(sum(1 for b in theirs if not set(a) & set(b)) for a in mine) / len(mine)
             for theirs in all_combos] for mine in all_combos]


def build(path: Path) -> dict[str, list[list[float]]]:
    """Load the cached table, or simulate it (a few minutes on 4 cores)."""
    if path.exists():
        return json.loads(path.read_text())
    n = len(NAMES)
    equity = [[0.5] * n for _ in range(n)]
    jobs = [(i, j) for i in range(n) for j in range(i, n)]
    with ProcessPoolExecutor() as pool:
        for i, j, e in pool.map(_pair_equity, jobs, chunksize=64):
            equity[i][j], equity[j][i] = e, 1.0 - e
    table = {"equity": equity, "weight": weights()}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(table))
    return table
