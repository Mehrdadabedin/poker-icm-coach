"""Player profiles in PostgreSQL (plan 095): the store Render uses, since its
disk is wiped on every deploy. A fresh schema per test, because the store must
create its own table (Render never runs Alembic). Skips without a database.
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
from app.services import profiles
from app.services.profiles import Profile


def _reachable() -> bool:
    try:
        with main_engine.connect():
            return True
    except SQLAlchemyError:
        return False


pytestmark = pytest.mark.skipif(not _reachable(), reason="PostgreSQL is not running")


@pytest.fixture()
def db() -> Iterator[Engine]:
    schema = f"profile_test_{uuid.uuid4().hex[:8]}"
    with main_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(sqlalchemy_url(settings.database_url),
                           connect_args={"options": f"-csearch_path={schema}"})
    try:
        yield engine
    finally:
        profiles.bind_profiles(None, False)
        engine.dispose()
        with main_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


def _profile(display_name: str = "Ana T.") -> Profile:
    return Profile("DbAna", "Ana", "Torres", display_name, date(1990, 3, 2), "self_described",
                   "agender")


def test_the_store_creates_its_table_and_keeps_profiles_across_a_restart(db: Engine) -> None:
    store = profiles.bind_profiles(db, True)
    assert isinstance(store, profiles.DatabaseProfiles)
    assert "user_profiles" in inspect(db).get_table_names()
    store.put(_profile())

    again = profiles.bind_profiles(db, True)  # a deploy: a new process, same database
    found = again.get("DbAna")
    assert found is not None
    assert (found.first_name, found.birthday, found.gender_text) == ("Ana", date(1990, 3, 2),
                                                                     "agender")


def test_replace_and_delete(db: Engine) -> None:
    store = profiles.bind_profiles(db, True)
    store.put(_profile())
    store.put(_profile("Ana 2"))
    found = store.get("DbAna")
    assert found is not None and found.display_name == "Ana 2"
    assert store.delete("DbAna") is True
    assert store.get("DbAna") is None and store.delete("DbAna") is False
