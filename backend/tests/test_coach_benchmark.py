"""Coach benchmark (plan 080): the coach against spots whose right answer is
mathematics, not opinion. Heads-up push/fold (Nash, chip EV) and big blind
calls on a three-handed bubble (exact ICM). Built by tests/benchmark/build.py.

The floors are today's scores: a change to the coach may raise them, never
lower them. Run with -s to see the table.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

import pytest

from app.strategy.coach import Coach
from tests.benchmark.spots import played, request_for

DATA = json.loads((Path(__file__).parent / "data" / "coach_benchmark.json").read_text())
SPOTS: list[dict[str, Any]] = DATA["spots"]
# category -> lowest share of spots the coach must get right: the scores on
# 15 Oct 2026, before any coach change (plan 080 step A)
FLOORS = {"sb_shove": 36 / 72, "bb_call": 42 / 84, "bubble_call": 27 / 48}


@pytest.fixture(scope="module")
def results() -> dict[str, list[tuple[dict[str, Any], bool, str]]]:
    coach = Coach()
    by_category: dict[str, list[tuple[dict[str, Any], bool, str]]] = defaultdict(list)
    for spot in SPOTS:
        action = coach.recommend(request_for(spot)).recommended_action
        right = played(action) == (spot["truth"] != "FOLD")
        by_category[spot["category"]].append((spot, right, action))
    return by_category


def test_the_benchmark_is_well_formed() -> None:
    assert len(SPOTS) >= 150
    assert len({s["id"] for s in SPOTS}) == len(SPOTS)
    for spot in SPOTS:
        assert spot["truth"] in ("JAM", "CALL", "FOLD") and spot["gap"] > 0
        assert spot["category"] in FLOORS


def test_the_coach_scores_at_least_todays_floor(results: dict[str, list[tuple[dict[str, Any], bool, str]]]) -> None:
    lines = []
    for category, rows in sorted(results.items()):
        right = sum(ok for _, ok, _ in rows)
        lost = sum(spot["gap"] for spot, ok, _ in rows if not ok)
        unit = rows[0][0]["unit"]
        lines.append(f"{category:12} {right:3}/{len(rows):3} right ({100 * right / len(rows):5.1f}%), "
                     f"lost {lost:.2f} {unit} on the misses")
    print("\n" + "\n".join(lines))
    for category, rows in results.items():
        assert sum(ok for _, ok, _ in rows) / len(rows) >= FLOORS[category], category
