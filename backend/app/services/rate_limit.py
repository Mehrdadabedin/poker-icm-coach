"""Sliding-window request counters, held in process memory (plan 109).

Memory is enough because the app runs one uvicorn worker. A restart resets the
counts. A second worker or server would need a shared store, and the tokens and
tables have to move first anyway.
"""
from __future__ import annotations

import math
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable
from dataclasses import dataclass, field

_SWEEP_EVERY = 1024
MAX_KEYS = 100_000


@dataclass(frozen=True)
class Rule:
    count: int
    seconds: int

    @classmethod
    def parse(cls, text: str) -> Rule:
        """"5/900" means 5 requests per 900 seconds. The setting's pattern checks it."""
        count, seconds = text.split("/")
        return cls(int(count), int(seconds))


@dataclass
class _Entry:
    seconds: int
    stamps: deque[float] = field(default_factory=deque)


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic,
                 max_keys: int = MAX_KEYS) -> None:
        self._clock = clock
        self._max_keys = max_keys
        self._entries: OrderedDict[str, _Entry] = OrderedDict()
        self._lock = threading.Lock()
        self._since_sweep = 0

    def hit(self, key: str, rule: Rule) -> int:
        """Count one request. Over the limit: not counted, returns seconds to wait.

        The check and the count are one step, so parallel requests cannot all
        pass while the first is still running a password check.
        """
        with self._lock:
            now = self._clock()
            entry = self._entries.get(key) or _Entry(rule.seconds)
            entry.seconds = rule.seconds
            while entry.stamps and entry.stamps[0] <= now - rule.seconds:
                entry.stamps.popleft()
            if len(entry.stamps) >= rule.count:
                return max(1, math.ceil(entry.stamps[0] + rule.seconds - now))
            entry.stamps.append(now)
            self._entries[key] = entry
            self._entries.move_to_end(key)
            self._keep_bounded(now)
            return 0

    def release(self, key: str) -> None:
        """Take back the newest count: the request turned out not to count."""
        with self._lock:
            entry = self._entries.get(key)
            if entry and entry.stamps:
                entry.stamps.pop()

    def clear(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def reset(self) -> None:
        with self._lock:
            self._entries.clear()

    def key_count(self) -> int:
        with self._lock:
            return len(self._entries)

    def _keep_bounded(self, now: float) -> None:
        self._since_sweep += 1
        if self._since_sweep >= _SWEEP_EVERY:
            self._since_sweep = 0
            expired = [key for key, entry in self._entries.items()
                       if not entry.stamps or entry.stamps[-1] <= now - entry.seconds]
            for key in expired:
                del self._entries[key]
        while len(self._entries) > self._max_keys:
            self._entries.popitem(last=False)
