"""Shared plumbing for the threading tests: a lock that can be waited on, a
gate that parks a call inside the engine, and thread spawn/join helpers.

Kept out of the test modules so each stays inside the project's 200-line limit,
and so a second concurrency test does not copy them.
"""
from __future__ import annotations

import threading
import time
from collections.abc import Callable, Iterator

import pytest

from app.game.actions import Action
from app.game.hand_engine import HandEngine

WAIT_TIMEOUT = 10.0


class WaitCountingLock:
    """A reentrant lock plus a count of threads currently blocked on it.

    Waiting for that count is what makes the tests deterministic: it proves
    the second caller is parked on the lock rather than merely late. If an
    entry point stops taking the lock, the wait times out and says so.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._guard = threading.Lock()
        self._waiters = 0

    @property
    def waiters(self) -> int:
        with self._guard:
            return self._waiters

    def __enter__(self) -> WaitCountingLock:
        with self._guard:
            self._waiters += 1
        self._lock.acquire()
        with self._guard:
            self._waiters -= 1
        return self

    def __exit__(self, *_exc: object) -> bool:
        self._lock.release()
        return False


class Gate:
    """Holds the first engine call after arm() until the test releases it.

    Arming is explicit so a test can finish its setup — folding a hand out,
    say — before the gate starts catching calls. Later calls, including the
    bot loop, pass straight through.
    """

    def __init__(self) -> None:
        self.armed = threading.Event()
        self.entered = threading.Event()
        self.release = threading.Event()

    def arm(self) -> None:
        self.armed.set()

    def hold(self) -> None:
        if self.armed.is_set() and not self.entered.is_set():
            self.entered.set()
            assert self.release.wait(timeout=WAIT_TIMEOUT), "gate never released"


@pytest.fixture
def gate(monkeypatch: pytest.MonkeyPatch) -> Iterator[Gate]:
    """Gate HandEngine.start_hand and HandEngine.act for the current test."""
    the_gate = Gate()
    real_start, real_act = HandEngine.start_hand, HandEngine.act

    def gated_start(self: HandEngine) -> None:
        the_gate.hold()
        real_start(self)

    def gated_act(self: HandEngine, seat: int, action: Action) -> None:
        the_gate.hold()
        real_act(self, seat, action)

    monkeypatch.setattr(HandEngine, "start_hand", gated_start)
    monkeypatch.setattr(HandEngine, "act", gated_act)
    yield the_gate
    the_gate.release.set()


def wait_until(predicate: Callable[[], bool], what: str) -> None:
    """Block until `predicate` holds, or fail naming what never happened."""
    deadline = time.monotonic() + WAIT_TIMEOUT
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.001)
    raise AssertionError(f"timed out waiting until {what}")


def spawn(call: Callable[[], object]) -> tuple[threading.Thread, list[str]]:
    """Run `call` on its own thread, recording "ok" or the ValueError text."""
    outcome: list[str] = []

    def worker() -> None:
        try:
            call()
            outcome.append("ok")
        except ValueError as exc:
            outcome.append(str(exc))

    thread = threading.Thread(target=worker)
    thread.start()
    return thread, outcome


def join(*threads: threading.Thread) -> None:
    for thread in threads:
        thread.join(timeout=WAIT_TIMEOUT * 2)
    assert not any(t.is_alive() for t in threads), "a session call deadlocked"
