"""Database persistence tests (Atomic Part 033) — real PostgreSQL."""
from __future__ import annotations

import os

import pytest
from sqlalchemy import inspect, text

from app.database.session import SessionLocal, engine
from app.game.hand_result import HandAction
from app.models.repositories import (
    create_session,
    load_hand,
    save_hand,
    save_statistics,
)
from app.poker.card import card_from_str
from app.services.hand_history import HandHistoryRecord
from app.services.statistics import aggregate

H = card_from_str

pytestmark = pytest.mark.skipif(
    os.environ.get("SKIP_DB_TESTS") == "1",
    reason="database tests disabled",
)


def test_all_tables_exist() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    for table in [
        "tournaments", "tournament_configurations", "sessions", "players",
        "opponent_profiles", "poker_hands", "hand_actions", "hand_results",
        "strategy_decisions", "coach_recommendations", "session_statistics",
    ]:
        assert table in tables, f"missing table {table}"


def test_migration_is_at_head() -> None:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
    assert len(rows) == 1
    assert rows[0][0]  # single head revision applied


def _record(n: int) -> HandHistoryRecord:
    return HandHistoryRecord(
        hand_number=n, hero_cards=[H("As"), H("Kh")], hero_position="CO",
        community_cards=[H("Ac"), H("7d"), H("2s")],
        starting_stack=30000, ending_stack=32400, blind_level="100/200",
        actions=[HandAction(5, "raise", 600, "preflop"), HandAction(0, "call", 600, "preflop")],
        pot_total=2400, winner_seats=[0], coach_recommendation="RAISE",
        hero_decision="RAISE", icm_pressure="MEDIUM", tournament_stage="EARLY",
        grade="PREFERRED",
    )


def test_hand_roundtrip() -> None:
    db = SessionLocal()
    try:
        session_id = create_session(db, "roundtrip-test")
        hand_id = save_hand(db, session_id, _record(1))
        loaded = load_hand(db, hand_id)
        assert loaded["hand_number"] == 1
        assert loaded["hero_position"] == "CO"
        assert loaded["pot_total"] == 2400
        assert loaded["winner_seats"] == [0]
        assert loaded["grade"] == "PREFERRED"
        assert len(loaded["actions"]) == 2
    finally:
        db.close()


def test_statistics_persistence() -> None:
    db = SessionLocal()
    try:
        session_id = create_session(db, "stats-test")
        stats = aggregate([_record(1), _record(2)])
        row_id = save_statistics(db, session_id, stats)
        from app.models.orm_hands import SessionStatistics

        row = db.get(SessionStatistics, row_id)
        assert row is not None
        assert row.hands_played == 2
        assert abs(row.vpip - 1.0) < 1e-9
        assert row.payload["bb_won_lost"] >= 0
    finally:
        db.close()
