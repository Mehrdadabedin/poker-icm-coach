"""Re-entry / bust-out rule tests (Atomic Part 047 + A39).

A39: re-entry is available only through Level 5 (level_index < 5): BOTs
re-enter automatically; the hero never gets an automatic stack and instead
goes into an awaiting-re-entry state resolved through POST /api/game/{id}/reentry.
Elimination starts at Level 6 (level_index >= 5).
"""
from __future__ import annotations

from app.services.game_session import GameSession
from app.services.session_store import session_store
from tests.api_helpers import login_client


def session_with(stack: int = 45_000, level: int = 0) -> GameSession:
    s = GameSession(starting_stack=stack)
    s.start()
    s.tournament.level_index = level
    # bust one bot to 0 chips without eliminating it
    bot = s.tournament.players[1]
    bot.stack = 0
    return s


def test_bot_reentry_levels_1_to_5() -> None:
    for level in range(5):  # Levels 1..5 (level_index 0..4)
        s = session_with(level=level)
        s._apply_reentry_or_eliminate()
        bot = s.tournament.players[1]
        assert not bot.is_eliminated, f"level {level + 1} should re-enter"
        assert bot.stack == 45_000


def test_bot_elimination_from_level_6() -> None:
    for level in (5, 10):  # Levels 6+ eliminate
        s = session_with(level=level)
        s._apply_reentry_or_eliminate()
        bot = s.tournament.players[1]
        assert bot.is_eliminated, f"level {level + 1} should eliminate"
        assert bot.stack == 0


def test_hero_levels_1_to_5_never_auto_restore() -> None:
    for level in (0, 4):  # Levels 1 and 5: pending, parked, not restored
        s = session_with(level=level)
        hero = s.tournament.players[0]
        hero.stack = 0
        s._apply_reentry_or_eliminate()
        assert hero.awaiting_reentry is True
        assert hero.sit_out is True
        assert hero.stack == 0  # no automatic 45k
        assert not hero.is_eliminated


def test_hero_level_6_permanent_elimination() -> None:
    s = session_with(level=5)  # Level 6
    hero = s.tournament.players[0]
    hero.stack = 0
    s._apply_reentry_or_eliminate()
    assert hero.is_eliminated
    assert hero.awaiting_reentry is False
    assert hero.stack == 0


def test_hero_reentry_route_restores_exactly_45000() -> None:
    client = login_client("ReentryUser")
    table = client.post("/api/tournament", json={"players": 9}).json()
    tid = table["tableId"]
    session = session_store.get(tid)
    hero = session.tournament.players[session.hero_seat]
    session.tournament.level_index = 0
    hero.stack = 0
    session._apply_reentry_or_eliminate()
    assert hero.awaiting_reentry is True

    ok = client.post(f"/api/game/{tid}/reentry")
    assert ok.status_code == 200, ok.text
    body = ok.json()
    hero_after = next(p for p in body["players"] if p["isHero"])
    assert hero_after["stack"] == 45_000
    assert hero_after["sitsOut"] is False
    assert hero_after["awaitingReentry"] is False
    # a second re-entry is refused
    assert client.post(f"/api/game/{tid}/reentry").status_code == 400
    assert client.post("/api/game/does-not-exist/reentry").status_code == 404


def test_reentry_route_unavailable_when_not_awaiting() -> None:
    client = login_client("ReentryDeny")
    table = client.post("/api/tournament", json={"players": 9}).json()
    tid = table["tableId"]
    session = session_store.get(tid)
    session.tournament.players[session.hero_seat].stack = 45_000  # alive
    assert client.post(f"/api/game/{tid}/reentry").status_code == 400


def test_players_with_stack_untouched() -> None:
    s = session_with()
    before = s.tournament.players[0].stack
    s._apply_reentry_or_eliminate()
    assert s.tournament.players[0].stack == before
    assert not s.tournament.players[0].is_eliminated


def test_no_negative_stacks() -> None:
    s = session_with()
    s._apply_reentry_or_eliminate()
    assert all(p.stack >= 0 for p in s.tournament.players)
