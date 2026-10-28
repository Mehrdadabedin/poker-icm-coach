"""Leaderboard (plan 102): the top 100 and the caller's own row.

Rows carry the profile's display name, never the username (a Google username
is part of the email address). Photos ride along only for the top 3 and the
caller: a hundred data URLs of up to 200 KB each would make the page slow.
"""
from __future__ import annotations

import base64
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from app.api.deps import require_user
from app.services import leaderboard, portraits, profiles
from app.services.leaderboard import Entry, Period
from app.services.user_registry import auth_registry

router = APIRouter(tags=["leaderboard"])

PHOTOS = 3


def _iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def _photo(owner: str) -> str | None:
    found = portraits.store.get(owner)
    if found is None or found.status != "approved":
        return None
    return f"data:{found.content_type};base64,{base64.b64encode(found.image).decode()}"


def _row(entry: Entry, with_photo: bool) -> dict:
    return {"rank": entry.rank, "name": entry.name, "initial": entry.name[:1].upper(),
            "points": entry.points, "wins": entry.wins, "played": entry.played,
            "photo": _photo(entry.owner) if with_photo else None}


@router.get("/api/leaderboard")
def get_leaderboard(period: Period, user: str = Depends(require_user)) -> dict:
    snap = leaderboard.snapshot(period)
    names = snap.names
    if user not in names:
        profile = profiles.store.get(user)
        if profile is not None:
            names = {**names, user: profile.display_name}
    excluded = leaderboard.EXCLUDED | {u for u in {user, *names} if auth_registry.is_admin(u)}
    board = leaderboard.rank(snap.rows, names, excluded, user)
    start = leaderboard.week_start(snap.built_at)
    me = board.me
    return {
        "period": period, "weekStart": _iso(start),
        "weekEnd": _iso(start + timedelta(days=7, seconds=-1)),
        "updatedAt": _iso(snap.built_at),
        "rows": [_row(e, e.rank <= PHOTOS) for e in board.top],
        "me": {"state": me} if isinstance(me, str) else (
            {"state": "ranked", **_row(me, True)} if me else None),
    }
