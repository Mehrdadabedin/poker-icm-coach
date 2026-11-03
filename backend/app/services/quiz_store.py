"""What the quiz remembers in memory about each player (plan 110).

Open questions, the last spots served, the level and the current run. A restart
drops all of it, and the page deals a new question. The app runs one worker.
"""
from __future__ import annotations

import secrets
import threading
import time
from collections import OrderedDict, deque
from collections.abc import Callable
from dataclasses import dataclass, field

from app.services.quiz_spots import LEVELS, Level, Template

MAX_OPEN = 5
OPEN_SECONDS = 3600
RECENT_SPOTS = 50
MAX_PLAYERS = 10_000
UP_AFTER_RIGHT = 5
DOWN_AFTER_WRONG = 2


@dataclass(frozen=True)
class OpenQuestion:
    id: str
    seed: int
    template: Template
    opened_at: float


@dataclass
class _Player:
    open: OrderedDict[str, OpenQuestion] = field(default_factory=OrderedDict)
    recent: deque[tuple[str, str, str, int]] = field(
        default_factory=lambda: deque(maxlen=RECENT_SPOTS))
    level: Level = "easy"
    streak: int = 0
    right_run: int = 0
    wrong_run: int = 0


class QuizStore:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._players: OrderedDict[str, _Player] = OrderedDict()
        self._lock = threading.Lock()

    def _player(self, owner: str) -> _Player:
        player = self._players.get(owner) or _Player()
        self._players[owner] = player
        self._players.move_to_end(owner)
        while len(self._players) > MAX_PLAYERS:
            self._players.popitem(last=False)
        return player

    def level(self, owner: str) -> Level:
        with self._lock:
            return self._player(owner).level

    def streak(self, owner: str) -> int:
        with self._lock:
            return self._player(owner).streak

    def seen(self, owner: str) -> set[tuple[str, str, str, int]]:
        with self._lock:
            return set(self._player(owner).recent)

    def open(self, owner: str, seed: int, template: Template,
             key: tuple[str, str, str, int]) -> OpenQuestion:
        """Remember a served question. The sixth open one pushes out the oldest."""
        question = OpenQuestion(secrets.token_urlsafe(12), seed, template, self._clock())
        with self._lock:
            player = self._player(owner)
            player.recent.append(key)
            player.open[question.id] = question
            while len(player.open) > MAX_OPEN:
                player.open.popitem(last=False)
        return question

    def close(self, owner: str, question_id: str) -> OpenQuestion | None:
        """Take a question once. None when it is unknown, taken, old or another player's."""
        with self._lock:
            question = self._player(owner).open.pop(question_id, None)
        if question is None or self._clock() - question.opened_at > OPEN_SECONDS:
            return None
        return question

    def record(self, owner: str, correct: bool) -> tuple[Level, int]:
        """Count an answer. Returns the level for the next question and the streak of right answers."""
        with self._lock:
            player = self._player(owner)
            if correct:
                player.streak += 1
                player.right_run, player.wrong_run = player.right_run + 1, 0
            else:
                player.streak = 0
                player.right_run, player.wrong_run = 0, player.wrong_run + 1
            step = 0
            if player.right_run >= UP_AFTER_RIGHT:
                step, player.right_run = 1, 0
            elif player.wrong_run >= DOWN_AFTER_WRONG:
                step, player.wrong_run = -1, 0
            index = min(len(LEVELS) - 1, max(0, LEVELS.index(player.level) + step))
            player.level = LEVELS[index]
            return player.level, player.streak

    def reset(self) -> None:
        with self._lock:
            self._players.clear()


store = QuizStore()
