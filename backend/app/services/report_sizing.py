"""Bet sizing for the Report page (plan 079): how big the hero's bets are as
a share of the pot, by street. Only first bets count (a bet into an unbet
street), not raises, because a raise is sized against the bet it faces.

The saved hand has no pot per action, and the preflop log misses blinds that
were posted and then folded or checked. So the pot is rebuilt from the end:
the final pot (every chip put in, an uncalled bet included) minus everything
put in after the flop is the pot the flop started with. Log amounts are each
seat's total for the street, so the street's chips are each seat's last
amount.
"""
from __future__ import annotations

from typing import Any

from app.services.hand_history import HandHistoryRecord

HERO = 0
POSTFLOP = ("flop", "turn", "river")
# (key, upper bound in % of the pot); the table's buttons are MIN, POT and ALL-IN
BUCKETS: tuple[tuple[str, float], ...] = (
    ("under25", 25), ("third", 40), ("half", 60), ("twoThirds", 85), ("pot", 115), ("over", float("inf")),
)


def _street_chips(record: HandHistoryRecord, street: str) -> dict[int, int]:
    chips: dict[int, int] = {}
    for a in record.actions:
        if a.street == street and a.amount is not None:
            chips[a.seat] = a.amount
    return chips


def hero_bets(record: HandHistoryRecord) -> list[tuple[str, int, int]]:
    """(street, amount, pot before the bet) for each first bet by the hero."""
    played = [s for s in POSTFLOP if any(a.street == s for a in record.actions)]
    if not played:
        return []
    totals = {s: _street_chips(record, s) for s in played}
    pot = record.pot_total - sum(sum(c.values()) for c in totals.values())
    if pot <= 0:
        return []  # a hand the rebuild cannot explain is left out, not guessed
    found: list[tuple[str, int, int]] = []
    for street in played:
        chips: dict[int, int] = {}
        for a in (a for a in record.actions if a.street == street):
            opening = not any(chips.values()) and a.action in ("bet", "all_in")
            if a.seat == HERO and opening and a.amount:
                found.append((street, a.amount, pot + sum(chips.values())))
            if a.amount is not None:
                chips[a.seat] = a.amount
        pot += sum(chips.values())
    return found


def _bucket(percent: float) -> str:
    return next(key for key, upper in BUCKETS if percent < upper)


def bet_sizes(records: list[HandHistoryRecord]) -> list[dict[str, Any]]:
    """Per street: how many first bets the hero made, and how many per size."""
    counts = {s: dict.fromkeys((k for k, _ in BUCKETS), 0) for s in POSTFLOP}
    for record in records:
        for street, amount, pot in hero_bets(record):
            counts[street][_bucket(100 * amount / pot)] += 1
    return [{"street": s, "bets": sum(counts[s].values()),
             "buckets": [{"size": k, "count": counts[s][k]} for k, _ in BUCKETS]} for s in POSTFLOP]
