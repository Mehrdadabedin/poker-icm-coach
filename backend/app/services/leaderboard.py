"""The leaderboard (plan 102): points by finish place, a week board and an all-time board.

Only the database archive keeps finished tournaments, so without it the board
is empty. The query result is cached per period for 60 s: the page polls
rarely and a GROUP BY over every tournament is the costliest read we have.
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import Engine, case, func, select

from app.models.orm_history import history_tournaments as ht
from app.models.orm_profiles import user_profiles
from app.services import history_archive

POINTS = {1: 100, 2: 70, 3: 50, 4: 35, 5: 25, 6: 15, 7: 10, 8: 5, 9: 2}
TOP = 100
CACHE_SECONDS = 60
EXCLUDED = frozenset({"demoplayer"})

Period = Literal["week", "all"]
Row = tuple[str, int, int, int, datetime]  # owner, points, wins, played, last_ended_at


@dataclass(frozen=True)
class Entry:
    rank: int
    owner: str
    name: str
    points: int
    wins: int
    played: int


@dataclass(frozen=True)
class Board:
    top: list[Entry]
    me: Entry | Literal["noProfile"] | None


def week_start(now: datetime) -> datetime:
    """Monday 00:00 UTC of the week that holds `now`."""
    day = now.astimezone(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return day - timedelta(days=day.weekday())


def rank(rows: list[Row], names: dict[str, str], excluded: set[str] | frozenset[str],
         me: str) -> Board:
    """Order the players, number them, keep the top 100 and find the caller.

    Ties: more points, then more wins, then fewer tournaments, then whoever
    reached the total first."""
    kept = [row for row in rows if row[0] not in excluded and row[0] in names]
    kept.sort(key=lambda r: (-r[1], -r[2], r[3], r[4]))
    entries = [Entry(i, owner, names[owner], points, wins, played)
               for i, (owner, points, wins, played, _) in enumerate(kept, start=1)]
    mine: Entry | Literal["noProfile"] | None
    if me in excluded:
        mine = None
    elif me not in names:
        mine = "noProfile"
    else:
        mine = next((e for e in entries if e.owner == me), None)
    return Board(entries[:TOP], mine)


def _query(engine: Engine, since: datetime | None) -> tuple[list[Row], dict[str, str]]:
    points = func.sum(case(POINTS, value=ht.c.finish_place, else_=0))
    query = (select(ht.c.owner, points, func.count().filter(ht.c.finish_place == 1),
                    func.count(), func.max(ht.c.ended_at))
             .where(ht.c.status == "finished", ht.c.finish_place.is_not(None))
             .group_by(ht.c.owner))
    if since is not None:
        query = query.where(ht.c.ended_at >= since)
    user_profiles.create(engine, checkfirst=True)
    with engine.connect() as connection:
        rows = [(o, int(p), int(w), int(n), ended) for o, p, w, n, ended in connection.execute(query)]
        names = {}
        if rows:
            owners = [row[0] for row in rows]
            named = select(user_profiles.c.owner, user_profiles.c.display_name).where(
                user_profiles.c.owner.in_(owners))
            names = {owner: name for owner, name in connection.execute(named)}
    return rows, names


@dataclass(frozen=True)
class Snapshot:
    rows: list[Row]
    names: dict[str, str]
    built_at: datetime


_cache: dict[str, tuple[float, Snapshot]] = {}
_lock = threading.Lock()


def snapshot(period: Period, now: datetime | None = None) -> Snapshot:
    """The period's rows, from the cache while it is under 60 s old."""
    with _lock:
        hit = _cache.get(period)
        if hit is not None and time.monotonic() - hit[0] < CACHE_SECONDS:
            return hit[1]
        moment = now or datetime.now(UTC)
        engine = getattr(history_archive.archive, "engine", None)
        rows, names = ([], {}) if engine is None else _query(
            engine, week_start(moment) if period == "week" else None)
        built = Snapshot(rows, names, moment)
        _cache[period] = (time.monotonic(), built)
        return built


def clear_cache() -> None:
    with _lock:
        _cache.clear()
