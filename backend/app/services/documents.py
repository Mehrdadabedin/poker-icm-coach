"""Persistence for the auth registries: one JSON document, in a file or a row.

The registries hold their whole state in memory and write all of it back on
every change, so a backend needs only load() and save(). Because every save
carries the full document, one failed save is repaired by the next good one.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Protocol

from sqlalchemy import Engine, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.models.orm_documents import app_documents

logger = logging.getLogger(__name__)


class Document(Protocol):
    def load(self) -> dict[str, Any] | None: ...

    def save(self, body: dict[str, Any]) -> None: ...


class FileDocument:
    """Best effort: an unreadable or unwritable file degrades to memory only."""

    def __init__(self, path: str) -> None:
        self.path = Path(path)

    def load(self) -> dict[str, Any] | None:
        try:
            if self.path.is_file():
                body: dict[str, Any] = json.loads(self.path.read_text(encoding="utf-8"))
                return body
        except (OSError, ValueError):
            logger.warning("could not read %s; starting empty", self.path.name)
        return None

    def save(self, body: dict[str, Any]) -> None:
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(body, indent=2, sort_keys=True), encoding="utf-8")
        except OSError:
            logger.warning("could not write %s", self.path.name)


class DatabaseDocument:
    """One row of `app_documents`, optionally seeded from a file while empty.

    Construction and load() raise when the database is unreachable instead of
    starting empty: an empty registry would overwrite every stored account on
    its first save. A failed save only logs, without the exception text,
    because SQLAlchemy errors embed the statement parameters, and those are
    password hashes and bearer tokens.
    """

    def __init__(self, name: str, engine: Engine, seed: FileDocument | None = None) -> None:
        self.name = name
        self._engine = engine
        self._seed = seed
        # Creates its own table, so a host that never runs Alembic still works.
        app_documents.create(engine, checkfirst=True)

    def load(self) -> dict[str, Any] | None:
        query = select(app_documents.c.body).where(app_documents.c.name == self.name)
        with self._engine.connect() as connection:
            body: dict[str, Any] | None = connection.execute(query).scalar_one_or_none()
        if body is None and self._seed is not None:
            return self._seed.load()
        return body

    def save(self, body: dict[str, Any]) -> None:
        upsert = insert(app_documents).values(name=self.name, body=body)
        upsert = upsert.on_conflict_do_update(
            index_elements=[app_documents.c.name],
            set_={"body": upsert.excluded.body, "updated_at": func.now()},
        )
        try:
            with self._engine.begin() as connection:
                connection.execute(upsert)
        except SQLAlchemyError as exc:
            logger.error("could not save the %s document (%s)", self.name, type(exc).__name__)
