"""Saved hand history (plan 076): the signed-in user's tournaments and the hands
of one of them. Another user's tournament answers 404, like another user's
table. With no history database both lists are empty."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_user
from app.api.routes_meta import hand_view
from app.services import history_archive
from app.services.hand_history import record_from_dict

router = APIRouter(prefix="/api/history")


def _tournament_view(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "tableId": row["id"],
        "tableLabel": row["table_label"],
        "startedAt": row["started_at"].isoformat(),
        "endedAt": row["ended_at"].isoformat() if row["ended_at"] else None,
        "status": row["status"],
        "finishPlace": row["finish_place"],
        "startingStack": row["starting_stack"],
        "hands": row["hands"],
    }


@router.get("/tournaments")
def my_tournaments(user: str = Depends(require_user)) -> dict:
    return {"tournaments": [_tournament_view(r) for r in history_archive.archive.tournaments(user)]}


@router.get("/tournaments/{table_id}/hands")
def tournament_hands(table_id: str, user: str = Depends(require_user)) -> dict:
    rows = history_archive.archive.hands(user, table_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="tournament not found")
    return {"hands": [hand_view(record_from_dict(r)) for r in rows]}
