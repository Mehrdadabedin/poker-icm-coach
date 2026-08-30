"""Side pot construction and distribution for multiway all-ins."""
from __future__ import annotations

from dataclasses import dataclass

from app.game.player import Player
from app.poker.hand_rank import HandRank


@dataclass(slots=True)
class SidePot:
    """A pot layer with the seats eligible to win it."""

    rank: int
    total_amount: int
    eligible_seats: set[int]

    def total(self) -> int:
        return self.total_amount


def build_side_pots(
    contributions: dict[int, int], eligible: set[int]
) -> tuple[list[SidePot], dict[int, int]]:
    """Split per-player contributions into (main first) side pots.

    Returns (pots, refunds) where refunds are uncalled excess returned to
    the sole contributor at a level. Folded players keep their chips in
    the pots but are not eligible to win them.
    """
    levels = sorted({c for c in contributions.values() if c > 0})
    pots: list[SidePot] = []
    refunds: dict[int, int] = {}
    prev = 0
    rank = 0
    for level in levels:
        contributors = [s for s in contributions if contributions[s] >= level]
        amount_per = level - prev
        amount = amount_per * len(contributors)
        if len(contributors) == 1:
            refunds[contributors[0]] = refunds.get(contributors[0], 0) + amount
        else:
            winners = {s for s in contributors if s in eligible}
            if not winners:
                # Unclaimable layer (all contributors folded): the chips fold
                # into the previous layer so they are still awarded.
                if pots:
                    pots[-1].total_amount += amount
                else:
                    refunds.setdefault(contributors[0], 0)
                    refunds[contributors[0]] += amount
            else:
                pots.append(SidePot(rank=rank, total_amount=amount, eligible_seats=winners))
                rank += 1
        prev = level
    return pots, refunds


def distribute_pots(
    pots: list[SidePot],
    players: dict[int, Player],
    hands: dict[int, HandRank],
) -> None:
    """Award every pot to the best eligible hand(s), splitting odd chips."""
    for pot in pots:
        if pot.total_amount == 0:
            continue
        contenders = [s for s in pot.eligible_seats if s in hands]
        if not contenders:
            continue
        best = max(contenders, key=lambda s: hands[s])
        winners = [s for s in contenders if hands[s] == hands[best]]
        if len(winners) == 1:
            players[winners[0]].add_chips(pot.total_amount)
        else:
            base, odd = divmod(pot.total_amount, len(winners))
            for i, seat in enumerate(winners):
                players[seat].add_chips(base + (1 if i < odd else 0))
