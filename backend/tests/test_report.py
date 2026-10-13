"""The Report page's numbers (plan 078), from hand-made tournament rows and
hand records, so no database is needed. The saved-history round trip is in
test_history_archive.py."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient

from app.game.hand_result import HandAction
from app.main import app
from app.poker.card import card_from_str
from app.services.hand_history import HandDecision, HandHistoryRecord
from app.services.report import build_report, windows
from app.services.report_stats import player_stats
from tests.api_helpers import login_client

NOW = datetime(2026, 10, 13, 12, tzinfo=UTC)
BOARD = ["2c", "7d", "9h", "Js", "Kd"]


def row(tid: str, days_ago: float, hands: int = 1, place: int | None = None) -> dict[str, Any]:
    return {"id": tid, "table_label": tid.upper(), "started_at": NOW - timedelta(days=days_ago),
            "ended_at": None, "status": "finished" if place else "active", "finish_place": place,
            "starting_stack": 45_000, "hands": hands}


def dec(street: str, hero: str, coach: str, grade: str) -> HandDecision:
    return HandDecision(street, hero, coach, grade, "LOW", "", 20.0, 0, [])


def hand(n: int, *decisions: HandDecision, pos: str = "CO", start: int = 45_000, end: int = 45_000,
         level: int = 1, actions: list[tuple[int, str, int | None, str]] | None = None,
         board: int = 0) -> HandHistoryRecord:
    return HandHistoryRecord(
        hand_number=n, hero_cards=[card_from_str("As"), card_from_str("Kh")], hero_position=pos,
        community_cards=[card_from_str(c) for c in BOARD[:board]], starting_stack=start,
        ending_stack=end, blind_level="100/200", level_index=level,
        actions=[HandAction(*a) for a in actions or []], pot_total=0, winner_seats=[0],
        decisions=list(decisions))


OK, BAD = "PREFERRED", "SUBOPTIMAL"


def test_the_period_picks_tournaments_and_a_chosen_one_stands_alone() -> None:
    rows = [row("new", 1), row("empty", 2, hands=0), row("old", 20), row("prev", 45), row("ancient", 80)]
    current, previous = windows(rows, "30d", NOW, None)
    assert [r["id"] for r in current] == ["new", "old"]  # a table with no hand is left out
    assert [r["id"] for r in previous] == ["prev"]
    assert [r["id"] for r in windows(rows, "all", NOW, None)[0]] == ["new", "old", "prev", "ancient"]
    assert windows(rows, "7d", NOW, "ancient") == ([rows[4]], [])


def test_summary_counts_places_agreement_and_mistakes() -> None:
    rows = [row("a", 1, place=1), row("b", 2, place=3), row("c", 3, place=6), row("d", 4)]
    hands = {"a": [hand(1, dec("preflop", "CALL", "FOLD", BAD), dec("flop", "BET", "BET", OK))],
             "b": [hand(1, dec("preflop", "CHECK", "BET", "ACCEPTABLE")), hand(2)],
             "prev": [hand(1, dec("preflop", "CALL", "FOLD", BAD))]}
    summary = build_report(rows, [row("prev", 40)], hands, period="30d", tournament=None)["summary"]
    assert {k: summary[k] for k in ("tournaments", "wins", "top3", "averageFinish", "hands", "decisions")} == {
        "tournaments": 4, "wins": 1, "top3": 2, "averageFinish": 3.3, "hands": 3, "decisions": 3}
    assert (summary["agreement"], summary["mistakesPer100"]) == (66.7, 33.3)
    assert summary["previous"] == {"agreement": 0.0, "mistakesPer100": 100.0}


def test_the_stack_graph_follows_the_newest_tournament_hand_by_hand() -> None:
    hands = {"new": [hand(1, end=47_000), hand(2, dec("turn", "CALL", "FOLD", BAD), start=47_000,
                                                  end=30_000, level=2)],
             "old": [hand(1, end=90_000)]}
    stack = build_report([row("new", 1), row("old", 5)], [], hands, period="30d", tournament=None)["stack"]
    assert stack["tableId"] == "new"
    assert stack["points"] == [
        {"hand": 0, "stack": 45_000, "level": 1, "mistakes": 0},
        {"hand": 1, "stack": 47_000, "level": 1, "mistakes": 0},
        {"hand": 2, "stack": 30_000, "level": 2, "mistakes": 1}]
    assert build_report([], [], {}, period="30d", tournament=None)["stack"] is None


def test_mistakes_by_seat_and_street_and_by_type() -> None:
    hands = {"a": [hand(1, dec("preflop", "CALL", "FOLD", BAD), dec("flop", "FOLD", "CALL", BAD), pos="BB"),
                   hand(2, dec("preflop", "CALL", "FOLD", OK), dec("river", "BET", "CHECK", BAD), pos="BB")]}
    report = build_report([row("a", 1)], [], hands, period="30d", tournament=None)
    cells = {(c["position"], c["street"]): (c["decisions"], c["mistakes"]) for c in report["heatmap"]["cells"]}
    assert cells == {("BB", "preflop"): (2, 1), ("BB", "flop"): (1, 1), ("BB", "river"): (1, 1)}
    assert report["heatmap"]["positions"][-1] == "BB" and len(report["heatmap"]["positions"]) == 9
    assert report["mistakeTypes"] == [{"type": "call", "count": 1}, {"type": "fold", "count": 1},
                                      {"type": "allin", "count": 0}, {"type": "other", "count": 1}]


def test_leaks_group_repeated_mistakes_most_frequent_then_newest() -> None:
    sb_call = dec("preflop", "CALL", "FOLD", BAD)
    hands = {"new": [hand(n, sb_call, pos="SB") for n in range(1, 8)] + [hand(8, dec("turn", "CALL", "FOLD", BAD))],
             "old": [hand(1, dec("river", "FOLD", "CALL", BAD), pos="BTN"),
                     hand(2, dec("flop", "CHECK", "BET", BAD), pos="MP")]}
    leaks = build_report([row("new", 1), row("old", 9)], [], hands, period="30d", tournament=None)["leaks"]
    assert [(lk["position"], lk["street"], lk["count"]) for lk in leaks] == [
        ("SB", "preflop", 7), ("CO", "turn", 1), ("MP", "flop", 1)]  # a tie goes to the newer hand
    assert leaks[0]["hands"] == [{"tableId": "new", "handNumber": n} for n in (7, 6, 5, 4, 3)]
    assert (leaks[0]["heroAction"], leaks[0]["coachAction"]) == ("CALL", "FOLD")


def test_progress_is_one_point_per_tournament_oldest_first_last_twelve() -> None:
    rows = [row(f"t{i}", i) for i in range(14)]  # t0 is the newest
    hands = {r["id"]: [hand(1, dec("preflop", "CALL", "FOLD", BAD if i % 2 else OK))]
             for i, r in enumerate(rows)}
    progress = build_report(rows, [], hands, period="all", tournament=None)["progress"]
    assert [p["tableId"] for p in progress] == [f"t{i}" for i in range(11, -1, -1)]
    assert (progress[-1]["agreement"], progress[-1]["mistakesPer100"]) == (100.0, 0.0)


def test_player_stats_from_the_action_log() -> None:
    folds = [(s, "fold", None, "preflop") for s in (3, 4, 5, 6)]
    steal = hand(1, pos="CO", actions=[*folds, (0, "raise", 500, "preflop"), (7, "fold", None, "preflop")])
    three_bet_cbet = hand(2, pos="BB", board=5, actions=[
        (3, "raise", 500, "preflop"), (2, "fold", None, "preflop"), (0, "raise", 1500, "preflop"),
        (3, "call", 1500, "preflop"), (0, "bet", 2000, "flop"), (3, "call", 2000, "flop"),
        (0, "check", None, "turn"), (3, "check", None, "turn"), (0, "check", None, "river"),
        (3, "check", None, "river")])
    limped_fold = hand(3, pos="BTN", board=3, actions=[(5, "call", 200, "preflop"), (0, "fold", None, "preflop"),
                                                       (1, "check", None, "preflop")])
    bb_check_fold = hand(4, pos="BB", board=3, actions=[
        (8, "call", 200, "preflop"), (0, "check", None, "preflop"), (8, "bet", 300, "flop"), (0, "fold", None, "flop")])
    short_all_in = hand(5, pos="SB", board=5, actions=[  # all in below the raise: a call, not a 3-bet
        (7, "raise", 500, "preflop"), (0, "all_in", 400, "preflop"), (1, "fold", None, "preflop")])
    stats = {s["key"]: (s["hits"], s["chances"], s["value"])
             for s in player_stats([steal, three_bet_cbet, limped_fold, bb_check_fold, short_all_in])}
    assert stats == {"vpip": (3, 5, 60.0), "pfr": (2, 5, 40.0), "threeBet": (1, 2, 50.0),
                     "steal": (1, 1, 100.0), "cbet": (1, 1, 100.0), "wtsd": (2, 3, 66.7)}
    assert player_stats([])[0] == {"key": "vpip", "hits": 0, "chances": 0, "value": None, "low": 18, "high": 26}


def test_the_report_needs_a_signed_in_user_and_a_known_period() -> None:
    assert TestClient(app).get("/api/history/report").status_code == 401
    client = login_client("ReportNoDb")
    report = client.get("/api/history/report").json()  # no history database: an empty report
    assert (report["summary"]["tournaments"], report["stack"], report["leaks"]) == (0, None, [])
    assert client.get("/api/history/report?period=1y").status_code == 422
    assert client.get("/api/history/report?tournament=nope").status_code == 404
