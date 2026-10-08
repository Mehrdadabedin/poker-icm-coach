"""Admin moderation of accounts: suspend, unsuspend and delete.

A mixin for UserRegistry, kept apart so the registry stays within the 200-line
limit. It uses the registry's lock, entries and document, so a suspension or a
deletion is saved exactly like every other account change.
"""
from __future__ import annotations

from typing import Any


class Moderation:
    _users: dict[str, dict[str, object]]
    _lock: Any

    def _save(self) -> None:
        raise NotImplementedError

    def has_account(self, username: str) -> bool:
        with self._lock:
            return username in self._users

    def is_suspended(self, username: str) -> bool:
        with self._lock:
            return (self._users.get(username) or {}).get("suspended") is True

    def suspended_names(self) -> set[str]:
        with self._lock:
            return {name for name, entry in self._users.items() if entry.get("suspended") is True}

    def set_suspended(self, username: str, suspended: bool) -> None:
        """Raises KeyError for an unknown username."""
        with self._lock:
            entry = self._users[username]
            if suspended:
                entry["suspended"] = True
            else:
                entry.pop("suspended", None)
            self._save()

    def delete(self, username: str) -> None:
        """Raises KeyError for an unknown username."""
        with self._lock:
            del self._users[username]
            self._save()
