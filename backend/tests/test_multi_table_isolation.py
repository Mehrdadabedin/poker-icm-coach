"""Sequential multi-table isolation audit (concurrent proof lives in
test_concurrent_isolation.py): actions/next-hand/coach on TABLE_A must
leave TABLE_B unchanged except for the wall-clock-only `secondsLeft`."""

from __future__ import annotations

from app.api.routes_game import _sessions
from tests.api_helpers import login_client

client = login_client("Alice")

TOURNAMENT = {"players": 9, "ante_mode": "none", "fast_mode": 1.0}
_TIME_VOLATILE = {"secondsLeft"}

def create_table(starting_stack: int = 45_000, blind_level_minutes: int = 20,
                 fast_mode: float = 1.0, c=None) -> str:
    c = c or client
    body = dict(TOURNAMENT, starting_stack=starting_stack,
                blind_level_minutes=blind_level_minutes, fast_mode=fast_mode)
    r = c.post("/api/tournament", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["tableId"]
    return r.json()["tableId"]

def state_of(table_id: str, c=None) -> dict:
    c = c or client
    r = c.get(f"/api/game/{table_id}/state")
    assert r.status_code == 200, r.text
    return r.json()

def act_hero(table_id: str, kind: str, amount: int | None = None, c=None) -> dict:
    c = c or client
    body = {"kind": kind}
    if amount is not None:
        body["amount"] = amount
    r = c.post(f"/api/game/{table_id}/action", json=body)
    assert r.status_code == 200, r.text
    return r.json()

def simple_hero_action(state: dict) -> str:
    legal = [a["kind"] for a in state["legalActions"]]
    if "check" in legal:
        return "check"
    if "call" in legal:
        return "call"
    return "fold"

def play_one_hand(table_id: str, c=None) -> int:
    for _ in range(400):
        state = state_of(table_id, c)
        if state["phase"] == "handOver":
            return state["handNumber"]
        if state["waitingForHero"]:
            act_hero(table_id, simple_hero_action(state), c=c)
    raise AssertionError(f"hand on {table_id} did not finish")

def play_hands(table_id: str, count: int, c=None) -> int:
    for _ in range(count):
        play_one_hand(table_id, c)
        r = (c or client).post(f"/api/game/{table_id}/next-hand")
        assert r.status_code == 200, r.text
    return state_of(table_id, c)["handNumber"]

def chips_in_play(state: dict) -> int:

    return sum(p["stack"] for p in state["players"]) + sum(p["bet"] for p in state["players"])

def normalized(state: dict) -> dict:
    out = dict(state)
    for key in _TIME_VOLATILE:
        out.pop(key, None)
    return out

def game_fingerprint(table_id: str, c=None) -> dict:
    return normalized(state_of(table_id, c))

def assert_fingerprint_unchanged(before: dict, table_id: str, c=None) -> None:
    after = game_fingerprint(table_id, c)
    assert before == after, f"table {table_id} changed unexpectedly:\n{before}\n!=\n{after}"

# --- Structural isolation ---

def test_distinct_table_ids_are_distinct_session_objects() -> None:
    a = create_table()
    b = create_table()
    assert a != b
    assert _sessions[a] is not _sessions[b]
    assert _sessions[a].session_id == a
    assert _sessions[b].session_id == b

def test_different_stacks_and_blinds_are_isolated() -> None:
    a = create_table(starting_stack=35_000, blind_level_minutes=5)
    b = create_table(starting_stack=48_000, blind_level_minutes=20)
    sa, sb = state_of(a), state_of(b)
    hero_a = next(p for p in sa["players"] if p["isHero"])
    hero_b = next(p for p in sb["players"] if p["isHero"])
    assert hero_a["stack"] == 35_000, hero_a
    assert hero_b["stack"] == 48_000, hero_b
    assert sa["tableId"] == a and sb["tableId"] == b
    assert chips_in_play(sa) == 35_000 * 9
    assert chips_in_play(sb) == 48_000 * 9

def test_many_tables_all_independent() -> None:
    tables = {create_table(starting_stack=10_000 * i): 10_000 * i for i in range(1, 7)}
    for tid, stack in tables.items():
        s = state_of(tid)
        hero = next(p for p in s["players"] if p["isHero"])
        assert hero["stack"] == stack
        assert s["handNumber"] == 1
    first = next(iter(tables))
    play_hands(first, 1)
    for tid, stack in tables.items():
        if tid == first:
            continue
        s = state_of(tid)
        assert s["handNumber"] == 1
        hero = next(p for p in s["players"] if p["isHero"])
        assert hero["stack"] == stack, (tid, hero)
        assert chips_in_play(s) == stack * 9

# --- Sequential mutation isolation (the core requirement) ---

def test_actions_on_table_a_never_change_table_b() -> None:
    a = create_table(starting_stack=35_000)
    b = create_table(starting_stack=48_000)
    before_b = game_fingerprint(b)
    before_a = game_fingerprint(a)

    play_hands(a, 3)  # hero acts whenever it is A's turn

    after_a = game_fingerprint(a)
    assert after_a["handNumber"] == 4
    assert after_a != before_a
    hero_a = next(p for p in after_a["players"] if p["isHero"])
    assert hero_a["stack"] > 0  # hero survived; may have won or lost chips

    assert_fingerprint_unchanged(before_b, b)
    assert state_of(b)["totalChips"] == before_b["totalChips"]

def test_next_hand_only_advances_own_table() -> None:
    a = create_table()
    b = create_table()
    play_one_hand(a)
    r = client.post(f"/api/game/{a}/next-hand")
    assert r.status_code == 200
    assert r.json()["handNumber"] == 2
    assert state_of(b)["handNumber"] == 1

def test_next_hand_rejected_when_own_hand_in_progress_but_other_table_unaffected() -> None:
    a = create_table()
    b = create_table()
    r = client.post(f"/api/game/{a}/next-hand")
    assert r.status_code == 400
    assert state_of(a)["handNumber"] == 1
    assert state_of(b)["handNumber"] == 1
    assert_fingerprint_unchanged(game_fingerprint(b), b)

# --- Hand history / statistics / coach isolation ---

def test_hand_history_isolation() -> None:
    a = create_table()
    b = create_table()
    play_hands(a, 3)
    ha = client.get(f"/api/game/{a}/hands").json()["hands"]
    hb = client.get(f"/api/game/{b}/hands").json()["hands"]
    assert len(ha) == 3
    assert len(hb) == 0
    assert [h["handNumber"] for h in ha] == [1, 2, 3]
    assert client.get(f"/api/game/{b}/statistics").json()["handsPlayed"] == 0
    assert client.get(f"/api/game/{a}/statistics").json()["handsPlayed"] == 3

def test_coach_advice_uses_own_table_state() -> None:
    a = create_table(starting_stack=30_000)
    b = create_table(starting_stack=70_000, blind_level_minutes=10)
    ca = client.post(f"/api/game/{a}/coach")
    cb = client.post(f"/api/game/{b}/coach")
    assert ca.status_code == 200 and cb.status_code == 200
    da = ca.json().get("detail") or {}
    db = cb.json().get("detail") or {}
    assert "30,000" in da.get("STACK", ""), da
    assert "70,000" in db.get("STACK", ""), db
    assert ca.json()["recommendedAction"]
    assert cb.json()["recommendedAction"]
