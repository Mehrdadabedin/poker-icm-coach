"""Player profiles (plan 095): first and last name, display name, birthday and
gender, readable and changeable only by their owner.

Memory storage serves local runs and the test suite (lost on restart, like
portraits); the database serves Render. Personal values never reach the log: a
database error is logged with its type only, because its text embeds the
statement parameters.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from datetime import UTC, date, datetime

from sqlalchemy import Engine, delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.models.orm_profiles import user_profiles

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Profile:
    owner: str
    first_name: str
    last_name: str
    display_name: str
    birthday: date
    gender: str
    gender_text: str | None = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class MemoryProfiles:
    def __init__(self) -> None:
        self._rows: dict[str, Profile] = {}
        self._lock = threading.Lock()

    def get(self, owner: str) -> Profile | None:
        with self._lock:
            return self._rows.get(owner)

    def put(self, profile: Profile) -> Profile:
        with self._lock:
            self._rows[profile.owner] = profile
        return profile

    def delete(self, owner: str) -> bool:
        with self._lock:
            return self._rows.pop(owner, None) is not None


_FIELDS = ("first_name", "last_name", "display_name", "birthday", "gender", "gender_text",
           "updated_at")


def _row(mapping: object) -> Profile:
    m = dict(mapping)  # type: ignore[call-overload]
    return Profile(m["owner"], *(m[name] for name in _FIELDS))


class DatabaseProfiles(MemoryProfiles):
    def __init__(self, engine: Engine) -> None:
        super().__init__()
        self._engine = engine
        # Creates its own table, so a host that never runs Alembic still works.
        user_profiles.create(engine, checkfirst=True)

    def get(self, owner: str) -> Profile | None:
        query = select(user_profiles).where(user_profiles.c.owner == owner)
        with self._engine.connect() as connection:
            found = connection.execute(query).mappings().first()
        return _row(found) if found else None

    def put(self, profile: Profile) -> Profile:
        values = {name: getattr(profile, name) for name in _FIELDS}
        upsert = insert(user_profiles).values(owner=profile.owner, **values)
        upsert = upsert.on_conflict_do_update(index_elements=[user_profiles.c.owner], set_=values)
        try:
            with self._engine.begin() as connection:
                connection.execute(upsert)
        except SQLAlchemyError as exc:
            logger.error("could not save a profile (%s)", type(exc).__name__)
            raise
        return profile

    def delete(self, owner: str) -> bool:
        with self._engine.begin() as connection:
            gone = connection.execute(delete(user_profiles).where(user_profiles.c.owner == owner))
            return bool(gone.rowcount)


store: MemoryProfiles = MemoryProfiles()


def bind_profiles(engine: Engine | None, use_database: bool) -> MemoryProfiles:
    """Pick where profiles live. An unreachable database falls back to memory
    rather than stopping the app."""
    global store
    store = MemoryProfiles()
    if use_database and engine is not None:
        try:
            store = DatabaseProfiles(engine)
        except SQLAlchemyError:
            logger.warning("profile database unreachable; profiles last until restart")
    return store
