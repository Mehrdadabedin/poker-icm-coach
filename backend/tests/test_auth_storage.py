"""Accounts and logins in PostgreSQL (AUTH_STORAGE=database).

Render wipes the container disk on every deploy, so the JSON files lost every
account. These tests pin what the database document must guarantee: state
survives a restart, an unreachable database stops startup instead of starting
empty, and a failed save neither loses the in-memory account nor logs secrets.
"""
from __future__ import annotations

import threading
import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.config import sqlalchemy_url
from app.database.session import build_engine, engine
from app.models.orm_documents import app_documents
from app.services.auth import AuthStore
from app.services.documents import DatabaseDocument, FileDocument
from app.services.user_registry import UserRegistry
from tests.concurrency_helpers import WAIT_TIMEOUT, Gate

UNREACHABLE = "postgresql+psycopg://nobody:nothing@127.0.0.1:1/none"


def _database_is_reachable() -> bool:
    try:
        with engine.connect():
            return True
    except SQLAlchemyError:
        return False


needs_db = pytest.mark.skipif(
    not _database_is_reachable(),
    reason="no PostgreSQL on DATABASE_URL (docker compose up -d postgres)",
)


@pytest.fixture
def doc_name() -> Iterator[str]:
    """A document name no other test or developer data uses; removed afterwards."""
    name = f"test-{uuid.uuid4().hex[:12]}"
    yield name
    with engine.begin() as connection:
        connection.execute(delete(app_documents).where(app_documents.c.name == name))


def test_render_urls_name_the_installed_driver() -> None:
    assert sqlalchemy_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert sqlalchemy_url("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert sqlalchemy_url("postgresql+psycopg://u:p@h/db") == "postgresql+psycopg://u:p@h/db"


def test_an_unreachable_database_stops_startup_instead_of_starting_empty() -> None:
    with pytest.raises(OperationalError):
        DatabaseDocument("users", build_engine(UNREACHABLE))


@needs_db
def test_accounts_survive_a_restart(doc_name: str) -> None:
    before = UserRegistry()
    before.bind_document(DatabaseDocument(doc_name, engine))
    before.register("alice", "password123")

    after = UserRegistry()
    after.bind_document(DatabaseDocument(doc_name, engine))
    assert after.verify("alice", "password123"), "the account did not survive a restart"
    assert not after.verify("alice", "wrong-password")


@needs_db
def test_logins_survive_a_restart(doc_name: str) -> None:
    before = AuthStore()
    before.bind_document(DatabaseDocument(doc_name, engine))
    token = before.login("alice")

    after = AuthStore()
    after.bind_document(DatabaseDocument(doc_name, engine))
    assert after.user_for_token(token) == "alice", "the login did not survive a restart"


@needs_db
def test_an_empty_database_is_filled_from_the_old_file(doc_name: str, tmp_path) -> None:
    old_file = str(tmp_path / "users.json")
    UserRegistry(old_file).register("carol", "password123")

    seeded = UserRegistry()
    seeded.bind_document(DatabaseDocument(doc_name, engine, FileDocument(old_file)))
    assert seeded.verify("carol", "password123")
    seeded.register("dave", "password123")  # the first save writes both

    restarted = UserRegistry()
    restarted.bind_document(DatabaseDocument(doc_name, engine))
    assert restarted.verify("carol", "password123") and restarted.verify("dave", "password123")
    with engine.connect() as connection:
        stored = connection.execute(
            select(app_documents.c.body).where(app_documents.c.name == doc_name)
        ).scalar_one()
    assert set(stored) == {"carol", "dave"}


@needs_db
def test_a_failed_save_keeps_the_account_and_logs_no_secret(
    caplog: pytest.LogCaptureFixture,
) -> None:
    # A name longer than the column fails inside the statement, and SQLAlchemy
    # puts the statement parameters (the whole body) into the error text.
    registry = UserRegistry()
    registry.bind_document(DatabaseDocument("x" * 65, engine))

    registry.register("erin", "password123")

    assert registry.verify("erin", "password123")
    # SQLAlchemy shortens long parameters, so a leak shows only the start of a field.
    entry = registry._users["erin"]  # noqa: SLF001
    assert "could not save the" in caplog.text
    for field in ("salt", "hash"):
        assert str(entry[field])[:8] not in caplog.text, f"part of the {field} reached the log"


class _Recorder:
    """A document that keeps every saved body, in order."""

    def __init__(self) -> None:
        self.saved: list[dict] = []

    def load(self) -> None:
        return None

    def save(self, body: dict) -> None:
        self.saved.append(dict(body))


class _GatedLock:
    """The write lock, except the first thread to ask parks at the gate."""

    def __init__(self, gate: Gate) -> None:
        self._gate = gate
        self._lock = threading.Lock()

    def __enter__(self) -> _GatedLock:
        self._gate.hold()
        self._lock.acquire()
        return self

    def __exit__(self, *_exc: object) -> bool:
        self._lock.release()
        return False


def test_an_older_login_snapshot_never_overwrites_a_newer_one() -> None:
    store, recorder, gate = AuthStore(), _Recorder(), Gate()
    store.bind_document(recorder)
    store._write_lock = _GatedLock(gate)  # type: ignore[assignment]  # noqa: SLF001
    gate.arm()

    # alice snapshots {alice}, then parks before writing; bob writes {alice, bob}.
    first = threading.Thread(target=store.login, args=("alice",))
    first.start()
    assert gate.entered.wait(WAIT_TIMEOUT), "alice never reached the write"
    store.login("bob")
    gate.release.set()
    first.join(WAIT_TIMEOUT)

    names = {name for name, _expires in recorder.saved[-1].values()}
    assert names == {"alice", "bob"}, f"a stale snapshot overwrote the newer one: {names}"
