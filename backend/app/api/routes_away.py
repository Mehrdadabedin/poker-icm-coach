"""Stepping away from a table (plan 063).

When the hero leaves the table for HOME or MY MISTAKES, the tournament clock
stops so the blinds do not rise while they read; it restarts from the same
second when they come back. Kept apart from routes_game, which is at the
200-line limit.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import require_user
from app.api.routes_game import get_session
from app.schemas.game_schemas import GameStateModel

router = APIRouter(prefix="/api", tags=["game"])


@router.post("/game/{table_id}/away", response_model=GameStateModel)
def step_away(table_id: str, user: str = Depends(require_user)) -> dict:
    """The hero leaves the table: the clock stops until they return."""
    session = get_session(table_id, user)
    session.step_away()
    return session.state()


@router.post("/game/{table_id}/back", response_model=GameStateModel)
def come_back(table_id: str, user: str = Depends(require_user)) -> dict:
    """The hero is back: the clock continues from where it stopped."""
    session = get_session(table_id, user)
    session.come_back()
    return session.state()
