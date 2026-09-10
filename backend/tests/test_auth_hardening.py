"""Regressions for the auth token store (deadlock, clock, timing)."""
from __future__ import annotations

import json
import threading
import time

from app.services.auth import AuthStore
from app.services.user_registry import UserRegistry


def _lookup_with_timeout(store: AuthStore, token: str, seconds: float = 5.0):
    """Resolve a token on a worker thread; None-marker if it never returns."""
    box: list[str | None] = []
    worker = threading.Thread(target=lambda: box.append(store.user_for_token(token)))
    worker.daemon = True
    worker.start()
    worker.join(timeout=seconds)
    assert not worker.is_alive(), "user_for_token deadlocked"
    return box[0]


def test_expired_token_lookup_does_not_deadlock(tmp_path) -> None:
    """Expiring a token persists the change; _save must not self-deadlock."""
    store = AuthStore(ttl=0)
    store.bind_path(str(tmp_path / "sessions.json"))
    token = store.login("Deadlocker")
    assert _lookup_with_timeout(store, token) is None


def test_valid_token_lookup_does_not_deadlock(tmp_path) -> None:
    store = AuthStore(ttl=60)
    store.bind_path(str(tmp_path / "sessions.json"))
    token = store.login("Live User")
    assert _lookup_with_timeout(store, token) == "Live User"


def test_expiry_is_wall_clock_so_it_survives_a_restart(tmp_path) -> None:
    """A deadline written to disk must be comparable in the next process."""
    path = tmp_path / "sessions.json"
    store = AuthStore(ttl=3600)
    store.bind_path(str(path))
    token = store.login("Persisted")

    rows = json.loads(path.read_text(encoding="utf-8"))
    expires = rows[token][1]
    assert time.time() < expires <= time.time() + 3600

    restarted = AuthStore(ttl=3600)  # fresh process would restart monotonic()
    restarted.bind_path(str(path))
    assert restarted.user_for_token(token) == "Persisted"


def test_stale_persisted_token_is_dropped_on_load(tmp_path) -> None:
    path = tmp_path / "sessions.json"
    path.write_text(json.dumps({"stale": ["Ghost", time.time() - 1]}), encoding="utf-8")
    store = AuthStore()
    store.bind_path(str(path))
    assert store.user_for_token("stale") is None


def test_unknown_user_costs_the_same_as_a_wrong_password() -> None:
    """No timing oracle: a miss still pays for one PBKDF2 derivation."""
    registry = UserRegistry()
    registry.register("Known", "correct-horse")

    def elapsed(username: str) -> float:
        start = time.perf_counter()
        assert registry.verify(username, "wrong-password") is False
        return time.perf_counter() - start

    miss, wrong = elapsed("Nobody"), elapsed("Known")
    assert min(miss, wrong) > 0.5 * max(miss, wrong)


def test_registry_still_rejects_unknown_and_invalid_usernames() -> None:
    registry = UserRegistry()
    registry.register("Known", "correct-horse")
    assert registry.verify("Known", "correct-horse") is True
    assert registry.verify("Nobody", "correct-horse") is False
    assert registry.verify("!!!", "correct-horse") is False
