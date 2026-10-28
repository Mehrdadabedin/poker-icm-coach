"""The leaderboard query on PostgreSQL (plan 102): points by finish place, the
Monday boundary, abandoned and unfinished tournaments. Fresh schema per test.
Skips without a database."""
from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import Engine, create_engine, insert, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings, sqlalchemy_url
from app.database.session import engine as main_engine
from app.models.orm_history import history_tournaments
from app.models.orm_profiles import user_profiles
from app.services import history_archive, leaderboard


def _reachable() -> bool:
    try:
        with main_engine.connect():
            return True
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="PostgreSQL is not running")

NOW = datetime(2026, 10, 28, 12, tzinfo=UTC)
MONDAY = leaderboard.week_start(NOW)


@pytest.fixture()
def db() -> Iterator[Engine]:
    schema = f"board_test_{uuid.uuid4().hex[:8]}"
    with main_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(sqlalchemy_url(settings.database_url),
                           connect_args={"options": f"-csearch_path={schema}"})
    history_archive.bind_history_archive(engine, True)
    leaderboard.clear_cache()
    try:
        yield engine
    finally:
        leaderboard.clear_cache()
        history_archive.bind_history_archive(None, False)
        engine.dispose()
        with main_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def _add(engine: Engine, owner: str, place: int | None, ended: datetime | None,
         status: str = "finished") -> None:
    with engine.begin() as connection:
        connection.execute(insert(history_tournaments).values(
            id=uuid.uuid4().hex[:32], owner=owner, table_label="A", started_at=NOW, ended_at=ended,
            status=status, finish_place=place, starting_stack=45000))


def _named(engine: Engine, *owners: str) -> None:
    user_profiles.create(engine, checkfirst=True)  # the fixture only builds the history tables
    with engine.begin() as connection:
        for owner in owners:
            connection.execute(insert(user_profiles).values(
                owner=owner, first_name="F", last_name="L", display_name=owner.upper(),
                birthday=date(1990, 1, 1), gender="man"))


def test_points_wins_and_played_by_finish_place(db: Engine) -> None:
    for place in (1, 2, 9, 1):
        _add(db, "ana", place, NOW)
    _named(db, "ana")
    rows, names = leaderboard._query(db, None)
    assert [(o, p, w, n) for o, p, w, n, _ in rows] == [("ana", 272, 2, 4)]
    assert names == {"ana": "ANA"}


def test_abandoned_active_and_placeless_tournaments_give_nothing(db: Engine) -> None:
    _add(db, "ben", 1, NOW, "abandoned")
    _add(db, "ben", None, None, "active")
    _add(db, "ben", None, NOW, "finished")
    assert leaderboard._query(db, None)[0] == []


def test_the_week_starts_at_monday_midnight_utc(db: Engine) -> None:
    _add(db, "cy", 1, MONDAY - timedelta(seconds=1))
    _add(db, "cy", 2, MONDAY)
    rows, _ = leaderboard._query(db, MONDAY)
    assert [(p, n) for _, p, _, n, _ in rows] == [(70, 1)]
    assert [(p, n) for _, p, _, n, _ in leaderboard._query(db, None)[0]] == [(170, 2)]


def test_snapshot_reads_the_database_and_names_only_profiles(db: Engine) -> None:
    _add(db, "di", 1, NOW)
    _add(db, "ed", 3, NOW)
    _named(db, "di")
    snap = leaderboard.snapshot("week", NOW)
    board = leaderboard.rank(snap.rows, snap.names, leaderboard.EXCLUDED, "ed")
    assert [e.name for e in board.top] == ["DI"] and board.me == "noProfile"
