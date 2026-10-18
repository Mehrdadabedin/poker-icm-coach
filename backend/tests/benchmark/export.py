"""Export the push/fold maths for the live coach (plan 080 step B0):
`uv run python -m tests.benchmark.export`.

Writes app/strategy/data/allin_preflop.json: the class-against-class all-in
equity table and, for every stack from 2 to 20 big blinds, the heads-up Nash
small blind shoving range and big blind calling range. Both come from our own
solver (tests/benchmark/nash.py), the same one the benchmark is built with.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from tests.benchmark import equity_table, nash
from tests.benchmark.equity_table import NAMES, TRIALS

HERE = Path(__file__).parent
OUT = HERE.parents[1] / "app" / "strategy" / "data" / "allin_preflop.json"
STACKS = range(2, 21)


def main() -> None:
    table = {k: np.asarray(v) for k, v in equity_table.build(HERE / ".cache" / "equity.json").items()}
    equity = table["equity"]
    n = len(NAMES)
    ranges = {}
    for s in STACKS:
        shove, call = nash.solve(float(s), table)
        # the best answer to the other side's Nash strategy: the benchmark's truth
        shoves = nash.shove_gaps(s, call, table) > 0
        calls = nash.call_gaps(s, shove, table) > 0
        ranges[str(s)] = {"shove": [NAMES[i] for i in range(n) if shoves[i]],
                          "call": [NAMES[i] for i in range(n) if calls[i]]}
        print(f"{s:2} BB: shove {int(shoves.sum())} classes, call {int(calls.sum())}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "about": "Heads-up push/fold Nash (chip EV) from tests/benchmark/nash.py, and the "
                 f"all-in equity of each class against each other class ({TRIALS} showdowns "
                 "per pair). equityWins: wins counted twice (a tie counts once) out of "
                 f"{2 * TRIALS}, row by row for column >= row. Built by tests/benchmark/export.py.",
        "classes": NAMES,
        "trials": TRIALS,
        "equityWins": [round(float(equity[i][j]) * 2 * TRIALS) for i in range(n) for j in range(i, n)],
        "nash": ranges,
    }, separators=(",", ":")))
    print(f"{OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
