"""Leaderboard (plan 102): ranking rules and the route, with the database read
replaced. test_leaderboard_db.py runs the real query on PostgreSQL."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

from app.services import leaderboard, portraits, profiles
from app.services.leaderboard import POINTS, rank, week_start
from app.services.profiles import Profile
from app.services.user_registry import auth_registry
from tests.api_helpers import login_client

T0 = datetime(2026, 10, 28, 12, tzinfo=UTC)


def _row(owner: str, points: int = 100, wins: int = 1, played: int = 1, minutes: int = 0):
    return (owner, points, wins, played, T0 + timedelta(minutes=minutes))


def _names(*owners: str) -> dict[str, str]:
    return {o: o.upper() for o in owners}


def test_points_by_place() -> None:
    assert [POINTS[p] for p in range(1, 10)] == [100, 70, 50, 35, 25, 15, 10, 5, 2]
    assert POINTS.get(10, 0) == 0


def test_week_starts_on_monday_utc() -> None:
    monday = datetime(2026, 10, 26, tzinfo=UTC)
    assert week_start(datetime(2026, 11, 1, 23, 59, 59, tzinfo=UTC)) == monday
    assert week_start(monday) == monday
    assert week_start(monday - timedelta(seconds=1)) == monday - timedelta(days=7)


def test_order_and_every_tie_rule() -> None:
    rows = [_row("late", 100, 1, 1, 5), _row("early", 100, 1, 1, 1), _row("busy", 100, 1, 2),
            _row("wins", 100, 2, 3), _row("low", 50), _row("top", 300, 0, 9)]
    board = rank(rows, _names(*(r[0] for r in rows)), set(), "nobody")
    assert [e.owner for e in board.top] == ["top", "wins", "early", "late", "busy", "low"]
    assert [e.rank for e in board.top] == [1, 2, 3, 4, 5, 6]


def test_admins_demo_and_unnamed_players_are_left_out() -> None:
    rows = [_row("boss"), _row("demoplayer"), _row("ghost"), _row("ana", 10)]
    board = rank(rows, _names("boss", "demoplayer", "ana"), {"boss", "demoplayer"}, "x")
    assert [e.owner for e in board.top] == ["ana"] and board.top[0].rank == 1


def test_top_100_and_the_callers_row_at_214th() -> None:
    rows = [_row(f"p{i}", 1000 - i) for i in range(250)]
    board = rank(rows, _names(*(r[0] for r in rows)), set(), "p213")
    assert len(board.top) == 100
    assert board.me is not None and board.me != "noProfile"
    assert (board.me.rank, board.me.points) == (214, 787)


def test_caller_markers() -> None:
    names = _names("ana")
    assert rank([_row("ana")], names, set(), "bob").me == "noProfile"
    assert rank([_row("ana")], {**names, "bob": "BOB"}, set(), "bob").me is None
    assert rank([_row("bob")], names, set(), "bob").me == "noProfile"


@pytest.fixture()
def board(monkeypatch: pytest.MonkeyPatch):
    calls: list[object] = []
    rows = [_row("LbAna", 100, 1, 1), _row("LbBen", 70, 0, 1), _row("LbCy", 50, 0, 1),
            _row("LbDi", 35, 0, 1), _row("LbAdmin", 900, 9, 9)]
    names = {"LbAna": "Ana", "LbBen": "Ben", "LbCy": "Cy", "LbDi": "Di", "LbAdmin": "Boss"}

    def fake(engine: object, since: datetime | None):
        calls.append(since)
        return rows, names

    monkeypatch.setattr(leaderboard, "_query", fake)
    monkeypatch.setattr(leaderboard.history_archive, "archive", SimpleNamespace(engine=object()))
    monkeypatch.setattr(auth_registry, "is_admin", lambda u: u == "LbAdmin")
    profiles.bind_profiles(None, False)
    portraits.bind_portraits(None, False)
    leaderboard.clear_cache()
    yield calls
    leaderboard.clear_cache()


def test_route_shape_names_only_and_week_window(board: list[object]) -> None:
    client = login_client("LbViewer")
    got = client.get("/api/leaderboard", params={"period": "week"}).json()
    assert [r["name"] for r in got["rows"]] == ["Ana", "Ben", "Cy", "Di"]
    assert got["rows"][0] == {"rank": 1, "name": "Ana", "initial": "A", "points": 100, "wins": 1,
                              "played": 1, "photo": None}
    assert got["me"] == {"state": "noProfile"}
    assert got["weekEnd"].endswith("T23:59:59Z") and got["weekStart"].endswith("T00:00:00Z")
    assert "LbAna" not in str(got) and "LbAdmin" not in str(got)
    assert isinstance(board[0], datetime) and board[0].weekday() == 0
    client.get("/api/leaderboard", params={"period": "all"})
    assert board[1] is None


def test_bad_period_and_no_token() -> None:
    assert login_client("LbBad").get("/api/leaderboard", params={"period": "year"}).status_code == 422
    assert login_client("LbBad").get("/api/leaderboard").status_code == 422
    from fastapi.testclient import TestClient

    from app.main import app
    assert TestClient(app).get("/api/leaderboard?period=all").status_code == 401


def test_photos_only_for_the_top_three_and_the_caller(board: list[object]) -> None:
    for owner in ("LbAna", "LbDi"):
        portraits.store.put(owner, "image/png", b"\x89PNG\r\n\x1a\n")
        portraits.store.review(owner, "approved")
    portraits.store.put("LbBen", "image/png", b"\x89PNG\r\n\x1a\n")  # still pending
    rows = login_client("LbPhoto").get("/api/leaderboard?period=all").json()["rows"]
    assert [bool(r["photo"]) for r in rows] == [True, False, False, False]
    assert rows[0]["photo"].startswith("data:image/png;base64,")


def test_the_caller_gets_their_own_ranked_row_with_photo(board: list[object]) -> None:
    profiles.store.put(Profile("LbDi", "D", "I", "Di", datetime(1990, 1, 1).date(), "man"))
    portraits.store.put("LbDi", "image/png", b"\x89PNG\r\n\x1a\n")
    portraits.store.review("LbDi", "approved")
    client = login_client("LbDi")
    me = client.get("/api/leaderboard?period=all").json()["me"]
    assert (me["state"], me["rank"], me["name"]) == ("ranked", 4, "Di")
    assert me["photo"].startswith("data:")


def test_a_player_with_a_profile_and_no_tournament_has_no_row(board: list[object]) -> None:
    profiles.store.put(Profile("LbNew", "N", "W", "New", datetime(1990, 1, 1).date(), "man"))
    assert login_client("LbNew").get("/api/leaderboard?period=all").json()["me"] is None


def test_a_second_call_within_60_seconds_does_not_query_again(board: list[object]) -> None:
    client = login_client("LbCache")
    client.get("/api/leaderboard?period=all")
    client.get("/api/leaderboard?period=all")
    assert len(board) == 1
    client.get("/api/leaderboard?period=week")
    assert len(board) == 2


def test_memory_mode_gives_an_empty_board(monkeypatch: pytest.MonkeyPatch) -> None:
    leaderboard.clear_cache()
    got = login_client("LbEmpty").get("/api/leaderboard?period=all").json()
    assert got["rows"] == [] and got["me"] in (None, {"state": "noProfile"})
    leaderboard.clear_cache()
