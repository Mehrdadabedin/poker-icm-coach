"""Short-stack maths shipped with the coach (plan 080 step B0).

The data file is exported from our own solver (tests/benchmark/export.py). These
tests pin its shape and check it against itself: a big blind who calls when the
table equity against the shoving range beats the pot odds must land on the
exported Nash calling range, or the equity table and the ranges disagree.
"""
from __future__ import annotations

import pytest

from app.strategy import allin_preflop as ap


def test_the_ranges_match_the_benchmark_shares() -> None:
    # the plan 080 table: at 10 BB the small blind shoves 57.8% and the big blind calls 37.3%
    assert ap.share(ap.shove_range(10)) == pytest.approx(0.578, abs=0.001)
    assert ap.share(ap.call_range(10)) == pytest.approx(0.373, abs=0.001)
    assert ap.share(ap.shove_range(3)) == pytest.approx(0.768, abs=0.001)


def test_shorter_stacks_shove_wider() -> None:
    shares = [ap.share(ap.shove_range(s)) for s in range(ap.MIN_BB, ap.MAX_BB + 1)]
    assert shares == sorted(shares, reverse=True)


@pytest.mark.parametrize(("stack", "solved"), [(1.2, 2), (7.4, 7), (7.6, 8), (35, 20)])
def test_a_stack_uses_the_nearest_solved_depth(stack: float, solved: int) -> None:
    assert ap.depth(stack) == solved


def test_the_equity_table_knows_famous_matchups() -> None:
    assert ap.equity_vs("AA", frozenset({"KK"})) == pytest.approx(0.82, abs=0.01)
    assert ap.equity_vs("AKo", frozenset({"QQ"})) == pytest.approx(0.43, abs=0.015)
    assert ap.equity_vs("72o", frozenset()) is None


def test_pot_odds_against_the_shove_range_give_the_nash_calls() -> None:
    # The solver mixes a few hands where calling and folding are worth the same;
    # a range of whole classes cannot, so those may land either side (6 of 3,211).
    classes = ap._data()["classes"]
    for s in range(ap.MIN_BB, ap.MAX_BB + 1):
        pot_odds = (s - 1) / (2 * s)  # call s - 1 big blinds to win s + 1
        edge = {c: ap.equity_vs(c, ap.shove_range(s)) or 0.0 for c in classes}
        differ = {c for c in classes if (edge[c] >= pot_odds) != (c in ap.call_range(s))}
        assert len(differ) <= 1, (s, differ)
        assert all(abs(edge[c] - pot_odds) < 0.005 for c in differ), (s, differ)
