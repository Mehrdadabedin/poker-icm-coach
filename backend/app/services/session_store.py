"""In-process registry of live tournament tables.

Extracted from the game router so the WebSocket endpoint and the meta routes
can reach tables without importing a router's privates (and without the
function-local imports that used to paper over the resulting cycle).

Eviction order (issue #5): finished tables go first, then tables idle past
their timeout, and only then does the per-user cap drop a genuinely live one.
An engaged table is never removed by an arbitrary timer, since `state()`
refreshes `last_seen` on every view. Without any of this every POST
/api/tournament leaks a 9-player table for the lifetime of the process.
"""
from __future__ import annotations

import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # runtime import would cycle: game_session marks its own end
    from app.services.game_session import GameSession

MAX_TABLES_PER_USER = 20


def label_for_index(index: int) -> str:
    """0 -> A ... 25 -> Z, 26 -> AA, 27 -> AB ... (spreadsheet style)."""
    letters = ""
    index += 1
    while index > 0:
        index, rem = divmod(index - 1, 26)
        letters = chr(65 + rem) + letters
    return letters


class SessionStore:
    """Live tables keyed by session id, plus human-readable table labels (A06).

    Labels are never reused while the process lives; the session_id (the real
    data key) stays unique and is what URLs use.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, GameSession] = {}
        self._label_counter = 0

    def __len__(self) -> int:
        return len(self._sessions)

    def next_label(self) -> str:
        label = label_for_index(self._label_counter)
        self._label_counter += 1
        return label

    def add(self, session: GameSession) -> None:
        """Register a table, evicting ended ones before capping live ones."""
        if session.owner:
            self.evict_ended(session.owner)
            self._evict_oldest(session.owner)
        self._sessions[session.session_id] = session

    def get(self, table_id: str) -> GameSession | None:
        return self._sessions.get(table_id)

    def owned_by(self, user: str) -> list[GameSession]:
        """The user's tables, oldest first."""
        return [s for s in self._sessions.values() if s.owner == user]

    def evict_ended(self, owner: str | None = None, now: float | None = None) -> int:
        """Drop finished and idle-past-timeout tables. Returns the count."""
        dead = [
            s.session_id for s in self._sessions.values()
            if (owner is None or s.owner == owner)
            and (s.status in ("finished", "abandoned") or check_abandoned(s, now))
        ]
        for session_id in dead:
            self._sessions.pop(session_id, None)
        return len(dead)

    def _evict_oldest(self, user: str) -> None:
        owned = [s.session_id for s in self.owned_by(user)]
        for session_id in owned[: max(0, len(owned) - MAX_TABLES_PER_USER + 1)]:
            self._sessions.pop(session_id, None)


def mark_finished(session: GameSession) -> bool:
    """Mark a table finished once hero is out and no live opponent remains.

    Records the terminal state for eviction. It never changes the poker or
    re-entry rules, which stay in the engine."""
    hero = session.tournament.players[session.hero_seat]
    others_alive = [
        p for p in session.tournament.players
        if p.seat != session.hero_seat and not p.is_eliminated and not p.sit_out
    ]
    if hero.is_eliminated and not others_alive:
        session.status = "finished"
        return True
    return False


def check_abandoned(session: GameSession, now: float | None = None) -> bool:
    """Mark a long-idle active table abandoned. An engaged table keeps
    refreshing last_seen through state(), so it is never caught by this."""
    now = now or time.time()
    if session.status == "active" and now - session.last_seen > session.idle_timeout:
        session.status = "abandoned"
        return True
    return False


session_store = SessionStore()
