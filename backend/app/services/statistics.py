"""Session statistics aggregated from hand history records."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.services.hand_history import HandHistoryRecord

PREFERRED_SCORE = 1.0
ACCEPTABLE_SCORE = 0.5
SUBOPTIMAL_SCORE = 0.0

_VPIP_ACTIONS = {"CALL", "RAISE", "3-BET", "4-BET", "ALL-IN", "OPEN JAM", "RESHOVE"}
_PFR_ACTIONS = {"RAISE", "3-BET", "4-BET", "OPEN JAM", "RESHOVE"}
_AGGRESSIVE = {"RAISE", "3-BET", "4-BET", "BET", "ALL-IN", "OPEN JAM", "RESHOVE"}
_PASSIVE = {"CALL", "CHECK", "CALL JAM"}


@dataclass(slots=True)
class SessionStatistics:
    hands_played: int = 0
    hands_won: int = 0
    vpip: float = 0.0
    pfr: float = 0.0
    three_bet: float = 0.0
    aggression: float = 0.0
    average_pot: float = 0.0
    bb_won_lost: float = 0.0
    chip_profit: int = 0
    coach_agreement: float = 0.0
    icm_mistakes: int = 0
    position_performance: dict[str, int] = field(default_factory=dict)
    stack_depth_performance: dict[str, int] = field(default_factory=dict)


def _big_blind_of(blind_level: str) -> int:
    try:
        return int(blind_level.split("/")[1])
    except (IndexError, ValueError):
        return 100


def aggregate(records: list[HandHistoryRecord]) -> SessionStatistics:
    stats = SessionStatistics(hands_played=len(records))
    if not records:
        return stats
    stats.hands_won = sum(1 for r in records if 0 in r.winner_seats)
    vpip_hands = sum(1 for r in records if (r.hero_decision or "") in _VPIP_ACTIONS)
    pfr_hands = sum(1 for r in records if (r.hero_decision or "") in _PFR_ACTIONS)
    threebet_hands = sum(1 for r in records if (r.hero_decision or "") in {"3-BET", "4-BET"})
    aggressive = sum(1 for r in records if (r.hero_decision or "") in _AGGRESSIVE)
    passive = sum(1 for r in records if (r.hero_decision or "") in _PASSIVE)
    stats.vpip = vpip_hands / stats.hands_played
    stats.pfr = pfr_hands / stats.hands_played
    stats.three_bet = threebet_hands / stats.hands_played
    stats.aggression = aggressive / (aggressive + passive) if (aggressive + passive) else 0.0
    stats.average_pot = sum(r.pot_total for r in records) / stats.hands_played
    stats.chip_profit = sum(r.net_chips() for r in records)
    total_bb = sum(_big_blind_of(r.blind_level) for r in records)
    stats.bb_won_lost = round(stats.chip_profit / total_bb, 3) if total_bb else 0.0
    agreement = 0.0
    for r in records:
        if r.grade == "PREFERRED":
            agreement += PREFERRED_SCORE
        elif r.grade == "ACCEPTABLE":
            agreement += ACCEPTABLE_SCORE
    stats.coach_agreement = round(agreement / stats.hands_played, 4)
    stats.icm_mistakes = sum(
        1 for r in records
        if r.grade == "SUBOPTIMAL" and r.icm_pressure in ("HIGH", "VERY HIGH")
    )
    stats.position_performance = position_performance(records)
    stats.stack_depth_performance = _stack_performance(records)
    return stats


def position_performance(records: list[HandHistoryRecord]) -> dict[str, int]:
    perf: dict[str, int] = {}
    for r in records:
        perf[r.hero_position] = perf.get(r.hero_position, 0) + r.net_chips()
    return perf


def _stack_performance(records: list[HandHistoryRecord]) -> dict[str, int]:
    perf: dict[str, int] = {}
    for r in records:
        bb = _big_blind_of(r.blind_level)
        depth = max(1, r.starting_stack // max(1, bb))
        band = "SHORT" if depth <= 10 else ("MEDIUM" if depth <= 25 else "DEEP")
        perf[band] = perf.get(band, 0) + r.net_chips()
    return perf


def biggest_leak(records: list[HandHistoryRecord]) -> str | None:
    """Worst position + decision category by net chips."""
    losses: dict[tuple[str, str], int] = {}
    for r in records:
        key = (r.hero_position, r.hero_decision or "?")
        losses[key] = losses.get(key, 0) + r.net_chips()
    worst = min(losses.items(), key=lambda kv: kv[1]) if losses else None
    if worst is None or worst[1] >= 0:
        return None
    position, decision = worst[0]
    return f"Calling too wide from {position} ({decision.lower()}) — {abs(worst[1]):,} chips."


class StatisticsEngine:
    """Facade: aggregate a store's records into session statistics."""

    def __init__(self, records: list[HandHistoryRecord] | None = None) -> None:
        self.records = records or []

    def calculate(self) -> SessionStatistics:
        return aggregate(self.records)
