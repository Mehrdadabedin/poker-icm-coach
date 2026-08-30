"""Hand history tests (Atomic Part 031)."""
from __future__ import annotations

import pytest

from app.game.hand_result import HandAction
from app.poker.card import card_from_str
from app.services.hand_history import HandHistoryRecord, HandHistoryStore, replay

H = card_from_str


def make_record(hand_number: int, stage: str = "BUBBLE") -> HandHistoryRecord:
    return HandHistoryRecord(
        hand_number=hand_number,
        hero_cards=[H("As"), H("Kh")],
        hero_position="CO",
        community_cards=[H("Ac"), H("7d"), H("2s")],
        starting_stack=30000,
        ending_stack=32000,
        blind_level="100/200",
        actions=[HandAction(5, "raise", 600, "preflop")],
        pot_total=3400,
        winner_seats=[0],
        coach_recommendation="RAISE",
        hero_decision="RAISE",
        icm_pressure="HIGH",
        tournament_stage=stage,
        grade="PREFERRED",
    )


def test_record_fields() -> None:
    rec = make_record(1)
    assert rec.hand_number == 1
    assert rec.pot_total == 3400
    assert rec.net_chips() == 2000


def test_store_append_and_lookup() -> None:
    store = HandHistoryStore()
    store.append(make_record(1))
    store.append(make_record(2))
    assert len(store) == 2
    assert store.hand(2).hero_position == "CO"


def test_store_filter_by_stage() -> None:
    store = HandHistoryStore()
    store.append(make_record(1, stage="BUBBLE"))
    store.append(make_record(2, stage="EARLY"))
    store.append(make_record(3, stage="BUBBLE"))
    bubble_hands = store.filter(stage="BUBBLE")
    assert [h.hand_number for h in bubble_hands] == [1, 3]


def test_store_missing_hand_raises() -> None:
    store = HandHistoryStore()
    with pytest.raises(KeyError):
        store.hand(99)


def test_replay_produces_readable_log() -> None:
    rec = make_record(1)
    log = replay(rec)
    assert "Hand #1" in log
    assert "CO" in log
    assert "raise" in log
    assert "BUBBLE" in log


def test_replay_lists_actions_in_order() -> None:
    rec = make_record(1)
    rec.actions = [
        HandAction(3, "fold", None, "preflop"),
        HandAction(5, "raise", 600, "preflop"),
    ]
    log = replay(rec)
    assert log.index("fold") < log.index("raise")
