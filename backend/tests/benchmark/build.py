"""Build the coach benchmark (plan 080): `uv run python -m tests.benchmark.build`.

Writes tests/data/coach_benchmark.json. For every stack it keeps the hands
closest to the right answer's edge on each side, because those separate a
good coach from a rough one; hands whose two choices differ by less than the
margin are close calls and left out (either answer is fine there).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from tests.benchmark import equity_table, nash
from tests.benchmark.equity_table import NAMES, TRIALS, classes

HERE = Path(__file__).parent
OUT = HERE.parent / "data" / "coach_benchmark.json"
SB_STACKS = [3, 4, 5, 6, 8, 10]
BB_STACKS = [4, 6, 8, 10, 12, 15, 20]
BUBBLES = [(20, 10, 10), (10, 10, 20), (30, 8, 8), (8, 12, 12)]  # button, small blind, big blind
PER_SIDE = 6
MARGIN_BB, MARGIN_PRIZE = 0.1, 0.3
SUIT = "shdc"
RANK = {14: "A", 13: "K", 12: "Q", 11: "J", 10: "T"}


def _cards(i: int) -> list[str]:
    hi, lo, suited = classes()[i]
    r = lambda v: RANK.get(v, str(v))  # noqa: E731
    return [f"{r(hi)}s", f"{r(lo)}{'s' if suited else 'h'}"]


def _pick(gaps: np.ndarray, margin: float) -> list[int]:
    """The PER_SIDE classes nearest the edge on each side, beyond the margin."""
    order = np.argsort(gaps)
    yes = [int(i) for i in order if gaps[i] >= margin][:PER_SIDE]
    no = [int(i) for i in order[::-1] if gaps[i] <= -margin][:PER_SIDE]
    return no + yes


def _spots(category: str, stacks: list[float], gaps: np.ndarray, margin: float,
           act: str, unit: str) -> list[dict[str, Any]]:
    label = "-".join(str(s) for s in stacks)
    return [{"id": f"{category}-{label}-{NAMES[i]}", "category": category, "hand": NAMES[i],
             "cards": _cards(i), "stacks": stacks, "truth": act if gaps[i] > 0 else "FOLD",
             "gap": round(abs(float(gaps[i])), 3), "unit": unit} for i in _pick(gaps, margin)]


def main() -> None:
    table = {k: np.asarray(v) for k, v in equity_table.build(HERE / ".cache" / "equity.json").items()}
    solved = {s: nash.solve(float(s), table) for s in sorted(set(SB_STACKS + BB_STACKS))}
    spots: list[dict[str, Any]] = []
    ranges = {}
    for s in sorted(solved):
        shove, call = solved[s]
        ranges[str(s)] = {"shovePct": round(float(_share(shove)), 1), "callPct": round(float(_share(call)), 1)}
    for s in SB_STACKS:
        spots += _spots("sb_shove", [s], nash.shove_gaps(s, solved[s][1], table), MARGIN_BB, "JAM", "BB")
    for s in BB_STACKS:
        spots += _spots("bb_call", [s], nash.call_gaps(s, solved[s][0], table), MARGIN_BB, "CALL", "BB")
    for btn, sb, bb in BUBBLES:
        shove = solved[min(sb, bb)][0]
        gaps = nash.bubble_call_gaps((btn, sb, bb), [0.65, 0.35], shove, table)
        spots += _spots("bubble_call", [btn, sb, bb], gaps, MARGIN_PRIZE, "CALL", "% prize pool")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "about": "Heads-up push/fold Nash (chip EV) and three-handed bubble calls (exact ICM). "
                 f"Equity simulated, {TRIALS} showdowns per class pair. Built by tests/benchmark/build.py.",
        "nashRanges": ranges, "spots": spots}, indent=1))
    print(f"{len(spots)} spots -> {OUT}")


def _share(freq: np.ndarray) -> float:
    """Percent of all hands (by combos) played at frequency >= 0.5."""
    combos = np.array([6 if c[2] is None else 4 if c[2] else 12 for c in classes()])
    return 100 * combos[freq >= 0.5].sum() / 1326


if __name__ == "__main__":
    main()
