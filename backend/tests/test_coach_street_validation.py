"""Issue #7 — coach advice street/board validation."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_BOARD = [
    {"rank": "2", "suit": "c"}, {"rank": "3", "suit": "d"}, {"rank": "4", "suit": "h"},
    {"rank": "5", "suit": "s"}, {"rank": "6", "suit": "c"},
]


def _payload(board_len: int, street: str) -> dict:
    return {
        "heroCards": [{"rank": "A", "suit": "s"}, {"rank": "K", "suit": "h"}],
        "position": "BTN", "stack": 30000, "bigBlind": 100, "smallBlind": 50,
        "ante": 0, "pot": 1000, "toCall": 0,
        "board": _BOARD[:board_len], "street": street,
        "playersRemaining": 9, "paidPositions": 6,
        "stacks": [30000] * 9, "payout": [0.4, 0.25, 0.15, 0.1, 0.06, 0.04],
        "facingRaise": False, "heroSeat": 0, "mode": "advanced",
    }


def test_valid_combinations_ok() -> None:
    for n, street in [(0, "preflop"), (3, "flop"), (4, "turn"), (5, "river")]:
        r = client.post("/api/coach/advice", json=_payload(n, street))
        assert r.status_code == 200, (n, r.text)


def test_invalid_street_rejected_422() -> None:
    # one or two card boards labelled river / flop / turn must be rejected
    for n, street in [(1, "river"), (2, "river"), (1, "flop"), (2, "turn"), (3, "river")]:
        r = client.post("/api/coach/advice", json=_payload(n, street))
        assert r.status_code == 422, (n, street, r.text)
        assert "street" in r.text.lower() or "board" in r.text.lower()
