"""Free and Pro plans (plan 100): the server decides what each plan gets.

The suite default is Pro (conftest); this file switches the store to Free.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services import plans
from tests.api_helpers import login_client

ADMIN = "PlanBoss"
LINEUP = ["tight_passive"] * 8
HAND = {"heroCards": [{"rank": "A", "suit": "s"}, {"rank": "K", "suit": "s"}],
        "position": "BTN", "stack": 3000, "bigBlind": 100, "smallBlind": 50, "ante": 0,
        "pot": 150, "toCall": 100, "board": [], "street": "preflop", "playersRemaining": 9,
        "paidPositions": 3, "stacks": [3000] * 9, "payout": [0.5, 0.3, 0.2],
        "facingRaise": False, "heroSeat": 0}


@pytest.fixture(autouse=True)
def free_default(monkeypatch: pytest.MonkeyPatch) -> None:
    plans.store.default_plan = "free"
    monkeypatch.setattr(settings, "admin_usernames", ADMIN)


def _table(client: TestClient, **body: object) -> str:
    response = client.post("/api/tournament", json=body)
    assert response.status_code == 200, response.text
    return response.json()["tableId"]


def _pro_calls(client: TestClient, table: str) -> list:
    return [
        client.post(f"/api/game/{table}/coach"),
        client.post(f"/api/game/{table}/coach/compare"),
        client.post("/api/coach/advice", json=HAND),
        client.get("/api/coach/hands"),
        client.get("/api/ranges"),
        client.get("/api/icm", params={"stacks": "5000,3000", "payouts": "0.6,0.4"}),
        client.get(f"/api/game/{table}/hands"),
        client.get(f"/api/game/{table}/statistics"),
        client.get("/api/history/tournaments"),
        client.get(f"/api/history/tournaments/{table}/hands"),
        client.get("/api/history/report"),
    ]


def test_free_gets_402_on_every_pro_endpoint_but_plays() -> None:
    client = login_client("FreeOne")
    assert client.get("/api/account").json()["plan"] == "free"
    table = _table(client)
    assert client.get(f"/api/game/{table}/state").status_code == 200
    assert client.get("/api/settings").status_code == 200
    for response in _pro_calls(client, table):
        assert response.status_code == 402, response.request.url
        assert response.json() == {"detail": "pro_required"}


def test_pro_and_admin_pass_the_gate() -> None:
    pro, admin = login_client("ProOne"), login_client(ADMIN)
    plans.set_plan("ProOne", "pro")
    assert pro.get("/api/account").json()["plan"] == "pro"
    for client in (pro, admin):
        table = _table(client)
        for response in _pro_calls(client, table):
            assert response.status_code != 402, response.request.url
    assert admin.get("/api/account").json()["admin"] is True
    assert plans.plan_for(ADMIN) == "free"  # no row: the admin passes by is_admin


def _lineup(client: TestClient, **body: object) -> list[str]:
    table = _table(client, **body)
    state = client.get(f"/api/game/{table}/state").json()
    return [p["name"] for p in state["players"][1:]]


def test_a_free_admin_row_still_passes() -> None:
    admin = login_client(ADMIN)
    plans.set_plan(ADMIN, "free")
    assert admin.get("/api/ranges").status_code == 200
    assert all(n.startswith("David") for n in _lineup(admin, bots=LINEUP))


def test_free_lineup_is_random_from_four_personalities_pro_chooses() -> None:
    free, pro = login_client("FreeLine"), login_client("ProLine")
    plans.set_plan("ProLine", "pro")
    names = _lineup(free, bots=LINEUP)
    assert len(names) == 8 and not all(n.startswith("David") for n in names)
    assert all(n.split()[0] in {"Alex", "Sarah", "David", "Emma"} for n in names)
    assert all(n.startswith("David") for n in _lineup(pro, bots=LINEUP))
    assert len(_lineup(free, bots=["nonsense"])) == 8 and len(_lineup(free, profile="nope")) == 8
    assert pro.post("/api/tournament", json={"bots": ["x"] * 8}).status_code == 422


def test_only_an_admin_sets_a_plan() -> None:
    admin, user = login_client(ADMIN), login_client("PlanTarget")
    assert user.put("/api/admin/users/PlanTarget/plan", json={"plan": "pro"}).status_code == 403
    assert admin.put("/api/admin/users/PlanTarget/plan", json={"plan": "gold"}).status_code == 422
    assert admin.put("/api/admin/users/Nobody/plan", json={"plan": "pro"}).status_code == 404
    done = admin.put("/api/admin/users/PlanTarget/plan", json={"plan": "pro"})
    assert done.json() == {"username": "PlanTarget", "plan": "pro"}
    assert user.get("/api/account").json()["plan"] == "pro"
    row = next(u for u in admin.get("/api/admin/users").json()["users"]
               if u["username"] == "PlanTarget")
    assert row["plan"] == "pro"
    assert admin.put("/api/admin/users/PlanTarget/plan", json={"plan": "free"}).status_code == 200
    assert user.get("/api/ranges").status_code == 402


def test_deleting_an_account_deletes_its_plan() -> None:
    client = login_client("PlanGone")
    plans.set_plan("PlanGone", "pro")
    response = client.request("DELETE", "/api/account", json={"password": "test-pass-1234"})
    assert response.status_code == 200 and response.json()["plan_deleted"] == 1
    assert plans.store.get("PlanGone") is None


def test_an_expired_pro_row_is_free() -> None:
    from datetime import UTC, datetime, timedelta
    now = datetime.now(UTC)
    plans.store.put(plans.PlanRow("Lapsed", "pro", "web", until=now - timedelta(days=1)))
    plans.store.put(plans.PlanRow("Paid", "pro", "web", until=now + timedelta(days=1)))
    assert (plans.is_pro("Lapsed"), plans.is_pro("Paid")) == (False, True)
