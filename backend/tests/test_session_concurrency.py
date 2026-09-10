"""One table, two callers at once.

REST handlers and the table WebSocket both mutate the same GameSession from
threadpool threads, so a double-click or a REST call racing a socket message
lands two operations on one table concurrently.

These tests are event-driven, not timing-based: a gate holds the first caller
inside the engine until the second is provably blocked on the session lock, so
there is no sleep margin to tune and nothing to flake on a loaded machine.
"""
from __future__ import annotations

import random

import pytest

from app.services.game_session import GameSession
from tests.concurrency_helpers import Gate, WaitCountingLock, join, spawn, wait_until
from tests.concurrency_helpers import gate as gate  # noqa: F401 - fixture re-export


@pytest.fixture
def table() -> GameSession:
    """A seeded table, so a freshly dealt hand cannot end on its own and
    "was a second hand dealt?" stays a question about locking."""
    session = GameSession(fast_mode=1.0, history_dir="", rng=random.Random(20260910))
    session.start()
    return session


@pytest.fixture
def counting_lock(table: GameSession) -> WaitCountingLock:
    lock = WaitCountingLock()
    table._lock = lock  # type: ignore[assignment]
    return lock


def test_two_concurrent_next_hand_calls_deal_exactly_one_hand(
    table: GameSession, counting_lock: WaitCountingLock, gate: Gate,
) -> None:
    """Both callers used to pass the handOver check and deal over each other.

    The second start_hand() reset a street the first had not finished
    collecting, so chips left the table: on one run 426,560 became 404,700,
    and the overwritten hand's history record was lost.
    """
    while table.phase() != "handOver":
        table.hero_action("fold")
    gate.arm()

    first, first_result = spawn(table.next_hand)
    wait_until(gate.entered.is_set, "the first caller is dealing")
    second, second_result = spawn(table.next_hand)
    wait_until(lambda: counting_lock.waiters == 1,
               "the second caller is blocked on the table lock")
    gate.release.set()
    join(first, second)

    results = first_result + second_result
    assert results.count("ok") == 1, f"expected one hand to be dealt, got {results}"
    assert any("still in progress" in r for r in results), results


def test_two_concurrent_hero_actions_apply_once(
    table: GameSession, counting_lock: WaitCountingLock, gate: Gate,
) -> None:
    """A double-clicked action must reach the engine once."""
    gate.arm()

    first, first_result = spawn(lambda: table.hero_action("fold"))
    wait_until(gate.entered.is_set, "the first action is in the engine")
    second, second_result = spawn(lambda: table.hero_action("fold"))
    wait_until(lambda: counting_lock.waiters == 1,
               "the second action is blocked on the table lock")
    gate.release.set()
    join(first, second)

    results = first_result + second_result
    assert results.count("ok") == 1, f"expected one action to apply, got {results}"


def test_a_state_snapshot_waits_for_an_action_in_flight(
    table: GameSession, counting_lock: WaitCountingLock, gate: Gate,
) -> None:
    """state() mutates too — timer.tick() advances expired blind levels — and
    build_state_view must not read pots mid-act, so it takes the same lock."""
    gate.arm()
    snapshots: list[dict] = []

    actor, _ = spawn(lambda: table.hero_action("fold"))
    wait_until(gate.entered.is_set, "the action is in the engine")
    reader, _ = spawn(lambda: snapshots.append(table.state()))
    wait_until(lambda: counting_lock.waiters == 1,
               "the snapshot is blocked on the table lock")
    gate.release.set()
    join(actor, reader)

    assert snapshots and snapshots[0]["tableId"] == table.session_id
