"""The quiz's memory per player (plan 110): open questions, levels, repeat window."""
from __future__ import annotations

import pytest

from app.services.quiz_store import MAX_OPEN, OPEN_SECONDS, QuizStore

KEY = ("AKs", "bubble", "BTN", 2)


class Clock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


def _answers(store: QuizStore, *rights: bool) -> str:
    level = ""
    for right in rights:
        level, _ = store.record("p", right)
    return level


def test_five_right_in_a_row_moves_up_a_level() -> None:
    store = QuizStore()
    assert _answers(store, *[True] * 4) == "easy", "four right is not enough"
    assert _answers(store, True) == "medium"
    assert _answers(store, *[True] * 5) == "hard"
    assert _answers(store, *[True] * 5) == "hard", "there is no level above hard"


def test_two_wrong_in_a_row_moves_down_a_level() -> None:
    store = QuizStore()
    _answers(store, *[True] * 10)
    assert store.level("p") == "hard"
    assert _answers(store, False, True, False) == "hard", "a right answer breaks the run"
    assert _answers(store, False) == "medium"
    assert _answers(store, False, False, False, False) == "easy"


def test_the_streak_counts_right_answers_across_a_level_change() -> None:
    store = QuizStore()
    for _ in range(7):
        _, streak = store.record("p", True)
    assert streak == 7
    assert store.record("p", False)[1] == 0


def test_a_question_closes_once_and_only_for_its_owner() -> None:
    store = QuizStore()
    question = store.open("a", 1, "bubble", KEY)
    assert store.close("b", question.id) is None
    assert store.close("a", question.id) == question
    assert store.close("a", question.id) is None


def test_the_sixth_open_question_pushes_out_the_oldest() -> None:
    store = QuizStore()
    questions = [store.open("a", n, "bubble", KEY) for n in range(MAX_OPEN + 1)]
    assert store.close("a", questions[0].id) is None
    assert store.close("a", questions[1].id) is not None


def test_an_old_question_is_gone() -> None:
    clock = Clock()
    store = QuizStore(clock)
    question = store.open("a", 1, "bubble", KEY)
    clock.now = OPEN_SECONDS + 1
    assert store.close("a", question.id) is None


@pytest.mark.parametrize("served", [49, 51])
def test_the_repeat_window_holds_the_last_fifty_spots(served: int) -> None:
    store = QuizStore()
    for n in range(served):
        store.open("a", n, "bubble", ("AKs", "bubble", "BTN", n))
    assert (("AKs", "bubble", "BTN", 0) in store.seen("a")) == (served < 51)
    assert store.seen("b") == set(), "the window is per player"
