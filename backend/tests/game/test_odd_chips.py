"""Who gets the odd chip when a pot cannot be split evenly.

TDA rule 21 gives it to the first tied winner left of the button. It used to
follow set iteration order, so it landed on whichever seat the eligible set
happened to yield first. Split from test_ante_settlement.py to stay under the
200-line file cap.
"""
from __future__ import annotations

from app.game.showdown import settle
from app.poker.card import Card, Rank, Suit
from tests.game.test_ante_settlement import BOARD, HANDS, _table


def _tied_table() -> list:
    players = _table(live={0: 1, 1: 1, 2: 1}, antes={2: 2}, stack=0)
    players[0].set_hole_cards(HANDS[0])
    players[1].set_hole_cards([Card(Rank.ACE, Suit.HEARTS), Card(Rank.ACE, Suit.SPADES)])
    players[2].set_hole_cards(HANDS[2])
    return players


def test_the_odd_chip_goes_to_the_first_tied_seat_left_of_the_button() -> None:
    """TDA rule 21. The remainder used to follow set iteration order, so it
    landed on whichever seat the eligible set happened to yield first."""
    players = _table(live={0: 1, 1: 1, 2: 1}, antes={2: 2}, stack=0)
    players[0].set_hole_cards(HANDS[0])
    players[1].set_hole_cards([Card(Rank.ACE, Suit.HEARTS), Card(Rank.ACE, Suit.SPADES)])
    players[2].set_hole_cards(HANDS[2])

    settle(players, {0, 1, 2}, BOARD, "bba", button=0)

    by_seat = {p.seat: p for p in players}
    assert (by_seat[0].stack, by_seat[1].stack) == (2, 3), (
        "seat 1 sits first left of the button, so it takes the odd chip"
    )


def test_moving_the_button_moves_the_odd_chip() -> None:
    """Both positions, because the button-1 expectation on its own happens to
    match what set iteration order produced anyway."""
    # button 0 acts from seat 1, buttons 1 and 2 both act from seat 0 first
    for button, expected in ((0, (2, 3)), (1, (3, 2)), (2, (3, 2))):
        players = _table(live={0: 1, 1: 1, 2: 1}, antes={2: 2}, stack=0)
        players[0].set_hole_cards(HANDS[0])
        players[1].set_hole_cards([Card(Rank.ACE, Suit.HEARTS), Card(Rank.ACE, Suit.SPADES)])
        players[2].set_hole_cards(HANDS[2])

        settle(players, {0, 1, 2}, BOARD, "bba", button=button)

        by_seat = {p.seat: p for p in players}
        assert (by_seat[0].stack, by_seat[1].stack) == expected, f"button {button}"


def test_a_button_above_every_seat_in_the_pot_still_orders_from_the_left() -> None:
    """Only seats 0 and 1 are in the pot and the button sits on 2, so the order
    wraps to seat 0 first. Taking a modulus against the highest seat present
    reversed it."""
    players = _table(live={0: 1, 1: 1}, antes={0: 1}, stack=0)
    players[0].set_hole_cards(HANDS[0])
    players[1].set_hole_cards([Card(Rank.ACE, Suit.HEARTS), Card(Rank.ACE, Suit.SPADES)])

    settle(players, {0, 1}, BOARD, "bba", button=2)

    by_seat = {p.seat: p for p in players}
    assert (by_seat[0].stack, by_seat[1].stack) == (2, 1), (
        "seat 0 sits first left of a button on seat 2"
    )


def test_the_engine_hands_its_button_to_settlement() -> None:
    """Every other settlement test calls settle directly, so all of them passed
    while the engine forwarded no button at all. This one goes through the
    engine: a tied five-chip pot with the button on seat 1 pays the odd chip to
    seat 0, and pays it to seat 1 if the button never arrives."""
    from app.game.hand_engine import HandEngine
    from app.game.player import Player
    from app.tournament.tournament import build_default_tournament

    tournament = build_default_tournament(starting_stack=1_000)
    tournament.players = [Player(seat=i, name=f"P{i}", stack=0) for i in range(3)]
    tournament.button = 1
    engine = HandEngine(tournament)
    engine.button = 1
    engine._board = list(BOARD)
    for seat, cards, live in (
        (0, HANDS[0], 1),
        (1, [Card(Rank.ACE, Suit.HEARTS), Card(Rank.ACE, Suit.SPADES)], 1),
        (2, HANDS[2], 1),
    ):
        tournament.players[seat].set_hole_cards(cards)
        tournament.players[seat].bet_total = live
    tournament.players[2].ante_total = 2
    tournament.ante_mode = "bba"

    engine._finish_hand()

    stacks = tuple(p.stack for p in tournament.players)
    assert stacks == (3, 2, 0), f"the odd chip followed the wrong seat: {stacks}"
