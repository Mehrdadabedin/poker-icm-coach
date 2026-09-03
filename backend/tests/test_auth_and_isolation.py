"""A03-A07 tests: auth, identity, per-user isolation, table labels.

Clients log in via login_client(); game endpoints resolve sessions from the
bearer token, never from a client-supplied username."""
from __future__ import annotations

import pathlib

from fastapi.testclient import TestClient

from app.api.routes_game import _label_for_index
from app.main import app
from app.services.auth import auth_store
from tests.api_helpers import login_client

alice = login_client("Alice")
bob = login_client("Bob")

def _table(client: TestClient, stack: int = 45_000) -> dict:
    r = client.post("/api/tournament", json={
        "players": 9, "starting_stack": stack, "ante_mode": "none", "fast_mode": 1.0,
    })
    assert r.status_code == 200, r.text
    return r.json()

def _play_hand(client: TestClient, tid: str) -> None:
    for _ in range(300):
        s = client.get(f"/api/game/{tid}/state").json()
        if s["phase"] == "handOver":
            break
        if s["waitingForHero"]:
            legal = [a["kind"] for a in s["legalActions"]]
            kind = "check" if "check" in legal else ("call" if "call" in legal else "fold")
            r = client.post(f"/api/game/{tid}/action", json={"kind": kind})
            assert r.status_code == 200, r.text
    r = client.post(f"/api/game/{tid}/next-hand")
    assert r.status_code == 200, r.text

# ---------------------------------------------------------------------------
# A03 authentication
# ---------------------------------------------------------------------------
def test_game_endpoints_require_authentication() -> None:
    anon = TestClient(app)
    assert anon.post("/api/tournament", json={"players": 9}).status_code == 401
    assert anon.get("/api/game/any/state").status_code == 401
    assert anon.post("/api/game/any/action", json={"kind": "fold"}).status_code == 401
    assert anon.post("/api/game/any/next-hand").status_code == 401
    assert anon.post("/api/game/any/coach").status_code == 401
    assert anon.post("/api/game/any/coach/compare").status_code == 401
    assert anon.put("/api/settings", json={}).status_code == 401

def test_login_validation_and_me() -> None:
    c = TestClient(app)
    bad = c.post("/api/auth/login", json={"username": "x"})  # too short
    assert bad.status_code == 422
    bad2 = c.post("/api/auth/login", json={"username": "bad name!"})
    assert bad2.status_code == 422
    ok = c.post("/api/auth/login", json={"username": "  Jane Doe  "})
    assert ok.status_code == 200
    assert ok.json()["username"] == "Jane Doe"
    token = ok.json()["token"]
    me = c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json() == {"username": "Jane Doe"}
    # without token
    assert c.get("/api/auth/me").status_code == 401

def test_logout_revokes_token() -> None:
    c = login_client("LogoutUser")
    assert c.get("/api/auth/me").status_code == 200
    assert c.post("/api/auth/logout").status_code == 200
    assert c.get("/api/auth/me").status_code == 401

def test_invalid_or_expired_token_rejected() -> None:
    c = TestClient(app)
    assert c.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    assert c.get("/api/auth/me", headers={"Authorization": "Bearer "}).status_code == 401
    # expiry: expire ONLY the token created here
    login = c.post("/api/auth/login", json={"username": "ExpiryUser"}).json()
    token = login["token"]
    assert c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
    auth_store._tokens[token] = (login["username"], -1.0)  # noqa: SLF001
    assert c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401

# ---------------------------------------------------------------------------
# A04 username replaces Hero
# ---------------------------------------------------------------------------
def test_username_replaces_hero_in_state() -> None:
    c = login_client("Mehrdad")
    state = _table(c)
    hero = next(p for p in state["players"] if p["isHero"])
    assert hero["name"] == "Mehrdad"
    assert state["username"] == "Mehrdad"
    bots = [p for p in state["players"] if not p["isHero"]]
    assert all(b["name"].startswith("Bot") for b in bots)

# ---------------------------------------------------------------------------
# A05 session isolation between two users
# ---------------------------------------------------------------------------
def test_user_b_cannot_touch_user_a_session() -> None:
    state = _table(alice, stack=30_000)
    tid = state["tableId"]
    assert bob.get(f"/api/game/{tid}/state").status_code == 404
    # action / next-hand / coach / compare
    assert bob.post(f"/api/game/{tid}/action", json={"kind": "fold"}).status_code == 404
    assert bob.post(f"/api/game/{tid}/next-hand").status_code == 404
    assert bob.post(f"/api/game/{tid}/coach").status_code == 404
    assert bob.post(f"/api/game/{tid}/coach/compare").status_code == 404
    assert bob.get(f"/api/game/{tid}/hands").status_code == 404
    assert bob.get(f"/api/game/{tid}/statistics").status_code == 404
    assert alice.get(f"/api/game/{tid}/state").status_code == 200
    # active-table is per-user
    assert bob.get("/api/active-table").json()["tableId"] in (None, )
    assert alice.get("/api/active-table").json()["tableId"] == tid

def test_two_users_play_independently() -> None:
    a = _table(alice, stack=35_000)
    b = _table(bob, stack=48_000)
    hero_a = next(p for p in a["players"] if p["isHero"])
    hero_b = next(p for p in b["players"] if p["isHero"])
    assert (hero_a["name"], hero_a["stack"]) == ("Alice", 35_000)
    assert (hero_b["name"], hero_b["stack"]) == ("Bob", 48_000)
    _play_hand(alice, a["tableId"])
    _play_hand(bob, b["tableId"])
    _play_hand(alice, a["tableId"])
    ha = alice.get(f"/api/game/{a['tableId']}/hands").json()["hands"]
    hb = bob.get(f"/api/game/{b['tableId']}/hands").json()["hands"]
    assert len(ha) == 2 and len(hb) == 1
    assert all(h["username"] == "Alice" for h in ha)
    assert all(h["username"] == "Bob" for h in hb)

# ---------------------------------------------------------------------------
# A06 table labels and repeat tournaments
# ---------------------------------------------------------------------------
def test_label_for_index() -> None:
    assert _label_for_index(0) == "A"
    assert _label_for_index(25) == "Z"
    assert _label_for_index(26) == "AA"
    assert _label_for_index(27) == "AB"
    assert _label_for_index(51) == "AZ"
    assert _label_for_index(52) == "BA"

def test_new_tournaments_get_distinct_labels_and_ids() -> None:
    first = _table(alice)
    second = _table(alice)
    third = _table(alice)
    labels = {first["tableLabel"], second["tableLabel"], third["tableLabel"]}
    ids = {first["tableId"], second["tableId"], third["tableId"]}
    assert len(labels) == 3, labels
    assert len(ids) == 3, ids
    # repeat tournament: previous history stays with its own session
    _play_hand(alice, first["tableId"])
    assert len(alice.get(f"/api/game/{first['tableId']}/hands").json()["hands"]) == 1
    assert len(alice.get(f"/api/game/{second['tableId']}/hands").json()["hands"]) == 0

# ---------------------------------------------------------------------------
# A07 hand history fields + best-effort file persistence
# ---------------------------------------------------------------------------

def test_history_records_carry_user_metadata(tmp_path) -> None:
    from app.services.hand_history import HandHistoryRecord, HistoryFileStore
    store = HistoryFileStore(str(tmp_path), "sess1")
    rec = HandHistoryRecord(
        hand_number=1, hero_cards=[], hero_position="CO", community_cards=[],
        starting_stack=100, ending_stack=120, blind_level="100/100",
        actions=[], pot_total=40, winner_seats=[0],
        username="Alice", table_label="A", timestamp="2026-09-03T10:00:00+0000",
    )
    store.append(rec)
    import json
    data = json.loads((tmp_path / "sess1.jsonl").read_text().splitlines()[0])
    assert (data["username"], data["table_label"], data["hand_number"]) == ("Alice", "A", 1)

def test_no_file_written_when_history_dir_empty() -> None:
    from app.services.hand_history import HandHistoryRecord, HistoryFileStore
    store = HistoryFileStore("", "sess2")
    rec = HandHistoryRecord(
        hand_number=1, hero_cards=[], hero_position="CO", community_cards=[],
        starting_stack=100, ending_stack=120, blind_level="100/100",
        actions=[], pot_total=40, winner_seats=[0],
    )
    store.append(rec)
    assert not pathlib.Path("sess2.jsonl").exists()

def test_websocket_cross_user_denied() -> None:
    """A second user's websocket must not see another user's table (A12)."""
    from tests.api_helpers import ws_url

    state = _table(alice)
    tid = state["tableId"]
    with alice.websocket_connect(ws_url(tid, alice)) as ws:
        ws.send_text("state")
        assert ws.receive_json()["tableId"] == tid
    # Bob's socket is rejected (server sends the error and closes)
    with bob.websocket_connect(ws_url(tid, bob)) as ws:
        assert ws.receive_json() == {"error": "table not found"}
