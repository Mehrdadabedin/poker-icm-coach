"""Daily quiz totals (plan 110). Memory serves local runs and the tests; the
database serves Render. Same split as plans: bind once at start.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import Engine, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.models.orm_quiz import quiz_daily

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DayTotals:
    answered: int = 0
    correct: int = 0
    best_streak: int = 0


def today() -> date:
    return datetime.now(UTC).date()


class MemoryQuizTotals:
    def __init__(self) -> None:
        self._days: dict[tuple[str, date], DayTotals] = {}
        self._lock = threading.Lock()

    def get(self, owner: str, day: date) -> DayTotals:
        with self._lock:
            return self._days.get((owner, day), DayTotals())

    def add(self, owner: str, day: date, correct: bool, streak: int) -> DayTotals:
        with self._lock:
            old = self._days.get((owner, day), DayTotals())
            new = DayTotals(old.answered + 1, old.correct + int(correct),
                            max(old.best_streak, streak))
            self._days[(owner, day)] = new
            return new

    def days(self, owner: str) -> list[tuple[date, DayTotals]]:
        with self._lock:
            return sorted((key[1], value) for key, value in self._days.items()
                          if key[0] == owner)

    def delete_owner(self, owner: str) -> int:
        with self._lock:
            gone = [key for key in self._days if key[0] == owner]
            for key in gone:
                del self._days[key]
            return len(gone)


class DatabaseQuizTotals(MemoryQuizTotals):
    def __init__(self, engine: Engine) -> None:
        super().__init__()
        self._engine = engine
        with engine.begin() as connection:
            quiz_daily.create(connection, checkfirst=True)

    def get(self, owner: str, day: date) -> DayTotals:
        query = select(quiz_daily).where(quiz_daily.c.owner == owner, quiz_daily.c.day == day)
        with self._engine.connect() as connection:
            row = connection.execute(query).mappings().first()
        return DayTotals() if row is None else DayTotals(
            row["answered"], row["correct"], row["best_streak"])

    def add(self, owner: str, day: date, correct: bool, streak: int) -> DayTotals:
        first = {"answered": 1, "correct": int(correct), "best_streak": streak}
        upsert = insert(quiz_daily).values(owner=owner, day=day, **first)
        upsert = upsert.on_conflict_do_update(
            index_elements=[quiz_daily.c.owner, quiz_daily.c.day],
            set_={"answered": quiz_daily.c.answered + 1,
                  "correct": quiz_daily.c.correct + int(correct),
                  "best_streak": func.greatest(quiz_daily.c.best_streak, streak)})
        try:
            with self._engine.begin() as connection:
                connection.execute(upsert)
        except SQLAlchemyError as exc:
            logger.error("could not save quiz totals (%s)", type(exc).__name__)
            raise
        return self.get(owner, day)

    def days(self, owner: str) -> list[tuple[date, DayTotals]]:
        query = select(quiz_daily).where(quiz_daily.c.owner == owner).order_by(quiz_daily.c.day)
        with self._engine.connect() as connection:
            rows = connection.execute(query).mappings().all()
        return [(row["day"], DayTotals(row["answered"], row["correct"], row["best_streak"]))
                for row in rows]

    def delete_owner(self, owner: str) -> int:
        with self._engine.begin() as connection:
            return connection.execute(delete(quiz_daily).where(quiz_daily.c.owner == owner)).rowcount


totals: MemoryQuizTotals = MemoryQuizTotals()


def bind_quiz_totals(engine: Engine | None, use_database: bool) -> MemoryQuizTotals:
    """An unreachable database falls back to memory rather than stopping the app."""
    global totals
    totals = MemoryQuizTotals()
    if use_database and engine is not None:
        try:
            totals = DatabaseQuizTotals(engine)
        except SQLAlchemyError:
            logger.warning("quiz database unreachable; totals last until restart")
    return totals
