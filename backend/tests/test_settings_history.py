"""Settings / active-table / coach-hands API tests (Atomic 049/053/054)."""
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


def test_tournament_settings_roundtrip() -> None:
    response = client.put("/api/settings", json={
        "startingStack": 25000, "startingSmallBlind": 200,
        "startingBigBlind": 400, "blindLevelMinutes": 10, "fastMode": True,
    })
    assert response.status_code == 200
    body = response.json()
    assert body["startingStack"] == 25000
    assert body["blindLevelMinutes"] == 10
    got = client.get("/api/settings").json()
    assert got["startingStack"] == 25000 and got["fastMode"] is True
    # reset to defaults so later tests are unaffected
    client.put("/api/settings", json={
        "startingStack": 45000, "startingSmallBlind": 100,
        "startingBigBlind": 100, "blindLevelMinutes": 20, "fastMode": False,
    })


def test_active_table_endpoint() -> None:
    table_id = _create_table()
    body = client.get("/api/active-table").json()
    assert body["tableId"] == table_id
    # hands list for the active table includes level info
    hands = client.get(f"/api/game/{table_id}/hands").json()["hands"]
    assert isinstance(hands, list)
    if hands:
        assert "level" in hands[0] and "blindLevel" in hands[0]


def test_coach_hands_169() -> None:
    response = client.get("/api/coach/hands")
    assert response.status_code == 200
    assert len(response.json()["hands"]) == 169


def test_settings_affect_tournament_creation() -> None:
    client.put("/api/settings", json={
        "startingStack": 20000, "startingSmallBlind": 120,
        "startingBigBlind": 240, "blindLevelMinutes": 7, "fastMode": False,
    })
    state = client.post("/api/tournament", json={"players": 9}).json()
    assert state["players"][0]["stack"] == 20000
    assert state["smallBlind"] == 120 and state["bigBlind"] == 240
    assert state["secondsLeft"] == 7 * 60
    client.put("/api/settings", json={
        "startingStack": 45000, "startingSmallBlind": 100,
        "startingBigBlind": 100, "blindLevelMinutes": 20, "fastMode": False,
    })
