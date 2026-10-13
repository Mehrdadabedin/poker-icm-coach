"""Player stats for the Report page (plan 078), read from each saved hand's
action log. The hero is seat 0 (GameSession.hero_seat).

The log records each action's total for the street, not the increment, so a
bet raises when it goes above the street's highest total so far. Blinds are
not logged; preflop starts at the big blind.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.hand_history import HandHistoryRecord

HERO = 0
STEAL_SEATS = ("CO", "BTN", "SB")
VOLUNTARY = ("call", "bet", "raise", "all_in")
# Rule-of-thumb ranges for a 9-player tournament table, not coach output.
TARGETS: dict[str, tuple[float, float]] = {
    "vpip": (18, 26), "pfr": (14, 21), "threeBet": (5, 9),
    "steal": (35, 50), "cbet": (50, 70), "wtsd": (24, 30),
}


@dataclass(slots=True)
class Counter:
    hits: dict[str, int] = field(default_factory=lambda: dict.fromkeys(TARGETS, 0))
    chances: dict[str, int] = field(default_factory=lambda: dict.fromkeys(TARGETS, 0))

    def add(self, key: str, chance: bool, hit: bool) -> None:
        if chance:
            self.chances[key] += 1
            self.hits[key] += int(hit)


def _big_blind(blind_level: str) -> int:
    try:
        return int(blind_level.split("/")[1].split()[0])
    except (IndexError, ValueError):
        return 0


def _raises(action: str, amount: int | None, top: int) -> bool:
    return action in ("bet", "raise") or (action == "all_in" and (amount or 0) > top)


def _preflop(record: HandHistoryRecord, counter: Counter) -> tuple[bool, bool]:
    """Count the preflop stats; returns (hero folded, hero raised last)."""
    top, raises, callers = _big_blind(record.blind_level), 0, 0
    acted = vpip = pfr = folded = False
    last_raiser: int | None = None
    for a in (a for a in record.actions if a.street == "preflop"):
        raised = _raises(a.action, a.amount, top)
        if a.seat == HERO:
            if not acted:
                acted = True
                counter.add("threeBet", raises == 1, raised)
                counter.add("steal", raises == 0 and callers == 0
                            and record.hero_position in STEAL_SEATS, raised)
            vpip = vpip or a.action in VOLUNTARY
            pfr = pfr or raised
            folded = folded or a.action == "fold"
        elif raised:
            raises += 1
        elif a.action == "call" and raises == 0:
            callers += 1
        if raised:
            top, last_raiser = a.amount or top, a.seat
    counter.add("vpip", acted, vpip)
    counter.add("pfr", acted, pfr)
    return folded, last_raiser == HERO


def _flop_cbet(record: HandHistoryRecord, counter: Counter) -> None:
    """A c-bet chance: the preflop raiser acts on the flop before any bet."""
    bet_before = False
    for a in (a for a in record.actions if a.street == "flop"):
        if a.seat == HERO:
            counter.add("cbet", not bet_before, a.action in ("bet", "raise", "all_in"))
            return
        bet_before = bet_before or a.action in ("bet", "raise", "all_in")


def _showdown(record: HandHistoryRecord) -> bool:
    seats = {a.seat for a in record.actions}
    folded = {a.seat for a in record.actions if a.action == "fold"}
    return HERO not in folded and len(seats - folded) >= 2


def player_stats(records: list[HandHistoryRecord]) -> list[dict[str, Any]]:
    counter = Counter()
    for record in records:
        folded, aggressor = _preflop(record, counter)
        saw_flop = not folded and len(record.community_cards) >= 3 and HERO in {
            a.seat for a in record.actions}
        if saw_flop and aggressor:
            _flop_cbet(record, counter)
        counter.add("wtsd", saw_flop, _showdown(record))
    return [{
        "key": key, "hits": counter.hits[key], "chances": counter.chances[key],
        "value": round(100 * counter.hits[key] / counter.chances[key], 1) if counter.chances[key] else None,
        "low": low, "high": high,
    } for key, (low, high) in TARGETS.items()]
