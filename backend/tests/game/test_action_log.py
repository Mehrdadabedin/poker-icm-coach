"""The action log records the chips that went in, not the caller's number.

Split from test_betting_rules.py to stay under the 200-line file cap.
"""
from __future__ import annotations

import random

import pytest

from app.game.actions import Action, ActionType
from app.services.game_session import GameSession


def _session_at_the_hero(seed: int = 11) -> GameSession:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(seed))
    session.start()
    engine = session.engine
    assert engine is not None
    while engine.current_actor != session.hero_seat and not engine.is_complete:
        engine.advance_bot(engine.current_actor)
    if engine.is_complete:
        pytest.skip("seeded hand ended before the hero acted")
    return session


def test_the_log_records_what_went_in_not_what_the_caller_sent() -> None:
    """apply_action ignores the amount on an ALL_IN and commits the stack, so a
    bot was logged at its bare stack and the hero at whatever the client sent.
    Neither matched the street total the shove actually made."""
    session = _session_at_the_hero()
    engine = session.engine
    hero = session.hero_seat
    contributed = engine._street.contributions.get(hero, 0)
    stack = session.tournament.players[hero].stack

    engine.act(hero, Action(ActionType.ALL_IN, amount=1, is_all_in=True))  # a lying amount

    logged = [a for a in engine._log if a.seat == hero and a.action == "all_in"][-1]
    assert logged.amount == contributed + stack, "the log believed the caller"
    assert logged.amount != 1


def test_a_fold_logs_no_amount() -> None:
    session = _session_at_the_hero()
    engine = session.engine
    engine.act(session.hero_seat, Action(ActionType.FOLD))
    logged = [a for a in engine._log if a.seat == session.hero_seat][-1]
    assert logged.action == "fold" and logged.amount is None
