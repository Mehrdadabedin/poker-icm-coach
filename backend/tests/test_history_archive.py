"""Saved hand history (plan 076): every finished hand is kept per user and
tournament in PostgreSQL, so a deploy or restart no longer erases it.

Real PostgreSQL, in a fresh schema per test: the archive must create its own
tables (Render never runs Alembic). Skips when no database answers.
"""
from __future__ import annotations

import random
import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings, sqlalchemy_url
from app.database.session import engine as main_engine
from app.services import history_archive
from app.services.game_session import GameSession
from app.services.hand_history import record_from_dict
from tests.api_helpers import login_client


def _reachable() -> bool:
    try:
        with main_engine.connect():
            return True
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="PostgreSQL is not running")


@pytest.fixture()
def db() -> Iterator[Engine]:
    schema = f"hist_test_{uuid.uuid4().hex[:8]}"
    with main_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(sqlalchemy_url(settings.database_url),
                           connect_args={"options": f"-csearch_path={schema}"})
    try:
        yield engine
    finally:
        history_archive.bind_history_archive(None, False)
        engine.dispose()
        with main_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def _finished_hand(owner: str) -> GameSession:
    session = GameSession(starting_stack=45_000, rng=random.Random(7), owner=owner, table_label="A")
    session.start()
    while session.phase() != "handOver":
        session.hero_action("call" if session.state()["toCall"] else "check")
    return session


def test_off_means_nothing_is_saved_and_nothing_breaks() -> None:
    archive = history_archive.bind_history_archive(None, False)
    assert archive.enabled is False
    _finished_hand("NoDbUser")  # plays and records as before
    assert archive.tournaments("NoDbUser") == []


def test_the_archive_creates_its_tables_on_an_empty_database(db: Engine) -> None:
    assert history_archive.bind_history_archive(db, True).enabled
    assert {"history_tournaments", "history_hands"} <= set(inspect(db).get_table_names())


def test_a_hand_is_saved_when_it_ends_and_outlives_a_restart(db: Engine) -> None:
    history_archive.bind_history_archive(db, True)
    session = _finished_hand("SaverOne")
    live = session.history.all()[0]
    history_archive.bind_history_archive(db, True)  # a new process reading the same database
    archive = history_archive.archive
    [tournament] = archive.tournaments("SaverOne")
    assert (tournament["id"], tournament["table_label"], tournament["status"], tournament["hands"]) == (
        session.session_id, "A", "active", 1)
    [saved] = archive.hands("SaverOne", session.session_id) or []
    again = record_from_dict(saved)
    assert again.hand_number == live.hand_number and again.net_chips() == live.net_chips()
    assert again.decisions == live.decisions and again.hero_cards == live.hero_cards
    assert again.seat_names == live.seat_names and len(again.seat_names) == 9


def test_saving_the_same_hand_twice_counts_it_once(db: Engine) -> None:
    archive = history_archive.bind_history_archive(db, True)
    session = _finished_hand("SaverTwice")
    archive.save_hand(session, session.history.all()[0])
    assert archive.tournaments("SaverTwice")[0]["hands"] == 1
    assert len(archive.hands("SaverTwice", session.session_id) or []) == 1


def test_the_end_of_a_tournament_is_saved_once(db: Engine) -> None:
    archive = history_archive.bind_history_archive(db, True)
    session = _finished_hand("Finisher")
    session.status, session.hero_finish_place = "finished", 5
    archive.save_tournament(session)
    first = archive.tournaments("Finisher")[0]
    archive.save_tournament(session)
    second = archive.tournaments("Finisher")[0]
    assert (first["status"], first["finish_place"]) == ("finished", 5)
    assert first["ended_at"] is not None and second["ended_at"] == first["ended_at"]


def _api_hand(client: TestClient) -> str:
    """Start a table through the API and play its first hand; returns its id."""
    table: str = client.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0}).json()["tableId"]
    for _ in range(60):
        state = client.get(f"/api/game/{table}/state").json()
        if state["phase"] == "handOver":
            break
        client.post(f"/api/game/{table}/action", json={"kind": "call" if state["toCall"] else "check"})
    return table


def test_a_user_sees_only_their_own_tournaments_through_the_api(db: Engine) -> None:
    history_archive.bind_history_archive(db, True)
    owner, other = login_client("HistOwner"), login_client("HistOther")
    table = _api_hand(owner)
    listed = owner.get("/api/history/tournaments").json()["tournaments"]
    assert [t["tableId"] for t in listed] == [table] and listed[0]["hands"] == 1
    saved = owner.get(f"/api/history/tournaments/{table}/hands").json()["hands"]
    assert saved == owner.get(f"/api/game/{table}/hands").json()["hands"]  # same shape as live
    assert other.get(f"/api/history/tournaments/{table}/hands").status_code == 404
    assert other.get("/api/history/tournaments").json()["tournaments"] == []


def test_the_report_reads_only_the_users_own_saved_hands(db: Engine) -> None:
    archive = history_archive.bind_history_archive(db, True)
    owner, other = login_client("ReportOwner"), login_client("ReportOther")
    table = _api_hand(owner)
    report = owner.get("/api/history/report").json()
    assert (report["summary"]["tournaments"], report["summary"]["hands"]) == (1, 1)
    assert report["stack"]["tableId"] == table and len(report["stack"]["points"]) == 2
    assert owner.get(f"/api/history/report?tournament={table}&period=7d").json()["summary"]["hands"] == 1
    assert other.get(f"/api/history/report?tournament={table}").status_code == 404
    assert other.get("/api/history/report").json()["summary"]["tournaments"] == 0
    assert archive.hands_by_tournament("ReportOther", [table]) == {}


def test_deleting_a_user_removes_their_history(db: Engine) -> None:
    archive = history_archive.bind_history_archive(db, True)
    _finished_hand("Leaver")
    _finished_hand("Stayer")
    assert archive.delete_owner("Leaver") == 1
    assert archive.tournaments("Leaver") == [] and len(archive.tournaments("Stayer")) == 1
    with db.connect() as connection:
        left = connection.execute(text("SELECT count(*) FROM history_hands WHERE owner = 'Leaver'"))
        assert left.scalar_one() == 0
