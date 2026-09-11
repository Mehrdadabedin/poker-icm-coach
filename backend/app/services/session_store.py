"""In-process registry of live tournament tables.

Extracted from the game router so the WebSocket endpoint and the meta routes
can reach tables without importing a router's privates (and without the
function-local imports that used to paper over the resulting cycle).

A GameSession has no terminal state — nothing ever marks a table finished — so
the store caps how many tables one user may hold and drops their oldest beyond
that. Without the cap every POST /api/tournament leaks a 9-player table for
the lifetime of the process.
"""
from __future__ import annotations

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
        """Register a table, evicting the owner's oldest beyond the cap."""
        if session.owner:
            self._evict_oldest(session.owner)
        self._sessions[session.session_id] = session

    def get(self, table_id: str) -> GameSession | None:
        return self._sessions.get(table_id)

    def owned_by(self, user: str) -> list[GameSession]:
        """The user's tables, oldest first."""
        return [s for s in self._sessions.values() if s.owner == user]

    def _evict_oldest(self, user: str) -> None:
        owned = [s.session_id for s in self.owned_by(user)]
        for session_id in owned[: max(0, len(owned) - MAX_TABLES_PER_USER + 1)]:
            self._sessions.pop(session_id, None)


session_store = SessionStore()
