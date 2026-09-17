"""Per-opponent statistics observed from hand action logs."""
from __future__ import annotations

from dataclasses import dataclass

from app.ai.personalities import clamp01
from app.game.hand_result import HandAction

PREFLOP_AGGRESSIVE = {"raise", "all_in"}
_STATS_ATTRS = ("vpip", "pfr", "three_bet", "aggression", "showdown")


@dataclass(slots=True)
class OpponentStats:
    """Observed tendencies per seat; all rates bounded to [0, 1]."""

    seat: int
    hands: int = 0
    vpip: float = 0.0
    pfr: float = 0.0
    three_bet: float = 0.0
    aggression: float = 0.5
    showdown: float = 0.0

    def _clamp(self) -> None:
        clamp01(self, _STATS_ATTRS)


def stats_from_actions(seat: int, hands: list[list[HandAction]]) -> OpponentStats:
    """Aggregate opponent stats from a list of per-hand action logs."""
    stats = OpponentStats(seat=seat)
    stats.hands = len(hands)
    vpip_hands = 0
    pfr_hands = 0
    threebet_hands = 0
    preflop_raises = [a for h in hands for a in h if a.street == "preflop" and a.action in PREFLOP_AGGRESSIVE]
    calls = 0
    bets = len(preflop_raises)
    for hand in hands:
        preflop = [a for a in hand if a.street == "preflop"]
        if any(a.action in ("call", "raise", "all_in") for a in preflop):
            vpip_hands += 1
        if any(a.action in PREFLOP_AGGRESSIVE for a in preflop):
            pfr_hands += 1
            # a raise after another preflop raise counts as a 3-bet
            raise_seen = False
            for a in preflop:
                if a.action in PREFLOP_AGGRESSIVE:
                    if raise_seen:
                        threebet_hands += 1
                        break
                    raise_seen = True
        for a in hand:
            if a.street != "preflop" and a.action == "bet":
                bets += 1
            if a.street != "preflop" and a.action == "call":
                calls += 1
    if stats.hands:
        stats.vpip = vpip_hands / stats.hands
        stats.pfr = pfr_hands / stats.hands
        stats.three_bet = threebet_hands / stats.hands
    stats.aggression = bets / (bets + calls) if (bets + calls) else 0.5
    stats._clamp()
    return stats
