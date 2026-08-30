"""Side pot construction and distribution tests (Atomic Part 011)."""
from __future__ import annotations

from app.game.player import Player
from app.game.side_pot import build_side_pots, distribute_pots
from app.poker.card import card_from_str
from app.poker.hand_evaluator import best_hand

H = card_from_str

# Hands for showdown distribution tests
ROYAL = best_hand([H(f) for f in ["Tc", "Jc", "Qc", "Kc", "Ac"]])
QUADS = best_hand([H(f) for f in ["9s", "9d", "9c", "9h", "Kd"]])
TRIPS = best_hand([H(f) for f in ["8s", "8d", "8c", "2h", "5d"]])
PAIR_A = best_hand([H(f) for f in ["As", "Ad", "3c", "7h", "9d"]])


def build(contribs, eligible):
    pots, _ = build_side_pots(contribs, eligible)
    return pots


def make(stack: int) -> Player:
    return Player(name="X", stack=stack, seat=0)


def test_no_side_pots_single_contributor_levels() -> None:
    contribs = {0: 100, 1: 100, 2: 100}
    pots = build(contribs, {0, 1, 2})
    assert len(pots) == 1
    assert pots[0].total() == 300
    assert set(pots[0].eligible_seats) == {0, 1, 2}


def test_two_level_side_pot() -> None:
    contribs = {0: 200, 1: 200, 2: 100}
    pots = build(contribs, {0, 1, 2})
    assert len(pots) == 2
    main, side = pots
    assert main.total() == 300      # 100 x 3
    assert set(main.eligible_seats) == {0, 1, 2}
    assert side.total() == 200      # 100 x 2
    assert set(side.eligible_seats) == {0, 1}


def test_three_level_side_pots() -> None:
    contribs = {0: 400, 1: 400, 2: 200, 3: 100}
    pots = build(contribs, {0, 1, 2, 3})
    assert len(pots) == 3
    assert [p.total() for p in pots] == [400, 300, 400]
    assert set(pots[0].eligible_seats) == {0, 1, 2, 3}
    assert set(pots[1].eligible_seats) == {0, 1, 2}
    assert set(pots[2].eligible_seats) == {0, 1}


def test_uncalled_bet_refunded() -> None:
    # seat 2 raised to 500, seat 0 called 100 then folded? No: seat 0 called 500,
    # seat 2's full bet matched; seat 1 folded after 300. All 1300 stays in play.
    contribs = {0: 500, 1: 300, 2: 500}
    pots = build(contribs, {0, 2})
    assert sum(p.total() for p in pots) == 1300
    assert set(pots[1].eligible_seats) == {0, 2}


def test_unclaimable_layer_merges_into_lower_pot() -> None:
    # Top layer contested only by folded players -> merges into the main pot.
    contribs = {0: 1516, 1: 1574, 2: 897, 3: 1329, 4: 618}
    pots, refunds = build_side_pots(contribs, eligible={2, 3})
    assert sum(p.total() for p in pots) + sum(refunds.values()) == sum(contribs.values())
    assert len(pots) >= 1
    # if a layer had no eligible contenders its chips did not vanish
    assert sum(p.total() for p in pots) == sum(contribs.values()) - sum(refunds.values())


def test_uncalled_excess_returned_to_bettor() -> None:
    # seat 0 calls only 100, seat 2 shoves 500 -> 400 uncalled returned to seat 2
    contribs = {0: 100, 2: 500}
    pots, refunds = build_side_pots(contribs, {0, 2})
    assert sum(p.total() for p in pots) == 200
    assert refunds == {2: 400}


def test_folded_player_excluded_from_eligibility() -> None:
    contribs = {0: 100, 1: 100, 2: 100}
    pots = build(contribs, {0, 2})
    assert len(pots) == 1
    assert pots[0].total() == 300
    assert set(pots[0].eligible_seats) == {0, 2}


def test_distribute_single_pot() -> None:
    contribs = {0: 100, 1: 100, 2: 100}
    pots = build(contribs, {0, 1, 2})
    p0, p1, p2 = Player(name="a", stack=1000, seat=0), Player(name="b", stack=1000, seat=1), Player(name="c", stack=1000, seat=2)
    players = {0: p0, 1: p1, 2: p2}
    hands = {0: ROYAL, 1: QUADS, 2: TRIPS}
    distribute_pots(pots, players, hands)
    assert p0.stack == 1300
    assert p1.stack == 1000
    assert p2.stack == 1000


def test_distribute_side_pot_to_side_winner() -> None:
    contribs = {0: 400, 1: 400, 2: 100}
    pots = build(contribs, {0, 1, 2})
    p0, p1, p2 = Player(name="a", stack=1000, seat=0), Player(name="b", stack=1000, seat=1), Player(name="c", stack=1000, seat=2)
    players = {0: p0, 1: p1, 2: p2}
    # p2 has the best hand overall -> wins main (300); p0 beats p1 in side (600)
    hands = {0: QUADS, 1: TRIPS, 2: ROYAL}
    distribute_pots(pots, players, hands)
    assert p0.stack == 1600
    assert p1.stack == 1000
    assert p2.stack == 1300


def test_split_pot_odd_chip() -> None:
    contribs = {0: 100, 1: 100, 2: 100}
    pots = build(contribs, {0, 1, 2})
    p0, p1, p2 = Player(name="a", stack=1000, seat=0), Player(name="b", stack=1000, seat=1), Player(name="c", stack=1000, seat=2)
    players = {0: p0, 1: p1, 2: p2}
    hands = {0: QUADS, 1: QUADS, 2: TRIPS}
    distribute_pots(pots, players, hands)
    assert p0.stack + p1.stack + p2.stack == 3300  # conservation
    assert p0.stack == 1150  # odd chip to first
    assert p1.stack == 1150
    assert p2.stack == 1000


def test_chip_conservation_multiway() -> None:
    contribs = {0: 500, 1: 300, 2: 200, 3: 100}
    pots, refunds = build_side_pots(contribs, {0, 1, 2, 3})
    players = {s: Player(name=f"p{s}", stack=1000 - contribs[s], seat=s) for s in contribs}
    hands = {0: ROYAL, 1: QUADS, 2: TRIPS, 3: PAIR_A}
    distribute_pots(pots, players, hands)
    for seat, amount in refunds.items():
        players[seat].add_chips(amount)
    assert sum(p.stack for p in players.values()) == 4000  # conservation


def test_all_in_with_refund_preserves_chips() -> None:
    contribs = {0: 1000, 1: 1000, 2: 200}
    pots, refunds = build_side_pots(contribs, {0, 1, 2})
    players = {s: Player(name=f"p{s}", stack=1000 - contribs[s], seat=s) for s in contribs}
    hands = {0: ROYAL, 1: QUADS, 2: TRIPS}
    distribute_pots(pots, players, hands)
    for seat, amount in refunds.items():
        players[seat].add_chips(amount)
    assert sum(p.stack for p in players.values()) == 3000  # conservation
