"""A26/A27/A28: BOT profile wiring, lineups and display names at creation."""
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


# ---------------- A27: multi-BOT lineup (composition of 8 opponents) ----------------

def _create_with_bots(client, names: list[str]):
    return client.post("/api/tournament",
                       json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0,
                             "bots": names})


def test_bot_composition_sets_per_seat_personalities() -> None:
    client = login_client("LineupSeats")
    lineup = ["tag", "tag", "lag", "tight_passive", "tight_passive",
              "tight_passive", "loose_passive", "loose_passive"]
    r = _create_with_bots(client, lineup)
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    assert session.bot_profiles == lineup
    seats = session.provider.seat_personalities
    assert [seats[s].name for s in sorted(seats)] == lineup
    # the human seat (0) is never in the lineup map
    assert 0 not in seats


def test_same_profile_can_repeat_and_stays_separate() -> None:
    client = login_client("LineupRepeat")
    lineup = ["tag"] * 8  # eight bots sharing one personality
    r = _create_with_bots(client, lineup)
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    seats = session.provider.seat_personalities
    assert len(seats) == 8
    assert all(p.name == "tag" for p in seats.values())
    assert len({id(p) for p in seats.values()}) == 8  # distinct instances


def test_bots_list_rejects_wrong_count() -> None:
    client = login_client("LineupShort")
    r = _create_with_bots(client, ["tag", "lag"])  # only 2 of 8
    assert r.status_code == 422
    assert "exactly 8" in r.text


def test_bots_list_rejects_unknown_profile() -> None:
    client = login_client("LineupBad")
    lineup = ["tag", "lag", "tag", "lag", "tag", "lag", "tag", "does-not-exist"]
    r = _create_with_bots(client, lineup)
    assert r.status_code == 422
    assert "does-not-exist" in r.text


def test_no_bots_keeps_seats_unmapped() -> None:
    client = login_client("LineupNone")
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0})
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    assert session.bot_profiles is None
    assert session.provider.seat_personalities == {}


def test_decide_uses_the_seat_specific_personality() -> None:
    from types import SimpleNamespace

    from app.ai.ai_framework import AIDecisionProvider
    from app.ai.personalities import personalities_for_seats, profile_for
    from app.game.actions import Action, ActionType

    seen: dict[str, str] = {}

    def recording_strategy(ctx, provider):  # type: ignore[no-untyped-def]
        seen["name"] = provider.personality.name
        return Action(ActionType.CHECK)

    provider = AIDecisionProvider(strategy=recording_strategy,
                                  personality=profile_for("balanced"))
    provider.seat_personalities = personalities_for_seats(["tag", "lag", "tag"])
    check = Action(ActionType.CHECK)
    provider.decide(SimpleNamespace(seat=1, legal_actions=[check],
                                    stack=0, current_bet=0, contribution=0))
    assert seen["name"] == "tag"
    # an unmapped seat falls back to the provider default
    provider.decide(SimpleNamespace(seat=5, legal_actions=[check],
                                    stack=0, current_bet=0, contribution=0))
    assert seen["name"] == "balanced"


# ---------------- A28: profile display names at the table ----------------

def _bot_names(client) -> list[str]:
    session = session_store.get(client.post(
        "/api/tournament", json={"players": 9, "ante_mode": "bba",
                                 "fast_mode": 1.0}).json()["tableId"])
    assert session is not None
    return [p.name for p in session.tournament.players]


def _create(client, extra: dict) -> tuple[list[str], list[str]]:
    r = client.post("/api/tournament",
                    json={"players": 9, "ante_mode": "bba", "fast_mode": 1.0,
                          **extra})
    assert r.status_code == 200, r.text
    session = session_store.get(r.json()["tableId"])
    assert session is not None
    return ([p.name for p in session.tournament.players][1:],
            session.owner)


def test_lineup_names_number_per_profile_occurrence() -> None:
    lineup = ["tag", "tight_passive", "tag", "loose_passive",
              "lag", "tight_passive", "tight_passive", "loose_passive"]
    names, owner = _create(login_client("NamesLineup"), {"bots": lineup})
    assert [owner, *names] == ["NamesLineup", "Alex 1", "David 1", "Alex 2",
                               "Emma 1", "Sarah 1", "David 2", "David 3",
                               "Emma 2"]


def test_repeat_same_profile_names_are_numbered() -> None:
    names, _ = _create(login_client("NamesRepeat"), {"bots": ["tag"] * 8})
    assert names == [f"Alex {i}" for i in range(1, 9)]


def test_lineup_identity_stays_unique() -> None:
    lineup = ["tag", "tag", "lag", "tight_passive", "tight_passive",
              "tight_passive", "loose_passive", "loose_passive"]
    r = login_client("NamesIdentity").post(
        "/api/tournament", json={"players": 9, "ante_mode": "bba",
                                 "fast_mode": 1.0, "bots": lineup})
    bots = session_store.get(r.json()["tableId"]).tournament.players[1:]
    assert [p.seat for p in bots] == list(range(1, 9))
    assert len({id(p) for p in bots}) == 8
    assert len({(p.seat, p.name) for p in bots}) == 8


def test_no_lineup_keeps_bot_names() -> None:
    names = _bot_names(login_client("NamesDefault"))
    assert names[0] == "NamesDefault"
    assert names[1:] == [f"Bot {i}" for i in range(1, 9)]


def test_single_profile_names_all_bots() -> None:
    names, _ = _create(login_client("NamesSingle"), {"profile": "tag"})
    assert names == [f"Alex {i}" for i in range(1, 9)]
