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


def _blind_seats(button: int, seats: set[int], num_seats: int) -> tuple[int, int]:
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
    sb_seat, bb_seat = _blind_seats(tournament.button, seats, len(tournament.players))
    mode = tournament.ante_mode
    ante = tournament.structure.ante_for(mode, level)
    for seat in seats:
        amount = ante if mode == "traditional" else 0
        if seat == sb_seat:
            amount += level.small
        if seat == bb_seat:
            amount += level.big
        if mode == "bba" and seat == bb_seat:
            amount += level.big  # big blind ante equals one big blind
        if amount:
            player = tournament.players[seat]
            amount = min(amount, player.stack)  # short stacks post all-in
            player.commit_bet(amount)
            street.contributions[seat] = street.contributions.get(seat, 0) + amount
    street.current_bet = street.contributions.get(bb_seat, 0)


def preflop_first_seat(button: int, active: list[int], num_seats: int) -> int:
    """UTG (third clockwise from button); heads-up: the button (SB) acts first."""
    if len(active) == 2:
        return button
    sb, _ = _blind_seats(button, set(active), num_seats)
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
