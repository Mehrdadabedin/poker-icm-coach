"""Saved hand history (plan 076): the signed-in user's tournaments and the hands
of one of them, and the Report built from them (plan 078). Another user's
tournament answers 404, like another user's table. With no history database
the lists and the report are empty."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_pro
from app.api.routes_meta import hand_view
from app.services import history_archive
from app.services.hand_history import record_from_dict
from app.services.report import Period, build_report, tournament_view, windows

router = APIRouter(prefix="/api/history")


@router.get("/tournaments")
def my_tournaments(user: str = Depends(require_pro)) -> dict:
    return {"tournaments": [tournament_view(r) for r in history_archive.archive.tournaments(user)]}


@router.get("/tournaments/{table_id}/hands")
def tournament_hands(table_id: str, user: str = Depends(require_pro)) -> dict:
    rows = history_archive.archive.hands(user, table_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="tournament not found")
    return {"hands": [hand_view(record_from_dict(r)) for r in rows]}


@router.get("/report")
def my_report(period: Period = "30d", tournament: str | None = Query(None, max_length=32),
              user: str = Depends(require_pro)) -> dict:
    archive = history_archive.archive
    rows = archive.tournaments(user)
    if tournament is not None and all(r["id"] != tournament for r in rows):
        raise HTTPException(status_code=404, detail="tournament not found")
    current, previous = windows(rows, period, datetime.now(UTC), tournament)
    saved = archive.hands_by_tournament(user, [r["id"] for r in current + previous])
    hands = {tid: [record_from_dict(d) for d in found] for tid, found in saved.items()}
    return build_report(current, previous, hands, period=period, tournament=tournament)
