"""The quiz routes (plan 110): the answer stays hidden, one answer per question,
Pro only, its own rate limit bucket, and totals that add up.
"""
from __future__ import annotations

import json
import logging

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import plans, quiz_totals
from tests.quiz_helpers import ANSWER, QUESTION, play, pro_client, solution
from tests.rate_limit_helpers import ADVICE, from_ip, pro_token

QUESTION_KEYS = {"id", "cards", "back", "situation", "choices", "today"}


def _strings(value: object) -> list[str]:
    if isinstance(value, dict):
        return [s for k, v in value.items() for s in [str(k), *_strings(v)]]
    if isinstance(value, list):
        return [s for v in value for s in _strings(v)]
    return [str(value)]


def test_the_question_has_no_field_holding_the_answer() -> None:
    client = pro_client("qz_hidden")
    for _ in range(10):
        body = client.post(QUESTION).json()
        _, verdict = solution("qz_hidden", body["id"])
        assert set(body) == QUESTION_KEYS
        assert body["back"] in ("red", "blue") and len(body["cards"]) == 2
        text = json.dumps(body)  # the choices say "fold", so compare exact text, not lower case
        for secret in (verdict.action, verdict.advice["reasonCode"], verdict.advice["reasoning"]):
            assert secret not in text, f"the question leaks {secret!r}"
        assert body["choices"] == list(solution("qz_hidden", body["id"])[0].choices), (
            "the choices are the same for every answer, so they say nothing")
        assert not {"answer", "action", "reasoning", "reasonCode", "alsoPlayed"} & set(_strings(body))


def test_the_first_answer_is_graded_and_a_second_gets_404() -> None:
    client = pro_client("qz_once")
    question = client.post(QUESTION).json()
    _, verdict = solution("qz_once", question["id"])
    first = client.post(ANSWER, json={"id": question["id"], "choice": verdict.choice})
    assert first.status_code == 200
    body = first.json()
    assert body["correct"] is True and body["answer"] == verdict.choice
    assert body["reasonCode"] == verdict.advice["reasonCode"] and body["reasoning"]
    assert client.post(ANSWER, json={"id": question["id"], "choice": verdict.choice}).status_code == 404


def test_a_wrong_choice_is_graded_wrong_and_names_the_coach_action() -> None:
    client = pro_client("qz_wrong")
    body = play(client, "qz_wrong", right=False)
    assert body["correct"] is False and body["action"]


def test_another_players_question_id_gets_404() -> None:
    owner, other = pro_client("qz_owner"), pro_client("qz_other")
    question = owner.post(QUESTION).json()
    assert other.post(ANSWER, json={"id": question["id"], "choice": "fold"}).status_code == 404
    assert owner.post(ANSWER, json={"id": question["id"], "choice": "fold"}).status_code == 200
    assert other.post(ANSWER, json={"id": "no-such-id", "choice": "fold"}).status_code == 404


def test_a_choice_outside_the_vocabulary_is_422_and_no_login_is_401() -> None:
    client = pro_client("qz_vocab")
    question = client.post(QUESTION).json()
    assert client.post(ANSWER, json={"id": question["id"], "choice": "bluff"}).status_code == 422
    assert TestClient(app).post(QUESTION).status_code == 401
    assert TestClient(app).post(ANSWER, json={"id": "x", "choice": "fold"}).status_code == 401


def test_free_players_get_402() -> None:
    client = pro_client("qz_free")
    plans.store.default_plan = "free"
    assert client.post(QUESTION).status_code == 402
    assert client.post(ANSWER, json={"id": "x", "choice": "fold"}).status_code == 402


def test_totals_add_up_in_memory_mode() -> None:
    client = pro_client("qz_totals")
    for right in (True, True, True, False, True):
        body = play(client, "qz_totals", right)
    today = body["today"]
    assert (today["answered"], today["correct"]) == (5, 4)
    assert today["bestStreak"] == 3 and today["streak"] == 1
    assert today["goal"] == settings.quiz_daily_goal == 20
    assert quiz_totals.totals.get("qz_totals", quiz_totals.today()).answered == 5
    assert client.post(QUESTION).json()["today"]["answered"] == 5


def test_the_level_follows_the_answers() -> None:
    client = pro_client("qz_level")
    for _ in range(5):
        body = play(client, "qz_level", True)
    assert body["today"]["level"] == "medium"
    assert client.post(QUESTION).json()["situation"]["template"] in ("call_allin", "bubble")


def test_the_quiz_limit_blocks_in_enforce_mode(
    limits_on: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_coach_mode", "enforce")
    monkeypatch.setattr(settings, "rate_limit_quiz", "3/60")
    monkeypatch.setattr(settings, "rate_limit_coach_page_minute", "3/60")  # same size, so a shared count shows
    client = from_ip("6.6.6.1", pro_token("qz_rl"))
    codes = [client.post(QUESTION).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    assert client.post("/api/coach/advice", json=ADVICE).status_code == 200, (
        "the quiz must not use up the coach's count")


def test_the_quiz_limit_only_logs_in_log_mode(
    limits_on: None, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setattr(settings, "rate_limit_quiz", "3/60")
    client = from_ip("6.6.6.2", pro_token("qz_log"))
    with caplog.at_level(logging.WARNING):
        codes = {client.post(QUESTION).status_code for _ in range(5)}
    assert codes == {200}
    lines = [r.getMessage() for r in caplog.records if "rate limit reached: quiz" in r.getMessage()]
    assert len(lines) == 1 and "mode=log" in lines[0]


def test_the_coach_limit_does_not_use_up_the_quiz(
    limits_on: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_coach_mode", "enforce")
    monkeypatch.setattr(settings, "rate_limit_coach_page_minute", "2/60")
    monkeypatch.setattr(settings, "rate_limit_quiz", "2/60")
    client = from_ip("6.6.6.3", pro_token("qz_sep"))
    codes = [client.post("/api/coach/advice", json=ADVICE).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
    assert client.post(QUESTION).status_code == 200


def test_erasing_an_account_removes_its_quiz_totals() -> None:
    from app.services.account_erase import erase_account
    client = pro_client("qz_erase")
    play(client, "qz_erase", True)
    assert erase_account("qz_erase")["quiz_days_deleted"] == 1
    assert quiz_totals.totals.get("qz_erase", quiz_totals.today()).answered == 0


def test_the_export_holds_the_players_own_quiz_days_only() -> None:
    mine, other = pro_client("qz_export"), pro_client("qz_export_other")
    for right in (True, False):
        play(mine, "qz_export", right)
    play(other, "qz_export_other", True)
    data = mine.get("/api/account/export").json()
    assert data["quiz"] == [{"day": quiz_totals.today().isoformat(), "answered": 2,
                             "correct": 1, "bestStreak": 1}]
    assert pro_client("qz_export_none").get("/api/account/export").json()["quiz"] == []
