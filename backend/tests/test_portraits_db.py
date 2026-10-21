"""Player portraits in PostgreSQL (plan 094): the store Render uses, since its
disk is wiped on every deploy. A fresh schema per test, because the store must
create its own table (Render never runs Alembic). Skips without a database.
"""
from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings, sqlalchemy_url
from app.database.session import engine as main_engine
from app.services import portraits


def _reachable() -> bool:
    try:
        with main_engine.connect():
            return True
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="PostgreSQL is not running")

JPEG = b"\xff\xd8\xff\xe0" + bytes(range(256))


@pytest.fixture()
def db() -> Iterator[Engine]:
    schema = f"portrait_test_{uuid.uuid4().hex[:8]}"
    with main_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(sqlalchemy_url(settings.database_url),
                           connect_args={"options": f"-csearch_path={schema}"})
    try:
        yield engine
    finally:
        portraits.bind_portraits(None, False)
        engine.dispose()
        with main_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def test_the_store_creates_its_table_and_keeps_photos_across_a_restart(db: Engine) -> None:
    store = portraits.bind_portraits(db, True)
    assert isinstance(store, portraits.DatabasePortraits)
    assert "user_portraits" in inspect(db).get_table_names()
    store.put("DbFace", "image/jpeg", JPEG)

    again = portraits.bind_portraits(db, True)  # a deploy: a new process, same database
    found = again.get("DbFace")
    assert found is not None and found.image == JPEG and found.status == "pending"
    assert [p.owner for p in again.pending()] == ["DbFace"]


def test_review_replace_and_delete(db: Engine) -> None:
    store = portraits.bind_portraits(db, True)
    assert store.review("Nobody", "approved") is None
    store.put("DbFace", "image/jpeg", JPEG)
    reviewed = store.review("DbFace", "approved")
    assert reviewed is not None and reviewed.status == "approved"
    assert store.pending() == []
    store.put("DbFace", "image/png", b"\x89PNG\r\n\x1a\n")
    replaced = store.get("DbFace")
    assert replaced is not None and (replaced.status, replaced.content_type) == ("pending", "image/png")
    assert store.delete("DbFace") is True
    assert store.get("DbFace") is None and store.delete("DbFace") is False
