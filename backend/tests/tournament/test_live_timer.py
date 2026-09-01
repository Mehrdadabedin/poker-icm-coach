"""Live tournament timer tests (Atomic Part 056).

The tournament clock must persist across hands: starting a new hand must not
reset the timer, and the blind level advances only when the level duration
expires.
"""
from __future__ import annotations

import random

from app.game.actions import Action, ActionType
from app.services.game_session import GameSession


class FakeClock:
    def __init__(self, start: float = 0.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now


def play_hand(session: GameSession) -> None:
    """Drive the current hand to completion (hero folds, bots act)."""
    while not session.engine.is_complete:
        actor = session.engine.current_actor
        if actor is None:
            break
        if session.tournament.players[actor].is_human:
            session.engine.act(actor, Action(ActionType.FOLD))
        else:
            session.engine.advance_bot(actor)


def session_with_clock(fast: float = 1.0) -> tuple[GameSession, FakeClock]:
    s = GameSession(fast_mode=fast, rng=random.Random(7))
    s.start()
    clock = FakeClock(0.0)
    s.timer.clock = clock
    s.timer.reset()  # clear the real-clock start, then start on the fake clock
    s.timer.start()
    return s, clock


def test_timer_persists_across_hands() -> None:
    s, clock = session_with_clock()
    assert s.state()["secondsLeft"] == 1200
    clock.now = 100.0  # 100 seconds of tournament time
    play_hand(s)
    s.next_hand()
    after = s.state()
    assert after["level"] == 1
    assert after["secondsLeft"] == 1100, "timer must not reset on a new hand"


def test_timer_does_not_reset_when_hand_changes() -> None:
    s, clock = session_with_clock()
    clock.now = 100.0
    play_hand(s)
    s.next_hand()
    t1 = s.state()["secondsLeft"]
    clock.now = 300.0
    play_hand(s)
    s.next_hand()
    t2 = s.state()["secondsLeft"]
    assert t2 < t1, "timer must keep counting down across hands"
    assert t2 == 900


def test_blind_level_advances_by_elapsed_time() -> None:
    s, clock = session_with_clock(fast=600.0)  # 600x fast
    assert s.state()["level"] == 1
    clock.now = 2.0  # 2 wall seconds * 600 = 1200 game seconds -> level 2
    s.timer.tick()
    state = s.state()
    assert state["level"] == 2
    assert state["smallBlind"] == 100 and state["bigBlind"] == 200


def test_pause_resume_preserves_timer() -> None:
    s, clock = session_with_clock()
    clock.now = 300.0
    s.timer.pause()
    frozen = s.timer.seconds_left
    clock.now = 900.0  # time passes while paused
    assert s.timer.seconds_left == frozen
    s.timer.resume()
    clock.now = 1000.0
    assert s.timer.seconds_left == frozen - 100
