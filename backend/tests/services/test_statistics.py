"""Session statistics tests (Atomic Part 032)."""
from __future__ import annotations

from app.poker.card import card_from_str
from app.services.hand_history import HandHistoryRecord
from app.services.statistics import aggregate, biggest_leak, position_performance

H = card_from_str


def record(hand_number: int, decision: str, grade: str | None, net: int,
           position: str = "CO", blind_level: str = "100/200",
           pressure: str = "LOW", won: bool = False) -> HandHistoryRecord:
    return HandHistoryRecord(
        hand_number=hand_number, hero_cards=[H("As"), H("Kh")], hero_position=position,
        community_cards=[], starting_stack=30000, ending_stack=30000 + net,
        blind_level=blind_level, actions=[], pot_total=1000,
        winner_seats=[0] if won else [1], coach_recommendation="RAISE",
        hero_decision=decision, icm_pressure=pressure,
        tournament_stage="BUBBLE", grade=grade,
    )


def test_aggregate_counts() -> None:
    records = [
        record(1, "RAISE", "PREFERRED", 500, won=True),
        record(2, "FOLD", "PREFERRED", -100),
        record(3, "CALL", "SUBOPTIMAL", -300),
    ]
    stats = aggregate(records)
    assert stats.hands_played == 3
    assert stats.hands_won == 1
    assert stats.vpip == 2 / 3
    assert stats.pfr == 1 / 3
    assert stats.chip_profit == 100
    assert stats.average_pot == 1000.0


def test_coach_agreement() -> None:
    records = [
        record(1, "RAISE", "PREFERRED", 0),
        record(2, "FOLD", "PREFERRED", 0),
        record(3, "CALL", "SUBOPTIMAL", 0),
        record(4, "CALL", "ACCEPTABLE", 0),
    ]
    stats = aggregate(records)
    # preferred=1.0, acceptable=0.5, suboptimal=0 -> (1 + 1 + 0 + 0.5)/4
    assert abs(stats.coach_agreement - 0.625) < 1e-9


def test_icm_mistakes_count() -> None:
    records = [
        record(1, "CALL", "SUBOPTIMAL", -400, pressure="HIGH"),
        record(2, "CALL", "SUBOPTIMAL", -200, pressure="LOW"),
        record(3, "RAISE", "PREFERRED", 100, pressure="VERY HIGH"),
    ]
    stats = aggregate(records)
    assert stats.icm_mistakes == 1


def test_position_performance() -> None:
    records = [
        record(1, "FOLD", "PREFERRED", -500, position="UTG"),
        record(2, "FOLD", "PREFERRED", -500, position="UTG"),
        record(3, "CALL", "ACCEPTABLE", 800, position="BTN"),
    ]
    perf = position_performance(records)
    assert perf["UTG"] == -1000
    assert perf["BTN"] == 800


def test_biggest_leak() -> None:
    records = [
        record(1, "CALL", "SUBOPTIMAL", -600, position="BB"),
        record(2, "CALL", "SUBOPTIMAL", -400, position="BB"),
        record(3, "RAISE", "PREFERRED", 300, position="BTN"),
    ]
    leak = biggest_leak(records)
    assert leak is not None
    assert "BB" in leak
    assert "call" in leak.lower() or "call" in leak


def test_bb_won_lost() -> None:
    records = [record(1, "RAISE", "PREFERRED", 400)]
    stats = aggregate(records)
    assert stats.bb_won_lost == 2.0  # 400 chips / 200 BB


def test_empty_session() -> None:
    stats = aggregate([])
    assert stats.hands_played == 0
    assert stats.chip_profit == 0
