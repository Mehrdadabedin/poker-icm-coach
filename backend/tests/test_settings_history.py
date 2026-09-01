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


def test_total_chips_and_average_stack() -> None:
    table_id = _create_table()
    state = client.get(f"/api/game/{table_id}/state").json()
    stacks = [p["stack"] for p in state["players"]]
    assert state["totalChips"] == sum(stacks)
    assert state["averageStack"] == sum(stacks) // 9


def _play_to_completion(s) -> None:
    from app.game.actions import Action, ActionType

    while not s.engine.is_complete:
        actor = s.engine.current_actor
        if actor is None:
            break
        if s.tournament.players[actor].is_human:
            s.engine.act(actor, Action(ActionType.FOLD))
        else:
            s.engine.advance_bot(actor)


def test_total_chips_reflect_reentry() -> None:
    """Bust a bot in level 1 -> re-entry gives it a fresh 45,000 stack."""
    from app.services.game_session import GameSession

    s = GameSession(starting_stack=45_000)
    s.start()
    _play_to_completion(s)
    s.tournament.players[1].stack = 0  # force a bust in level 1
    s.next_hand()  # re-entry applies, then the new hand starts
    assert not s.tournament.players[1].is_eliminated
    # re-entered to 45,000, minus a blind if it posted one this hand
    assert s.tournament.players[1].stack in (45_000, 44_900, 44_800)
    state = s.state()
    assert state["totalChips"] == sum(p.stack for p in s.tournament.players)
    assert state["averageStack"] == state["totalChips"] // 9


def test_total_chips_reflect_elimination() -> None:
    """Bust a bot at level 4+ -> eliminated, excluded from average stack."""
    from app.services.game_session import GameSession

    s = GameSession(starting_stack=45_000)
    s.start()
    _play_to_completion(s)
    s.tournament.level_index = 3  # level 4
    s.tournament.players[1].stack = 0
    s.next_hand()  # elimination applies, then the new hand starts
    assert s.tournament.players[1].is_eliminated
    assert s.tournament.players[1].stack == 0
    state = s.state()
    assert state["totalChips"] == sum(p.stack for p in s.tournament.players)
    active = sum(1 for p in s.tournament.players if not p.is_eliminated)
    assert state["averageStack"] == state["totalChips"] // active
