"""Per-opponent statistics observed from hand action logs."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.game.hand_result import HandAction

RAISE_ACTIONS = {"raise", "bet", "all_in"}
PREFLOP_AGGRESSIVE = {"raise", "all_in"}


@dataclass(slots=True)
class OpponentStats:
    """Observed tendencies per seat; all rates bounded to [0, 1]."""

    seat: int
    hands: int = 0
    vpip: float = 0.0
    pfr: float = 0.0
    three_bet: float = 0.0
    fold_to_three_bet: float = 0.0
    aggression: float = 0.5
    c_bet: float = 0.0
    fold_to_c_bet: float = 0.0
    showdown: float = 0.0
    actions_seen: int = 0
    _counts: dict = field(default_factory=dict)

    def _clamp(self) -> None:
        for attr in ("vpip", "pfr", "three_bet", "fold_to_three_bet",
                     "aggression", "c_bet", "fold_to_c_bet", "showdown"):
            value = getattr(self, attr)
            setattr(self, attr, max(0.0, min(1.0, value)))


def stats_from_actions(seat: int, hands: list[list[HandAction]]) -> OpponentStats:
    """Aggregate opponent stats from a list of per-hand action logs."""
    stats = OpponentStats(seat=seat)
    stats.hands = len(hands)
    vpip_hands = 0
    pfr_hands = 0
    threebet_hands = 0
    preflop_raises = [a for h in hands for a in h if a.street == "preflop" and a.action in PREFLOP_AGGRESSIVE]
    bets = calls = 0
    bets += sum(1 for a in preflop_raises)
    for hand in hands:
        preflop = [a for a in hand if a.street == "preflop"]
        if any(a.action in ("call", "raise", "all_in") for a in preflop):
            vpip_hands += 1
        if any(a.action in PREFLOP_AGGRESSIVE for a in preflop):
            pfr_hands += 1
            # a raise after another preflop raise counts as a 3-bet
            raise_seen = False
            for a in preflop:
                if a.action == "raise" or a.action == "all_in":
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
