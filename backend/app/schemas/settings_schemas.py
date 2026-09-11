"""Schema for the shared tournament-settings update route."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class SettingsUpdate(BaseModel):
    """Bounded partial update for the shared tournament settings.

    Fields are snake_case (matching `TournamentSettings`) and accepted over the
    wire in camelCase, so `model_dump(exclude_none=True)` feeds `update()`
    directly. Bounds matter: an unvalidated body previously allowed a big blind
    of 0, which divides by zero on every new table.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    starting_stack: int | None = Field(default=None, ge=100, le=10_000_000)
    starting_small_blind: int | None = Field(default=None, ge=1, le=1_000_000)
    starting_big_blind: int | None = Field(default=None, ge=1, le=1_000_000)
    blind_level_minutes: int | None = Field(default=None, ge=1, le=600)
    fast_mode: bool | None = None
    show_action_labels: bool | None = None
    show_result_labels: bool | None = None
