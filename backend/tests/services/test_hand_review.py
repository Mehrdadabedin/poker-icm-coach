"""Hand-review payload tests: showdown reveals, results, bot explanations."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_table() -> str:
    response = client.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0,
    })
    assert response.status_code == 200, response.text
    return response.json()["tableId"]


def _next(table_id: str) -> dict:
    return client.post(f"/api/game/{table_id}/next-hand").json()


def _play_to_completion(table_id: str, max_steps: int = 400) -> tuple[dict, dict]:
    """Act hero (first legal) until the hand completes; return (end_state, review)."""
    state = client.get(f"/api/game/{table_id}/state").json()
    for _ in range(max_steps):
        if state.get("phase") == "handOver":
            return state, state["review"]
        if state.get("waitingForHero"):
            kinds = [a["kind"] for a in state["legalActions"]]
            state = client.post(f"/api/game/{table_id}/action", json={"kind": kinds[0]}).json()
        else:
            state = client.get(f"/api/game/{table_id}/state").json()
    raise AssertionError("hand did not complete")


def test_review_exists_with_required_fields() -> None:
    table_id = _create_table()
    _, review = _play_to_completion(table_id)
    for key in ("pot", "heroNet", "heroWon", "chop", "winners", "foldedSeats",
                "allInSeats", "showdown", "actions", "explanations",
                "heroPosition", "heroRankBefore", "heroRankAfter", "winningHandName",
                "heroCards"):
        assert key in review, f"missing review field {key}"
    assert isinstance(review["heroCards"], list)
    assert review["pot"] > 0
    assert review["actions"][0]["action"] == "small_blind"
    assert review["actions"][1]["action"] == "big_blind"


def test_folded_players_never_revealed() -> None:
    table_id = _create_table()
    for _ in range(4):
        _, review = _play_to_completion(table_id)
        shown = {s["seat"] for s in review["showdown"] if s["cards"]}
        assert not (shown & set(review["foldedSeats"])), "folded cards revealed"
        _next(table_id)


def test_winner_consistent_with_showdown() -> None:
    table_id = _create_table()
    for _ in range(4):
        _, review = _play_to_completion(table_id)
        shown = {s["seat"] for s in review["showdown"]}
        for seat in review["winners"]:
            # winners either reached (real) showdown or won by walk
            assert seat in shown, "winner missing from showdown list"
        if review["heroWon"]:
            assert review["heroNet"] >= 0
        _next(table_id)


def test_bot_explanations_track_real_state() -> None:
    table_id = _create_table()
    _, review = _play_to_completion(table_id)
    for e in review["explanations"]:
        assert e["position"] in ("UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB")
        assert e["stackBB"] > 0
        assert e["potOdds"].endswith("%")
        assert e["equity"].endswith("%")
        assert e["icmPressure"]
        assert e["reason"]
        assert e["seat"] != review["heroSeat"]


def test_walk_reveals_no_cards() -> None:
    """When everyone folds to one player there is no showdown reveal."""
    table_id = _create_table()
    for _ in range(30):
        _state, review = _play_to_completion(table_id)
        if len(review["showdown"]) == 1:
            entry = review["showdown"][0]
            assert entry["cards"] == [], "walk winner cards should stay hidden"
            return
        _next(table_id)
    raise AssertionError("no walk hand found in 30 hands")
