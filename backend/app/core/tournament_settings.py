"""Runtime tournament settings (mutable in-process store).

Defaults mirror the project spec; edited via PUT /api/settings and consumed
when a new tournament is created so the configuration affects the real engine.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TournamentSettings:
    starting_stack: int = 45_000
    starting_small_blind: int = 100
    starting_big_blind: int = 100
    blind_level_minutes: int = 20
    fast_mode: bool = False

    def to_dict(self) -> dict:
        return {
            "startingStack": self.starting_stack,
            "startingSmallBlind": self.starting_small_blind,
            "startingBigBlind": self.starting_big_blind,
            "blindLevelMinutes": self.blind_level_minutes,
            "fastMode": self.fast_mode,
        }

    def update(self, **kwargs) -> None:
        for key, value in kwargs.items():
            if value is not None and hasattr(self, key):
                setattr(self, key, value)


settings = TournamentSettings()
