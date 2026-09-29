"""A26: BOT profile wiring at tournament creation.

The optional `profile` field on POST /api/tournament must reach the AI
provider's personality, and unknown profile names must fail cleanly. The
default (no profile) keeps the existing adaptive personality so prior
behaviour is unchanged.
"""
from __future__ import annotations

from app.ai.personalities import profile_for
from app.services.session_store import session_store

from tests.api_helpers import login_client


def test_profile_sets_bot_personality() -> None:
    client = login_client("ProfileLag")
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0,
                          "profile": "lag"})
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    assert session.bot_profile == "lag"
    assert session.provider.personality.name == "lag"


def test_tight_passive_profile_wiring() -> None:
    client = login_client("ProfileTightPassive")
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0,
                          "profile": "tight_passive"})
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    assert session.provider.personality.name == "tight_passive"
    assert profile_for("tight_passive").vpip < 0.25


def test_no_profile_keeps_default_adaptive() -> None:
    client = login_client("ProfileNone")
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0})
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    assert session.bot_profile is None
    assert session.provider.personality.name == "adaptive"


def test_unknown_profile_fails_cleanly() -> None:
    client = login_client("ProfileBad")
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0,
                          "profile": "does-not-exist"})
    assert r.status_code == 422
    assert "unknown bot profile" in r.text
