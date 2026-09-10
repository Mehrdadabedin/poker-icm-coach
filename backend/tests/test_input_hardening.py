"""Input validation on the public/authenticated API surface."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.routes_game import MAX_TABLES_PER_USER, _sessions
from app.main import app
from tests.api_helpers import login_client, ws_url

anon = TestClient(app)
client = login_client("Validator")

COACH_BODY = {
    "heroCards": [{"rank": "A", "suit": "s"}, {"rank": "K", "suit": "s"}],
    "position": "BTN", "stack": 30_000, "bigBlind": 400, "smallBlind": 200,
    "ante": 0, "pot": 1_000, "toCall": 400, "stacks": [30_000, 20_000, 10_000],
}


def test_icm_rejects_more_players_than_the_exact_recursion_supports() -> None:
    """The exact ICM recursion is combinatorial: an unbounded list is a DoS."""
    stacks = ",".join(["1000"] * 14)
    assert anon.get(f"/api/icm?stacks={stacks}&payouts=0.5,0.3,0.2").status_code == 422


def test_icm_rejects_negative_and_non_finite_input() -> None:
    assert anon.get("/api/icm?stacks=-100,200&payouts=0.5,0.5").status_code == 422
    assert anon.get("/api/icm?stacks=100,200&payouts=nan,0.5").status_code == 422
    assert anon.get("/api/icm?stacks=100,200&payouts=-0.5,0.5").status_code == 422


def test_icm_still_answers_a_valid_query() -> None:
    response = anon.get("/api/icm?stacks=45000,30000,20000&payouts=0.5,0.3,0.2")
    assert response.status_code == 200
    assert len(response.json()["equities"]) == 3


def test_coach_advice_rejects_an_unknown_rank_instead_of_crashing() -> None:
    body = dict(COACH_BODY, heroCards=[{"rank": "X", "suit": "s"},
                                       {"rank": "K", "suit": "s"}])
    assert anon.post("/api/coach/advice", json=body).status_code == 422


def test_coach_advice_bounds_the_table_size() -> None:
    assert anon.post("/api/coach/advice",
                     json=dict(COACH_BODY, stacks=[1000] * 14)).status_code == 422
    assert anon.post("/api/coach/advice",
                     json=dict(COACH_BODY, heroCards=[])).status_code == 422
    assert anon.post("/api/coach/advice",
                     json=dict(COACH_BODY, position="NOWHERE")).status_code == 422


def test_coach_advice_still_answers_a_valid_request() -> None:
    response = anon.post("/api/coach/advice", json=COACH_BODY)
    assert response.status_code == 200, response.text
    assert response.json()["recommendedAction"]


def test_settings_rejects_a_zero_big_blind() -> None:
    """A big blind of 0 divides by zero on every table created afterwards."""
    assert client.put("/api/settings", json={"startingBigBlind": 0}).status_code == 422
    assert client.put("/api/settings", json={"startingStack": 0}).status_code == 422
    assert client.put("/api/settings",
                      json={"blindLevelMinutes": "twenty"}).status_code == 422
    assert client.get("/api/settings").json()["startingBigBlind"] >= 1


def test_settings_still_accepts_a_valid_update() -> None:
    response = client.put("/api/settings", json={"startingBigBlind": 300,
                                                 "fastMode": True})
    assert response.status_code == 200, response.text
    assert response.json()["startingBigBlind"] == 300
    assert response.json()["fastMode"] is True
    client.put("/api/settings", json={"startingBigBlind": 100, "fastMode": False})


def test_ranges_rejects_an_unknown_position_and_out_of_range_depth() -> None:
    assert anon.get("/api/ranges?position=NOWHERE").status_code == 422
    assert anon.get("/api/ranges?position=BTN&stack_bb=100000").status_code == 422
    assert anon.get("/api/ranges?position=BTN&stack_bb=30").status_code == 200


def test_tables_per_user_are_capped_so_sessions_cannot_leak() -> None:
    """A session has no terminal state; without a cap tables live forever."""
    capper = login_client("Capper")
    body = {"players": 9, "ante_mode": "none", "fast_mode": 1.0}
    ids = [capper.post("/api/tournament", json=body).json()["tableId"]
           for _ in range(MAX_TABLES_PER_USER + 3)]
    owned = [s for s in _sessions.values() if s.owner == "Capper"]
    assert len(owned) == MAX_TABLES_PER_USER
    assert capper.get(f"/api/game/{ids[0]}/state").status_code == 404
    assert capper.get(f"/api/game/{ids[-1]}/state").status_code == 200


def test_websocket_reports_an_illegal_action_without_closing() -> None:
    table_id = client.post("/api/tournament",
                           json={"players": 9, "ante_mode": "none",
                                 "fast_mode": 1.0}).json()["tableId"]
    with client.websocket_connect(ws_url(table_id, client)) as ws:
        ws.send_text("action:raise:1")  # below the minimum raise
        assert "error" in ws.receive_json()
        ws.send_text("state")  # connection survived the error
        assert ws.receive_json()["tableId"] == table_id
