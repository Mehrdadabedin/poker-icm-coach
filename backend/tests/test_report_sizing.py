"""Bet sizing in the Report (plan 079). The saved hand has no pot per action,
so the pot before each hero bet is rebuilt from the final pot; the first test
checks the rebuild against the live table's pot, bet by bet."""
from __future__ import annotations

import random

from app.game.hand_result import HandAction
from app.poker.card import card_from_str
from app.services.game_session import GameSession
from app.services.hand_history import HandHistoryRecord
from app.services.report import build_report
from app.services.report_sizing import bet_sizes, hero_bets

FRACTIONS = (0.2, 0.33, 0.5, 0.75, 1.0, 1.5)


def _play(seed: int, hands: int) -> list[tuple[list[tuple[str, int, int]], HandHistoryRecord]]:
    """Hands where the hero bets a random share of the pot whenever no one has
    bet; each comes with the bets as the live table saw them."""
    rng = random.Random(seed)
    session = GameSession(starting_stack=45_000, rng=random.Random(seed))
    session.start()
    played: list[tuple[list[tuple[str, int, int]], HandHistoryRecord]] = []
    live: list[tuple[str, int, int]] = []
    while len(played) < hands:
        state = session.state()
        if session.phase() == "handOver":
            played.append((live, session.history.all()[-1]))
            live = []
            session.next_hand()
            if session.tournament.players[session.hero_seat].awaiting_reentry:
                session.reentry()  # a bust ends the hero's bets, so re-enter
            continue
        kinds = {a["kind"]: a for a in state["legalActions"]}
        if state["street"] != "preflop" and "bet" in kinds and state["toCall"] == 0:
            low, high = kinds["bet"]["minAmount"], kinds["bet"]["maxAmount"]
            amount = min(high, max(low, round(state["pot"] * rng.choice(FRACTIONS))))
            live.append((state["street"], amount, state["pot"]))
            session.hero_action("bet", amount)
        else:
            session.hero_action(next(k for k in ("check", "call", "fold") if k in kinds))
    return played


def test_the_rebuilt_pot_matches_the_live_table_bet_by_bet() -> None:
    played = _play(seed=21, hands=40)
    assert sum(len(live) for live, _ in played) >= 20  # enough bets to mean something
    for live, record in played:
        assert hero_bets(record) == live, f"hand {record.hand_number}"


def _record(actions: list[tuple[int, str, int | None, str]], pot_total: int) -> HandHistoryRecord:
    return HandHistoryRecord(
        hand_number=1, hero_cards=[card_from_str("As"), card_from_str("Kh")], hero_position="BTN",
        community_cards=[card_from_str(c) for c in ("2c", "7d", "9h", "Js")], starting_stack=45_000,
        ending_stack=45_000, blind_level="50/100", actions=[HandAction(*a) for a in actions],
        pot_total=pot_total, winner_seats=[0])


def test_sizes_are_shares_of_the_pot_and_raises_do_not_count() -> None:
    # pot 750 at the flop; a third-pot bet is called; a pot-size turn bet is
    # not called, and the final pot still counts it (every chip put in)
    third_then_pot = _record([
        (3, "raise", 300, "preflop"), (0, "call", 300, "preflop"),
        (0, "bet", 250, "flop"), (3, "call", 250, "flop"),
        (0, "bet", 1250, "turn"), (3, "fold", None, "turn")], pot_total=2500)
    assert hero_bets(third_then_pot) == [("flop", 250, 750), ("turn", 1250, 1250)]
    raised = _record([
        (3, "raise", 300, "preflop"), (0, "call", 300, "preflop"),
        (3, "bet", 200, "flop"), (0, "raise", 600, "flop"), (3, "fold", None, "flop")], pot_total=1550)
    assert hero_bets(raised) == []
    sizes = {s["street"]: s for s in bet_sizes([third_then_pot, raised])}
    assert sizes["flop"]["bets"] == 1 and sizes["turn"]["bets"] == 1 and sizes["river"]["bets"] == 0
    assert [b["count"] for b in sizes["flop"]["buckets"]] == [0, 1, 0, 0, 0, 0]
    assert [b["count"] for b in sizes["turn"]["buckets"]] == [0, 0, 0, 0, 1, 0]


def test_the_report_carries_bet_sizes() -> None:
    row = {"id": "t1", "table_label": "A", "started_at": __import__("datetime").datetime(2026, 10, 15),
           "ended_at": None, "status": "active", "finish_place": None, "starting_stack": 45_000, "hands": 1}
    hand = _record([(0, "bet", 375, "flop"), (3, "fold", None, "flop")], pot_total=1125)
    report = build_report([row], [], {"t1": [hand]}, period="all", tournament=None)
    assert report["betSizes"][0] == {"street": "flop", "bets": 1, "buckets": [
        {"size": "under25", "count": 0}, {"size": "third", "count": 0}, {"size": "half", "count": 1},
        {"size": "twoThirds", "count": 0}, {"size": "pot", "count": 0}, {"size": "over", "count": 0}]}
