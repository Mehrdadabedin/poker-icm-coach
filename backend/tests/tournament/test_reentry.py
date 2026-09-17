"""Re-entry / bust-out rule tests (Atomic Part 047)."""
from __future__ import annotations

from app.services.game_session import GameSession


def session_with(stack: int = 45_000, level: int = 0) -> GameSession:
    s = GameSession(starting_stack=stack)
    s.start()
    s.tournament.level_index = level
    # bust one bot to 0 chips without eliminating it
    bot = s.tournament.players[1]
    bot.stack = 0
    return s


def test_reentry_level_1() -> None:
    s = session_with(level=0)
    s._apply_reentry_or_eliminate()
    assert not s.tournament.players[1].is_eliminated
    assert s.tournament.players[1].stack == 45_000


def test_reentry_level_2_and_3() -> None:
    for level in (1, 2):
        s = session_with(level=level)
        s._apply_reentry_or_eliminate()
        assert not s.tournament.players[1].is_eliminated
        assert s.tournament.players[1].stack == 45_000


def test_elimination_from_level_4() -> None:
    for level in (3, 10):
        s = session_with(level=level)
        s._apply_reentry_or_eliminate()
        assert s.tournament.players[1].is_eliminated, f"level {level + 1} should eliminate"
        assert s.tournament.players[1].stack == 0


def test_players_with_stack_untouched() -> None:
    s = session_with()
    before = s.tournament.players[0].stack
    s._apply_reentry_or_eliminate()
    # re-entry must never reset or eliminate a player with a stack (their
    # current stack depends on blinds posted at hand start, not on re-entry)
    assert s.tournament.players[0].stack == before
    assert not s.tournament.players[0].is_eliminated


def test_no_negative_stacks() -> None:
    s = session_with()
    s._apply_reentry_or_eliminate()
    assert all(p.stack >= 0 for p in s.tournament.players)


def test_next_hand_applies_reentry_then_elimination() -> None:
    """Bust a bot in level 1 -> reset; advance to level 4 -> eliminate."""
    from tests.api_helpers import login_client
    client = login_client()
    client.post("/api/tournament", json={"players": 9}).json()["tableId"]

    s = GameSession(starting_stack=45_000)
    s.start()
    # complete the current hand first (engine complete)
    while not s.engine.is_complete:
        actor = s.engine.current_actor
        if actor is None:
            break
        if s.tournament.players[actor].is_human:
            from app.game.actions import Action, ActionType
            s.engine.act(actor, Action(ActionType.FOLD))
        else:
            s.engine.advance_bot(actor)
    # simulate a level 1 bust: bot ends the hand at 0 chips
    bot = s.tournament.players[2]
    bot.stack = 0
    s.next_hand()  # applies re-entry
    # Re-entry resets the stack to the starting amount. next_hand deals the
    # next hand and runs the bots up to the hero, so this seat may have posted
    # a blind and may also have called or raised by now. What is behind plus
    # what is already in front of it still has to add back up to the reset.
    # The RNG is not seeded, and bounding the stack by one blind made this test
    # fail whenever the seat acted voluntarily before the hero.
    assert not bot.is_eliminated
    assert bot.stack + bot.bet_total == 45_000, (bot.stack, bot.bet_total)

    # level 4 bust -> eliminated
    bot2 = s.tournament.players[3]
    s.tournament.level_index = 3
    while not s.engine.is_complete:
        actor = s.engine.current_actor
        if actor is None:
            break
        if s.tournament.players[actor].is_human:
            from app.game.actions import Action, ActionType
            s.engine.act(actor, Action(ActionType.FOLD))
        else:
            s.engine.advance_bot(actor)
    bot2.stack = 0
    s.next_hand()
    assert bot2.is_eliminated and bot2.stack == 0
