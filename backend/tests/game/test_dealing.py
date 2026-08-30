"""Dealing engine tests (Atomic Part 007)."""
from __future__ import annotations

import random

from app.game.dealing import deal_flop, deal_hole_cards, deal_river, deal_turn
from app.game.player import Player
from app.poker.deck import Deck


def make_players(n: int = 9) -> list[Player]:
    return [Player(name=f"P{i}", stack=1000, seat=i) for i in range(n)]


def active_ids(players: list[Player], seats: set[int] | None = None) -> set[int]:
    if seats is None:
        return {p.seat for p in players}
    return seats


def test_hole_cards_two_each_unique() -> None:
    deck = Deck(random.Random(3))
    deck.shuffle()
    players = make_players()
    deal_hole_cards(players, deck)
    for p in players:
        assert len(p.hole_cards) == 2
        assert len(set(p.hole_cards)) == 2
    all_cards = [c for p in players for c in p.hole_cards]
    assert len(set(all_cards)) == 2 * len(players)


def test_hole_cards_skip_inactive() -> None:
    deck = Deck(random.Random(3))
    deck.shuffle()
    players = make_players()
    # seat 4 sits out
    players[4].sit_out = True
    deal_hole_cards(players, deck)
    assert players[4].hole_cards == []
    dealt = [p for p in players if not p.sit_out]
    for p in dealt:
        assert len(p.hole_cards) == 2


def test_flop_deals_three_with_burn() -> None:
    deck = Deck(random.Random(5))
    deck.shuffle()
    before = len(deck)
    flop = deal_flop(deck)
    assert len(flop) == 3
    assert len({c.encode() for c in flop}) == 3
    assert len(deck) == before - 4  # 1 burn + 3 flop


def test_turn_and_river_burn() -> None:
    deck = Deck(random.Random(5))
    deck.shuffle()
    deal_flop(deck)
    before = len(deck)
    turn = deal_turn(deck)
    assert len(deck) == before - 2  # 1 burn + 1 turn
    assert len(turn) == 1
    before = len(deck)
    river = deal_river(deck)
    assert len(deck) == before - 2
    assert len(river) == 1


def test_no_duplicates_across_whole_hand() -> None:
    deck = Deck(random.Random(11))
    deck.shuffle()
    players = make_players()
    deal_hole_cards(players, deck)
    flop = deal_flop(deck)
    turn = deal_turn(deck)
    river = deal_river(deck)
    seen = [c for p in players for c in p.hole_cards] + flop + turn + river
    assert len(seen) == len(set(seen))


def test_progressive_streets() -> None:
    deck = Deck(random.Random(2))
    deck.shuffle()
    assert deck.peek(1)[0] is not None  # future cards exist but stay hidden
    flop = deal_flop(deck)
    turn = deal_turn(deck)
    river = deal_river(deck)
    # order must be deterministic: flop cards precede turn and river in deck order
    assert all(c not in flop for c in turn + river)
    assert all(c not in turn for c in river)


def test_burn_tracked_no_reuse() -> None:
    deck = Deck(random.Random(9))
    deck.shuffle()
    total_before = 52
    players = make_players(2)
    deal_hole_cards(players, deck)  # 4 cards
    deal_flop(deck)  # 4 (1 burn + 3)
    deal_turn(deck)  # 2
    deal_river(deck)  # 2
    consumed = total_before - len(deck)
    assert consumed == 4 + 4 + 2 + 2
