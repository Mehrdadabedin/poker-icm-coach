"""Player portraits (plan 094): a photo each player uploads for their seat.

A new photo waits for an Admin: it shows at the table only once approved, so
nobody else's face or anything offensive appears without a person checking
it. Uploading again sends the new photo back to review.

Memory storage serves local runs and the test suite (lost on restart, like
file-mode tables); the database serves Render, whose disk is wiped on every
deploy. A database error on save is logged without its text, which embeds
the statement parameters.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import Engine, delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.models.orm_portraits import user_portraits

logger = logging.getLogger(__name__)

Status = Literal["pending", "approved", "rejected"]


@dataclass(frozen=True)
class Portrait:
    owner: str
    content_type: str
    image: bytes
    status: Status
    updated_at: datetime


class MemoryPortraits:
    def __init__(self) -> None:
        self._rows: dict[str, Portrait] = {}
        self._lock = threading.Lock()

    def get(self, owner: str) -> Portrait | None:
        with self._lock:
            return self._rows.get(owner)

    def put(self, owner: str, content_type: str, image: bytes) -> Portrait:
        row = Portrait(owner, content_type, image, "pending", datetime.now(UTC))
        with self._lock:
            self._rows[owner] = row
        return row

    def review(self, owner: str, status: Status) -> Portrait | None:
        with self._lock:
            row = self._rows.get(owner)
            if row is None:
                return None
            self._rows[owner] = replace(row, status=status, updated_at=datetime.now(UTC))
            return self._rows[owner]

    def delete(self, owner: str) -> bool:
        with self._lock:
            return self._rows.pop(owner, None) is not None

    def pending(self) -> list[Portrait]:
        with self._lock:
            return sorted((r for r in self._rows.values() if r.status == "pending"),
                          key=lambda r: r.updated_at)


def _row(mapping: object) -> Portrait:
    m = dict(mapping)  # type: ignore[call-overload]
    return Portrait(m["owner"], m["content_type"], bytes(m["image"]), m["status"], m["updated_at"])


class DatabasePortraits(MemoryPortraits):
    def __init__(self, engine: Engine) -> None:
        super().__init__()
        self._engine = engine
        # Creates its own table, so a host that never runs Alembic still works.
        user_portraits.create(engine, checkfirst=True)

    def get(self, owner: str) -> Portrait | None:
        query = select(user_portraits).where(user_portraits.c.owner == owner)
        with self._engine.connect() as connection:
            found = connection.execute(query).mappings().first()
        return _row(found) if found else None

    def put(self, owner: str, content_type: str, image: bytes) -> Portrait:
        row = Portrait(owner, content_type, image, "pending", datetime.now(UTC))
        values = {"content_type": content_type, "image": image, "status": "pending",
                  "updated_at": row.updated_at}
        upsert = insert(user_portraits).values(owner=owner, **values)
        upsert = upsert.on_conflict_do_update(index_elements=[user_portraits.c.owner], set_=values)
        try:
            with self._engine.begin() as connection:
                connection.execute(upsert)
        except SQLAlchemyError as exc:
            logger.error("could not save a portrait (%s)", type(exc).__name__)
            raise
        return row

    def review(self, owner: str, status: Status) -> Portrait | None:
        change = (update(user_portraits).where(user_portraits.c.owner == owner)
                  .values(status=status, updated_at=datetime.now(UTC)))
        with self._engine.begin() as connection:
            if connection.execute(change).rowcount == 0:
                return None
        return self.get(owner)

    def delete(self, owner: str) -> bool:
        with self._engine.begin() as connection:
            gone = connection.execute(delete(user_portraits).where(user_portraits.c.owner == owner))
            return bool(gone.rowcount)

    def pending(self) -> list[Portrait]:
        query = (select(user_portraits).where(user_portraits.c.status == "pending")
                 .order_by(user_portraits.c.updated_at))
        with self._engine.connect() as connection:
            return [_row(m) for m in connection.execute(query).mappings()]


store: MemoryPortraits = MemoryPortraits()


def bind_portraits(engine: Engine | None, use_database: bool) -> MemoryPortraits:
    """Pick where portraits live. An unreachable database falls back to memory
    rather than stopping the app."""
    global store
    store = MemoryPortraits()
    if use_database and engine is not None:
        try:
            store = DatabasePortraits(engine)
        except SQLAlchemyError:
            logger.warning("portrait database unreachable; portraits last until restart")
    return store
