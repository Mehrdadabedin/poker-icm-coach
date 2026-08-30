"""FastAPI + WebSocket API tests (Atomic Part 034)."""
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


def _hero_turn(table_id: str) -> bool:
    state = client.get(f"/api/game/{table_id}/state").json()
    return state["waitingForHero"]


def _act_hero(table_id: str, kind: str, amount: int | None = None) -> dict:
    body = {"kind": kind}
    if amount is not None:
        body["amount"] = amount
    response = client.post(f"/api/game/{table_id}/action", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def test_health() -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_create_tournament_state() -> None:
    table_id = _create_table()
    state = client.get(f"/api/game/{table_id}/state").json()
    assert len(state["players"]) == 9
    assert state["heroSeat"] == 0
    assert state["bigBlind"] == 100
    assert state["level"] == 1


def test_hidden_information_never_leaks() -> None:
    table_id = _create_table()
    state = client.get(f"/api/game/{table_id}/state").json()
    for player in state["players"]:
        if player["isHero"]:
            assert player["holeCards"] is None or len(player["holeCards"]) == 2
        else:
            assert player["holeCards"] is None, "computer hole cards leaked!"
    # community cards must be subset of dealt streets
    assert len(state["communityCards"]) in (0, 3, 4, 5)
    for card in state["communityCards"]:
        assert card["rank"] and card["suit"]


def test_hero_actions_legal_flow() -> None:
    table_id = _create_table()
    acted = False
    for _ in range(200):
        state = client.get(f"/api/game/{table_id}/state").json()
        if state["phase"] == "handOver":
            break
        if state["waitingForHero"]:
            legal = [a["kind"] for a in state["legalActions"]]
            assert legal, "hero should have legal actions"
            if "check" in legal:
                new_state = _act_hero(table_id, "check")
            elif "call" in legal:
                new_state = _act_hero(table_id, "call")
            else:
                new_state = _act_hero(table_id, "fold")
            acted = True
    assert acted


def test_next_hand_flows() -> None:
    table_id = _create_table()
    for _ in range(300):
        state = client.get(f"/api/game/{table_id}/state").json()
        if state["phase"] == "handOver":
            break
        if state["waitingForHero"]:
            legal = [a["kind"] for a in state["legalActions"]]
            kind = "check" if "check" in legal else ("call" if "call" in legal else "fold")
            _act_hero(table_id, kind)
    response = client.post(f"/api/game/{table_id}/next-hand")
    assert response.status_code == 200
    assert response.json()["handNumber"] == 2


def test_coach_advice_endpoint() -> None:
    table_id = _create_table()
    response = client.post(f"/api/game/{table_id}/coach")
    assert response.status_code == 200
    body = response.json()
    assert body["recommendedAction"]
    assert body["reasoning"]
    assert body["detail"]["POSITION"]


def test_standalone_coach_advice() -> None:
    response = client.post("/api/coach/advice", json={
        "heroCards": [{"rank": "A", "suit": "s"}, {"rank": "K", "suit": "h"}],
        "position": "BTN", "stack": 30000, "bigBlind": 1000, "smallBlind": 500,
        "ante": 0, "pot": 1800, "toCall": 0, "board": [], "street": "preflop",
        "playersRemaining": 9, "paidPositions": 6, "stacks": [30000] * 9,
        "payout": [0.4, 0.25, 0.15, 0.1, 0.06, 0.04], "facingRaise": False,
        "heroSeat": 0, "mode": "advanced",
    })
    assert response.status_code == 200
    assert response.json()["recommendedAction"]


def test_ranges_endpoint() -> None:
    response = client.get("/api/ranges?position=BTN&stack_bb=30")
    assert response.status_code == 200
    body = response.json()
    assert len(body["grid"]) == 13
    assert len(body["grid"][0]) == 13


def test_icm_endpoint() -> None:
    response = client.get("/api/icm?stacks=45000,30000,20000&payouts=0.5,0.3,0.2")
    assert response.status_code == 200
    body = response.json()
    assert len(body["equities"]) == 3
    assert abs(sum(body["equities"]) - 1.0) < 1e-6


def test_statistics_endpoint() -> None:
    table_id = _create_table()
    response = client.get(f"/api/game/{table_id}/statistics")
    assert response.status_code == 200
    body = response.json()
    assert body["handsPlayed"] == 0


def test_invalid_action_rejected() -> None:
    table_id = _create_table()
    response = client.post(f"/api/game/{table_id}/action", json={"kind": "bogus"})
    assert response.status_code == 422


def test_unknown_table_404() -> None:
    assert client.get("/api/game/nope/state").status_code == 404


def test_websocket_streams_state() -> None:
    table_id = _create_table()
    with client.websocket_connect(f"/ws/table/{table_id}") as ws:
        ws.send_text("state")
        state = ws.receive_json()
        assert state["tableId"] == table_id
        assert len(state["players"]) == 9
