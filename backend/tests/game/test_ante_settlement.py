"""How each ante style settles.

A big blind ante is posted by one seat for the whole table, so it is dead money
everyone contests. A traditional ante is posted by every player, so it ladders
like any other contribution and a short stack that could post only part of one
wins only that much of each opponent's ante.

Settlement read every chip off bet_total, so a big blind ante looked like a
bet only the big blind had made. Two consequences, both reproduced below: the
ante came back to the big blind as an uncalled excess even when it lost, and a
player all-in for nothing but an ante was made eligible for the whole pot.
"""
from __future__ import annotations

import random

from app.game.actions import Action, ActionType
from app.game.player import Player
from app.game.showdown import settle
from app.poker.card import Card, Rank, Suit
from app.services.game_session import GameSession

BOARD = [Card(Rank.TWO, Suit.CLUBS), Card(Rank.SEVEN, Suit.DIAMONDS),
         Card(Rank.NINE, Suit.HEARTS), Card(Rank.JACK, Suit.SPADES),
         Card(Rank.FOUR, Suit.CLUBS)]

# seat 0 makes a pair of aces, seat 1 a pair of kings, seat 2 nothing
HANDS = {
    0: [Card(Rank.ACE, Suit.CLUBS), Card(Rank.ACE, Suit.DIAMONDS)],
    1: [Card(Rank.KING, Suit.CLUBS), Card(Rank.KING, Suit.DIAMONDS)],
    2: [Card(Rank.THREE, Suit.CLUBS), Card(Rank.FIVE, Suit.DIAMONDS)],
}


def _table(live: dict[int, int], antes: dict[int, int], stack: int = 10_000) -> list[Player]:
    players = []
    for seat in sorted(set(live) | set(antes)):
        player = Player(seat=seat, name=f"P{seat}", stack=stack)
        player.set_hole_cards(HANDS[seat])
        player.bet_total = live.get(seat, 0)
        player.ante_total = antes.get(seat, 0)
        players.append(player)
    return players


def test_a_losing_big_blind_does_not_get_its_ante_back() -> None:
    """Three players each put 200 in live and the big blind also posted a 200
    ante. Read off bet_total that looked like 400 from one seat, so the top 200
    was refunded as uncalled, even though the seat lost the hand."""
    players = _table(live={0: 200, 1: 200, 2: 200}, antes={1: 200})
    before = {p.seat: p.stack for p in players}

    winners, _showed, pot_total = settle(players, {0, 1, 2}, BOARD, "bba")

    assert pot_total == 800, "the ante has to be in the pot"
    by_seat = {p.seat: p for p in players}
    assert by_seat[1].stack == before[1], "the losing big blind was handed its ante back"
    assert by_seat[0].stack == before[0] + 800, "the best hand should take every chip"
    assert sum(w.amount for w in winners) == 800


def test_a_player_all_in_for_only_an_ante_wins_only_the_antes() -> None:
    """Seat 2's whole 200 stack went on its ante, matching nothing. Two others
    put 200 in live. Counted off bet_total all three sat at the same 200 level,
    so one pot of 600 formed with everyone eligible and the ante-only seat could
    take the lot. It can win the dead money and no more."""
    players = _table(live={0: 200, 1: 200}, antes={2: 200})
    players[2].stack = 0
    # the ante-only seat holds the winner, the others the losing hands
    players[2].set_hole_cards(HANDS[0])
    players[0].set_hole_cards(HANDS[1])
    players[1].set_hole_cards(HANDS[2])
    before = {p.seat: p.stack for p in players}

    _winners, _showed, pot_total = settle(players, {0, 1, 2}, BOARD, "bba")

    by_seat = {p.seat: p for p in players}
    assert pot_total == 600
    assert by_seat[2].stack == 200, "the ante-only seat may win only the 200 of antes"
    assert by_seat[0].stack == before[0] + 400, "the live 400 goes to the best live hand"


def test_the_chips_balance_across_every_ante_mode() -> None:
    """Nothing is created or destroyed once the antes live in their own pool."""
    for mode in ("none", "traditional", "bba"):
        for seed in range(15):
            session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(seed))
            session.tournament.ante_mode = mode
            session.tournament.level_index = 6  # a level that charges a big blind ante
            session.start()
            engine = session.engine
            guard = 0
            while not engine.is_complete and guard < 2000:
                actor = engine.current_actor
                if actor is None:
                    break
                if session.tournament.players[actor].is_human:
                    engine.act(actor, Action(ActionType.FOLD))
                else:
                    engine.advance_bot(actor)
                guard += 1
            total = sum(p.stack for p in session.tournament.players)
            assert total == 9 * 45_000, f"{mode} seed {seed}: {total} chips in play"


def test_a_partial_traditional_ante_wins_only_what_it_paid() -> None:
    """Seat 0 could only post 5 of the 20 ante, then had nothing live. With the
    best hand it wins 5 from each ante and no more. Treating every ante as one
    shared dead layer paid it 45 instead of 15."""
    players = _table(live={1: 200, 2: 200}, antes={0: 5, 1: 20, 2: 20})
    players[0].stack = 0
    before = {p.seat: p.stack for p in players}

    _winners, _showed, pot_total = settle(players, {0, 1, 2}, BOARD, "traditional")

    by_seat = {p.seat: p for p in players}
    assert pot_total == 445
    assert by_seat[0].stack == 15, "the short ante can only win 5 from each of the three"
    assert by_seat[1].stack == before[1] + 430, "the rest belongs to the best live hand"
    assert by_seat[2].stack == before[2]


def test_a_split_pot_rounds_the_odd_chip_once() -> None:
    """Seats 0 and 1 tie. Keeping the dead antes in a layer of their own, with
    the same three contenders as the live pot, rounded the odd chip twice and
    paid 4 and 2 where it owed 3 and 3."""
    players = _table(live={0: 1, 1: 1, 2: 1}, antes={0: 1, 1: 1, 2: 1}, stack=0)
    players[0].set_hole_cards(HANDS[0])
    players[1].set_hole_cards([Card(Rank.ACE, Suit.HEARTS), Card(Rank.ACE, Suit.SPADES)])
    players[2].set_hole_cards(HANDS[2])

    settle(players, {0, 1, 2}, BOARD, "bba")

    by_seat = {p.seat: p for p in players}
    assert (by_seat[0].stack, by_seat[1].stack) == (3, 3), "the odd chip was rounded twice"
    assert by_seat[2].stack == 0
