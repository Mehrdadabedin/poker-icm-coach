"""Quiz totals in PostgreSQL (plan 110): the table is created by the store and the
upsert adds up. Fresh schema per test. Skips without a database.
"""
from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import date

import pytest
from sqlalchemy import Engine, create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings, sqlalchemy_url
from app.database.session import engine as main_engine
from app.services import quiz_totals


def _reachable() -> bool:
    try:
        with main_engine.connect():
            return True
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="PostgreSQL is not running")
DAY = date(2026, 11, 3)


@pytest.fixture()
def db() -> Iterator[Engine]:
    schema = f"quiz_test_{uuid.uuid4().hex[:8]}"
    with main_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(sqlalchemy_url(settings.database_url),
                           connect_args={"options": f"-csearch_path={schema}"})
    try:
        yield engine
    finally:
        quiz_totals.bind_quiz_totals(None, False)
        engine.dispose()
        with main_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def test_answered_correct_and_best_streak_add_up(db: Engine) -> None:
    totals = quiz_totals.bind_quiz_totals(db, True)
    assert isinstance(totals, quiz_totals.DatabaseQuizTotals)
    assert "quiz_daily" in inspect(db).get_table_names()
    for correct, streak in [(True, 1), (True, 2), (True, 3), (False, 0), (True, 1)]:
        last = totals.add("Dbq", DAY, correct, streak)
    assert (last.answered, last.correct, last.best_streak) == (5, 4, 3), (
        "best streak must keep the highest value, not the latest")
    assert totals.get("Dbq", date(2026, 11, 4)).answered == 0, "each day has its own row"
    assert totals.get("Other", DAY).answered == 0


def test_a_restart_keeps_the_totals_and_delete_removes_them(db: Engine) -> None:
    quiz_totals.bind_quiz_totals(db, True).add("Dbq", DAY, True, 1)
    again = quiz_totals.bind_quiz_totals(db, True)
    assert again.get("Dbq", DAY).answered == 1
    assert again.delete_owner("Dbq") == 1 and again.get("Dbq", DAY).answered == 0


def test_days_lists_one_players_rows_in_date_order(db: Engine) -> None:
    totals = quiz_totals.bind_quiz_totals(db, True)
    totals.add("Dbq", date(2026, 11, 4), True, 1)
    totals.add("Dbq", DAY, False, 0)
    totals.add("Other", DAY, True, 1)
    assert totals.days("Dbq") == [(DAY, quiz_totals.DayTotals(1, 0, 0)),
                                  (date(2026, 11, 4), quiz_totals.DayTotals(1, 1, 1))]
