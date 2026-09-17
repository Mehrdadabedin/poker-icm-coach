"""Showdown settlement: side pot distribution and result winners."""
from __future__ import annotations

from app.game.hand_result import HandWinner
from app.game.player import Player
from app.game.side_pot import SidePot, build_side_pots, distribute_pots, merge_equal_pots
from app.poker.card import Card
from app.poker.hand_evaluator import best_hand


def settle(
    players: list[Player],
    eligible_seats: set[int],
    board: list[Card],
    ante_mode: str = "none",
) -> tuple[list[HandWinner], list[int], int]:
    """Distribute every pot to the best eligible hand(s); apply refunds.

    Returns (winners, showed_down_seats, pot_total).
    """
    by_seat = {p.seat: p for p in players}
    # The two ante styles are settled differently because they are different
    # money. A traditional ante is posted by every player, so it ladders like
    # any other contribution: a short stack that could only post part of one
    # wins only that much of each opponent's ante. A big blind ante is posted
    # by one seat on behalf of the table, so it is dead money that everyone
    # still in the hand contests, and laddering it would hand it straight back
    # to the seat that posted it as an uncalled excess.
    dead_antes = ante_mode == "bba"
    contributions = {
        p.seat: p.bet_total if dead_antes else p.committed
        for p in players
        if (p.bet_total if dead_antes else p.committed) > 0
    }
    pots, refunds = build_side_pots(contributions, eligible_seats)
    dead = sum(p.ante_total for p in players) if dead_antes else 0
    if dead:
        pots.insert(0, SidePot(rank=-1, total_amount=dead, eligible_seats=set(eligible_seats)))
    # A layer that nobody can win separately is not a separate layer. Splitting
    # the dead antes apart from a live pot with the same contenders rounded the
    # odd chip twice, so a tie paid 4 and 2 where it owed 3 and 3.
    pots = merge_equal_pots(pots)
    for seat, amount in refunds.items():
        by_seat[seat].add_chips(amount)
    winners: list[HandWinner] = []
    if len(eligible_seats) == 1:
        # walk: single remaining player collects every pot without showdown
        seat = next(iter(eligible_seats))
        amount = sum(pot.total_amount for pot in pots)
        for pot in pots:  # single eligible seat: award directly per pot
            by_seat[seat].add_chips(pot.total_amount)
        if amount:
            winners.append(HandWinner(seats=[seat], amount=amount))
    else:
        hands = {s: best_hand(by_seat[s].hole_cards + list(board)) for s in eligible_seats}
        distribute_pots(pots, by_seat, hands)
        for pot in pots:
            contenders = [s for s in pot.eligible_seats if s in hands]
            if not contenders:
                continue
            best = max(contenders, key=lambda s: hands[s])
            seats = [s for s in contenders if hands[s] == hands[best]]
            winners.append(HandWinner(seats=seats, amount=pot.total_amount))
    return winners, sorted(eligible_seats), sum(p.committed for p in players)


def merge_winners(winners: list[HandWinner]) -> list[HandWinner]:
    """Combine repeated single-winner pot entries into one record."""
    if len(winners) <= 1:
        return winners
    first = winners[0]
    if len(first.seats) == 1 and all(len(w.seats) == 1 and w.seats == first.seats for w in winners):
        return [HandWinner(seats=[first.seats[0]], amount=sum(w.amount for w in winners))]
    return winners
