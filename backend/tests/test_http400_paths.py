"""A02 — HTTP 400 / CORS regression tests.

Root-cause summary (verified live during the audit):
- CORS is configured correctly for the deployed origin; preflight OPTIONS and
  every error response carry access-control-allow-origin. No CORS change is
  needed.
- The visible HTTP 400s during gameplay are intentional validation responses
  raised as JSON {detail: ...}. They must stay clean JSON, must not break the
  session, and the frontend must handle them without unhandled rejections or
  double-submits.
- The screenshot-era '/cache/compare' route no longer exists; the frontend
  calls the real '/coach/compare'.
"""
from __future__ import annotations

from tests.api_helpers import login_client

client = login_client()

RENDER_ORIGIN = "https://icm-master-frontend.onrender.com"


def _create_table() -> str:
    r = client.post("/api/tournament", json={
        "players": 9, "ante_mode": "none", "fast_mode": 1.0,
    })
    assert r.status_code == 200, r.text
    return r.json()["tableId"]


def assert_cors_headers(response) -> None:
    assert response.headers.get("access-control-allow-origin") == RENDER_ORIGIN


def test_preflight_has_cors_headers() -> None:
    r = client.options(
        "/api/game/some-table/action",
        headers={
            "Origin": RENDER_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert r.status_code == 200
    assert_cors_headers(r)


def test_error_responses_carry_cors_headers() -> None:
    # 404 (unknown table)
    r = client.get("/api/game/nope/state", headers={"Origin": RENDER_ORIGIN})
    assert r.status_code == 404
    assert_cors_headers(r)
    assert r.json() == {"detail": "table not found"}
    # 400 (next-hand while hand in progress)
    tid = _create_table()
    r = client.post(f"/api/game/{tid}/next-hand", headers={"Origin": RENDER_ORIGIN})
    assert r.status_code == 400
    assert_cors_headers(r)
    assert r.json() == {"detail": "current hand is still in progress"}
    # 400 (hero has not acted yet before coach/compare)
    r = client.post(f"/api/game/{tid}/coach/compare", headers={"Origin": RENDER_ORIGIN})
    assert r.status_code == 400
    assert_cors_headers(r)
    assert r.json() == {"detail": "hero has not acted yet"}


def test_invalid_action_payload_clean_422_with_cors() -> None:
    tid = _create_table()
    r = client.post(
        f"/api/game/{tid}/action", json={"kind": "bogus"},
        headers={"Origin": RENDER_ORIGIN},
    )
    assert r.status_code == 422
    assert_cors_headers(r)
    assert "detail" in r.json()


def test_many_consecutive_hands_no_errors() -> None:
    """Play 15 full hands; every action and next-hand must return 200."""
    tid = _create_table()
    for _ in range(15):
        state = client.get(f"/api/game/{tid}/state").json()
        for _guard in range(300):
            state = client.get(f"/api/game/{tid}/state").json()
            if state["phase"] == "handOver":
                break
            if state["waitingForHero"]:
                legal = [a["kind"] for a in state["legalActions"]]
                kind = "check" if "check" in legal else ("call" if "call" in legal else "fold")
                r = client.post(f"/api/game/{tid}/action", json={"kind": kind})
                assert r.status_code == 200, r.text
        else:
            raise AssertionError("hand did not finish")
        r = client.post(f"/api/game/{tid}/next-hand")
        assert r.status_code == 200, r.text
    assert client.get(f"/api/game/{tid}/state").json()["handNumber"] == 16
