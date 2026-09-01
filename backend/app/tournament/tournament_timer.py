"""Tournament blind-level timer with an injectable clock."""
from __future__ import annotations

import time
from collections.abc import Callable

from app.tournament.tournament import Tournament


class TournamentTimer:
    """Counts down the current blind level (or break) and advances at zero.

    - start/pause/resume/reset lifecycle
    - FAST MODE accelerates elapsed wall time for development/testing
    - injectable clock() for deterministic tests
    - the server calls tick() periodically to advance expired levels
    - levels with break_after enter a break phase before the next level
    """

    def __init__(
        self,
        tournament: Tournament,
        clock: Callable[[], float] = time.monotonic,
        fast_mode: float = 1.0,
    ) -> None:
        self.tournament = tournament
        self.clock = clock
        self.fast_mode = fast_mode
        self.running = False
        self._started_at: float | None = None
        self._accumulated = 0.0
        self._changed = False
        self._in_break = False
        self._break_seconds = 0

    @property
    def level(self) -> int:
        return self.tournament.level_index + 1

    @property
    def in_break(self) -> bool:
        return self._in_break

    def _elapsed(self) -> float:
        if not self.running:
            return self._accumulated
        assert self._started_at is not None
        return self._accumulated + (self.clock() - self._started_at) * self.fast_mode

    def _phase_duration(self) -> int:
        if self._in_break:
            return self._break_seconds
        return self.tournament.structure.level_duration

    @property
    def seconds_left(self) -> int:
        return max(0, self._phase_duration() - int(self._elapsed()))

    @property
    def blinds_changed(self) -> bool:
        flag = self._changed
        self._changed = False
        return flag

    @property
    def current_blinds(self) -> tuple[int, int]:
        level = self.tournament.current_blind_level()
        return level.small, level.big

    def start(self) -> None:
        if self.running or self._started_at is not None:
            return
        self._started_at = self.clock()
        self.running = True

    def pause(self) -> None:
        if not self.running:
            return
        self._accumulated = self._elapsed()
        self.running = False

    def resume(self) -> None:
        if self.running or self._started_at is None:
            return
        self._started_at = self.clock()
        self.running = True

    def reset(self) -> None:
        self.running = False
        self._started_at = None
        self._accumulated = 0.0
        self.tournament.level_index = 0
        self._changed = False
        self._in_break = False
        self._break_seconds = 0

    def tick(self) -> None:
        """Advance expired level(s)/break(s), carrying over excess elapsed time."""
        if not self.running:
            return
        while self._elapsed() >= self._phase_duration():
            self._accumulated = self._elapsed() - self._phase_duration()
            self._started_at = self.clock()
            if self._in_break:
                self._in_break = False
                self._break_seconds = 0
                self.tournament.advance_level()
            else:
                level = self.tournament.current_blind_level()
                if level.break_after > 0:
                    self._in_break = True
                    self._break_seconds = level.break_after
                else:
                    self.tournament.advance_level()
            self._changed = True
