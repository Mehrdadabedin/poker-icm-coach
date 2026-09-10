"""One table, two callers at once.

REST handlers and the table WebSocket both mutate the same GameSession from
threadpool threads, so a double-click or a REST call racing a socket message
lands two operations on one table concurrently.
"""
from __future__ import annotations

import threading
import time

import pytest

from app.game.actions import Action
from app.game.hand_engine import HandEngine
from app.services.game_session import GameSession


def _run_together(call, times: int = 2) -> list[str]:
    """Fire `call` from `times` threads released at the same instant."""
    results: list[str] = []
    lock = threading.Lock()
    barrier = threading.Barrier(times)

    def worker() -> None:
        barrier.wait()
        try:
            call()
            outcome = "ok"
        except ValueError as exc:
            outcome = f"ValueError: {exc}"
        with lock:
            results.append(outcome)

    threads = [threading.Thread(target=worker) for _ in range(times)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)
    assert not any(t.is_alive() for t in threads), "a session call deadlocked"
    return results


@pytest.fixture
def table() -> GameSession:
    session = GameSession(fast_mode=1.0, history_dir="")
    session.start()
    return session


def test_two_concurrent_next_hand_calls_deal_exactly_one_hand(
    table: GameSession, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Both callers used to pass the handOver check and deal over each other.

    The second start_hand() reset a street the first had not finished
    collecting, so chips left the table: on one run 426,560 became 404,700.
    """
    while table.phase() != "handOver":
        table.hero_action("fold")

    real_start = HandEngine.start_hand

    def slow_start(self: HandEngine) -> None:
        time.sleep(0.05)  # widen the window between the check and the deal
        real_start(self)

    monkeypatch.setattr(HandEngine, "start_hand", slow_start)
    results = _run_together(table.next_hand)

    assert results.count("ok") == 1, f"expected one hand to be dealt, got {results}"
    assert any("still in progress" in r for r in results), results


def test_two_concurrent_hero_actions_apply_once(
    table: GameSession, monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A double-clicked action must reach the engine once."""
    real_act = HandEngine.act

    def slow_act(self: HandEngine, seat: int, action: Action) -> None:
        time.sleep(0.05)
        real_act(self, seat, action)

    monkeypatch.setattr(HandEngine, "act", slow_act)
    results = _run_together(lambda: table.hero_action("fold"))

    assert results.count("ok") == 1, f"expected one action to apply, got {results}"


def test_state_snapshot_during_an_action_does_not_deadlock(
    table: GameSession,
) -> None:
    """state() mutates too (timer.tick advances blind levels), so it takes the
    same lock as the actions it must not interleave with."""
    snapshots: list[dict] = []

    def snapshot() -> None:
        snapshots.append(table.state())

    reader = threading.Thread(target=snapshot)
    reader.start()
    table.hero_action("fold")
    reader.join(timeout=30)
    assert not reader.is_alive(), "state() deadlocked against hero_action()"
    assert snapshots and snapshots[0]["tableId"] == table.session_id
