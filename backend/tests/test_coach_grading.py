"""Grading compares the hero's decision against the advice that stood when the
hero made it, not against advice recomputed after the bots have answered.

Recomputing was how a call got graded against a recommended bet on a later
street: by the time grade_hero ran, the board and the pot had moved on.
"""
from __future__ import annotations

import random

from app.game.actions import ActionType
from app.services.game_session import GameSession


def _session() -> GameSession:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    return session


def _hero_can_act(session: GameSession) -> bool:
    return (
        session.engine is not None
        and not session.engine.is_complete
        and session.engine.current_actor == session.hero_seat
    )


def test_grade_uses_the_advice_from_the_moment_the_hero_acted() -> None:
    session = _session()
    assert _hero_can_act(session), "seeded hand should reach the hero"
    expected = session.coach_advice()["recommendedAction"]

    session.hero_action(ActionType.CALL.value if session.state()["toCall"] else "check")
    graded = session.grade_hero()

    assert graded is not None
    assert graded["coachAction"] == expected, (
        "graded against advice for a different decision point"
    )


def test_grading_before_the_hero_acts_returns_nothing() -> None:
    assert _session().grade_hero() is None


def test_a_new_hand_does_not_carry_the_previous_grade() -> None:
    session = _session()
    while not session.engine.is_complete:
        if _hero_can_act(session):
            session.hero_action("fold")
        else:
            break
    assert session.grade_hero() is not None
    session.next_hand()
    assert session.grade_hero() is None, "a new hand graded the previous hand's action"
