"""Hand setup mechanics: blinds, antes, action ordering."""
from __future__ import annotations

from app.game.betting import StreetState
from app.game.player import Player
from app.tournament.tournament import Tournament


def active_seats(players: list[Player]) -> set[int]:
    return {p.seat for p in players if not p.is_eliminated and not p.sit_out}


def active_players(players: list[Player]) -> list[Player]:
    return [p for p in players if not p.is_eliminated and not p.sit_out]


def in_hand_seats(players: list[Player]) -> set[int]:
    return {p.seat for p in players if not p.folded and not p.sit_out and not p.is_eliminated}


def blind_seats(button: int, seats: set[int], num_seats: int) -> tuple[int, int]:
    """SB/BB seats relative to the button; heads-up the button posts SB."""
    if len(seats) == 2:
        sb = button if button in seats else next(iter(seats))
        bb = next(s for s in seats if s != sb)
        return sb, bb
    ordered = [button]
    seat = button
    while len(ordered) < len(seats) + 1:
        seat = (seat + 1) % num_seats
        if seat in seats and seat != ordered[-1]:
            ordered.append(seat)
    return ordered[1], ordered[2]


def post_blinds_and_antes(tournament: Tournament, street: StreetState) -> None:
    """Deduct small blind, big blind and antes; seed the preflop street state."""
    level = tournament.current_blind_level()
    seats = active_seats(tournament.players)
    if not seats:
        return
    sb_seat, bb_seat = blind_seats(tournament.button, seats, len(tournament.players))
    mode = tournament.ante_mode
    ante = tournament.structure.ante_for(mode, level)
    for seat in seats:
        player = tournament.players[seat]
        ante_due = ante if mode == "traditional" else 0
        bba_due = ante if (mode == "bba" and seat == bb_seat) else 0
        blind_due = (level.small if seat == sb_seat else 0) + (level.big if seat == bb_seat else 0)

        # A traditional ante is posted before the blind, so a stack too short for
        # both is all-in for the ante with no live blind behind it. A big blind
        # ante goes the other way round, the blind first, per TDA recommended
        # procedure 11: the live blind takes priority.
        for kind, amount in (("ante", ante_due), ("blind", blind_due), ("ante", bba_due)):
            paid = min(amount, player.stack)
            if not paid:
                continue
            if kind == "ante":
                player.post_ante(paid)
            else:
                player.commit_bet(paid)
            if kind == "blind":
                # Only the blind is a live bet. An ante is dead money: it belongs
                # to the pot, never to the amount anyone has to call. Counting it
                # here made a big blind ante part of current_bet, so every player
                # had to call the blind plus the ante, and under traditional
                # antes it cut everyone's to_call by the ante already posted.
                street.record_contribution(seat, paid)
    # The scheduled big blind, not what the big blind could afford. A short blind
    # is all-in for less, and the rest of the table still faces a full one.
    street.current_bet = level.big


def preflop_first_seat(button: int, active: list[int], num_seats: int) -> int:
    """UTG (third clockwise from button); heads-up: the button (SB) acts first."""
    if len(active) == 2:
        return button
    sb, _ = blind_seats(button, set(active), num_seats)
    order = first_action_order("flop", button, active, num_seats)
    idx = order.index(sb)
    return order[(idx + 2) % len(order)]


def postflop_first_seat(button: int, active: list[int], num_seats: int) -> int:
    """First active seat clockwise from the button (SB region); HU: dealer = SB."""
    seat = (button + 1) % num_seats
    while seat not in active:
        seat = (seat + 1) % num_seats
    return seat


def first_action_order(street: str, button: int, active: list[int], num_seats: int) -> list[int]:
    """Clockwise action order for the street, starting at the first actor."""
    if not active:
        return []
    if street == "preflop":
        first = preflop_first_seat(button, active, num_seats)
    else:
        first = postflop_first_seat(button, active, num_seats)
    idx = active.index(first) if first in active else 0
    return active[idx:] + active[:idx]
