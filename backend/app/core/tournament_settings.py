"""Runtime tournament settings (mutable in-process store, per-user).

Issue #3: tournament settings are stored PER AUTHENTICATED USER instead of
being a single process-wide object, so one user's changes never affect another
user. Defaults mirror the project spec; edited via PUT /api/settings and
consumed when that user creates a new tournament so the configuration affects
the real engine. The single-worker in-memory store matches the app's auth/
session model (see ISSUE #4).
"""
from __future__ import annotations

import threading
from dataclasses import dataclass


@dataclass(slots=True)
class TournamentSettings:
    starting_stack: int = 45_000
    starting_small_blind: int = 100
    starting_big_blind: int = 100
    blind_level_minutes: int = 20
    fast_mode: bool = False
    show_action_labels: bool = True
    show_result_labels: bool = True

    def to_dict(self) -> dict:
        return {
            "startingStack": self.starting_stack,
            "startingSmallBlind": self.starting_small_blind,
            "startingBigBlind": self.starting_big_blind,
            "blindLevelMinutes": self.blind_level_minutes,
            "fastMode": self.fast_mode,
            "showActionLabels": self.show_action_labels,
            "showResultLabels": self.show_result_labels,
        }

    def update(self, **kwargs: object) -> None:
        for key, value in kwargs.items():
            if value is not None and hasattr(self, key):
                setattr(self, key, value)


class SettingsStore:
    """Per-user TournamentSettings, in-memory (single worker)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_user: dict[str, TournamentSettings] = {}

    def for_user(self, user: str) -> TournamentSettings:
        with self._lock:
            s = self._by_user.get(user)
            if s is None:
                s = TournamentSettings()
                self._by_user[user] = s
            return s

    def reset(self) -> None:
        with self._lock:
            self._by_user.clear()


# Backwards-compatible module-level handle; tests import `settings`.
settings = SettingsStore()
