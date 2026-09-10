"""Session store lifecycle (Issue #5).

In-memory GameSession registry with a deterministic eviction policy:
  1) finished tables first
  2) abandoned tables second (after a clearly defined idle period)
  3) only then a safety cap for genuinely live tables

Active tournaments are never removed by an arbitrary timer; `state()`
refreshes last_seen so engaged tables stay alive.
"""
from __future__ import annotations

import time

LIVE_TABLES_PER_USER = 5  # safety cap for genuinely live tables


def evict_sessions(registry: dict, owner: str | None = None, now: float | None = None) -> None:
    """Remove finished/abandoned sessions (all users or one owner)."""
    now = now or time.time()
    dead: list[str] = []
    for tid, s in list(registry.items()):
        if owner is not None and s.owner != owner:
            continue
        if s.status in ("finished", "abandoned"):
            dead.append(tid)
        elif s.status == "active" and now - s.last_seen > s.idle_timeout:
            s.status = "abandoned"
            dead.append(tid)
    for tid in dead:
        registry.pop(tid, None)


def cap_live_tables(registry: dict, owner: str) -> None:
    """Evict the oldest live tables only when the safety cap is exceeded."""
    owned = [s for s in registry.values()
             if s.owner == owner and s.status == "active"]
    if len(owned) <= LIVE_TABLES_PER_USER:
        return
    # oldest first (last_seen, then created_at as stable tie-breaker)
    owned.sort(key=lambda s: (s.last_seen, s.created_at))
    for s in owned[: len(owned) - LIVE_TABLES_PER_USER]:
        registry.pop(s.session_id, None)


def mark_finished(session) -> bool:
    """True when hero is eliminated and no live opponent remains (records
    the ended state for eviction). Never changes poker/re-entry rules."""
    hero = session.tournament.players[session.hero_seat]
    others_alive = [p for p in session.tournament.players
                    if p.seat != session.hero_seat and not p.is_eliminated and not p.sit_out]
    if hero.is_eliminated and not others_alive:
        session.status = "finished"
        return True
    return False


def check_abandoned(session, now: float | None = None) -> bool:
    """Long-idle active tournaments become abandoned (engaged tables never
    removed by an arbitrary timer)."""
    now = now or time.time()
    if session.status == "active" and now - session.last_seen > session.idle_timeout:
        session.status = "abandoned"
        return True
    return False
