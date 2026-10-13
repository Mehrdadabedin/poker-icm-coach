"""The Report page (plan 078): one ready-made report from the saved hand
history (plan 076). Pure functions over tournament rows and hand records, so
the numbers are tested without a database.

A mistake is a decision graded SUBOPTIMAL, the same rule My Mistakes uses;
coach agreement is the share graded PREFERRED or ACCEPTABLE.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any, Literal

from app.game.positions import POSITION_ORDER
from app.services.hand_history import HandHistoryRecord
from app.services.report_stats import player_stats

Period = Literal["7d", "30d", "90d", "all"]
PERIOD_DAYS: dict[str, int | None] = {"7d": 7, "30d": 30, "90d": 90, "all": None}
STREETS = ("preflop", "flop", "turn", "river")
AGREE = ("PREFERRED", "ACCEPTABLE")
MISTAKE = "SUBOPTIMAL"
TYPES = {"CALL": "call", "FOLD": "fold", "ALL-IN": "allin"}  # the rest is "other", as in My Mistakes
PROGRESS_POINTS = 12
LEAKS, LEAK_EXAMPLES = 3, 5

Row = dict[str, Any]
Hands = dict[str, list[HandHistoryRecord]]


def tournament_view(row: Row) -> dict[str, Any]:
    return {
        "tableId": row["id"],
        "tableLabel": row["table_label"],
        "startedAt": row["started_at"].isoformat(),
        "endedAt": row["ended_at"].isoformat() if row["ended_at"] else None,
        "status": row["status"],
        "finishPlace": row["finish_place"],
        "startingStack": row["starting_stack"],
        "hands": row["hands"],
    }


def windows(rows: list[Row], period: str, now: datetime,
            tournament: str | None) -> tuple[list[Row], list[Row]]:
    """Tournaments with hands in the period and in the one before it, newest
    first. A chosen tournament stands alone: the period does not apply."""
    played = [r for r in rows if r["hands"] > 0]
    if tournament is not None:
        return [r for r in played if r["id"] == tournament], []
    days = PERIOD_DAYS[period]
    if days is None:
        return played, []
    start, before = now - timedelta(days=days), now - timedelta(days=2 * days)
    return ([r for r in played if r["started_at"] >= start],
            [r for r in played if before <= r["started_at"] < start])


def _records(rows: list[Row], hands: Hands) -> list[HandHistoryRecord]:
    return [h for r in rows for h in hands.get(r["id"], [])]


def _mistakes(record: HandHistoryRecord) -> int:
    return sum(d.grade == MISTAKE for d in record.decisions)


def _rates(records: list[HandHistoryRecord]) -> dict[str, float | None]:
    decisions = [d for h in records for d in h.decisions]
    agree = sum(d.grade in AGREE for d in decisions)
    return {
        "agreement": round(100 * agree / len(decisions), 1) if decisions else None,
        "mistakesPer100": round(100 * sum(map(_mistakes, records)) / len(records), 1) if records else None,
    }


def _summary(current: list[Row], previous: list[Row], hands: Hands) -> dict[str, Any]:
    records, before = _records(current, hands), _records(previous, hands)
    places = [r["finish_place"] for r in current if r["finish_place"]]
    return {
        "tournaments": len(current), "hands": len(records),
        "decisions": sum(len(h.decisions) for h in records),
        "wins": sum(p == 1 for p in places), "top3": sum(p <= 3 for p in places),
        "averageFinish": round(sum(places) / len(places), 1) if places else None,
        **_rates(records),
        "previous": _rates(before) if before else None,
    }


def _stack(row: Row | None, records: list[HandHistoryRecord]) -> dict[str, Any] | None:
    """The hero's chips after each hand, from the stack before the first."""
    if row is None or not records:
        return None
    first = records[0]
    points = [{"hand": first.hand_number - 1, "stack": first.starting_stack,
               "level": first.level_index, "mistakes": 0}]
    points += [{"hand": h.hand_number, "stack": h.ending_stack, "level": h.level_index,
                "mistakes": _mistakes(h)} for h in records]
    return {**tournament_view(row), "points": points}


def _heatmap(records: list[HandHistoryRecord]) -> dict[str, Any]:
    cells: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    for h in records:
        for d in h.decisions:
            cell = cells[(h.hero_position, d.street)]
            cell[0] += 1
            cell[1] += d.grade == MISTAKE
    return {
        "positions": POSITION_ORDER, "streets": list(STREETS),
        "cells": [{"position": p, "street": s, "decisions": n, "mistakes": m}
                  for (p, s), (n, m) in cells.items() if p in POSITION_ORDER and s in STREETS],
    }


def _leaks(rows: list[Row], hands: Hands) -> list[dict[str, Any]]:
    """The most repeated mistakes: same seat, street, action and coach advice.
    Newest hands first, so a tie goes to the more recent leak."""
    groups: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        for h in reversed(hands.get(row["id"], [])):
            for d in h.decisions:
                if d.grade == MISTAKE:
                    groups[(h.hero_position, d.street, d.hero_action, d.coach_action)].append(
                        {"tableId": row["id"], "handNumber": h.hand_number})
    top = sorted(groups.items(), key=lambda item: -len(item[1]))[:LEAKS]
    return [{"position": p, "street": s, "heroAction": hero, "coachAction": coach,
             "count": len(found), "hands": found[:LEAK_EXAMPLES]}
            for (p, s, hero, coach), found in top]


def _mistake_types(records: list[HandHistoryRecord]) -> list[dict[str, Any]]:
    tally = Counter(TYPES.get(d.hero_action, "other")
                    for h in records for d in h.decisions if d.grade == MISTAKE)
    return [{"type": t, "count": tally[t]} for t in ("call", "fold", "allin", "other")]


def _progress(rows: list[Row], hands: Hands) -> list[dict[str, Any]]:
    """The last tournaments, oldest first, one point each."""
    return [{**tournament_view(r), **_rates(hands.get(r["id"], []))}
            for r in reversed(rows[:PROGRESS_POINTS])]


def build_report(current: list[Row], previous: list[Row], hands: Hands, *,
                 period: str, tournament: str | None) -> dict[str, Any]:
    records = _records(current, hands)
    latest = current[0] if current else None
    return {
        "period": period, "tournament": tournament,
        "summary": _summary(current, previous, hands),
        "stack": _stack(latest, hands.get(latest["id"], []) if latest else []),
        "heatmap": _heatmap(records),
        "leaks": _leaks(current, hands),
        "mistakeTypes": _mistake_types(records),
        "stats": player_stats(records),
        "progress": _progress(current, hands),
    }
