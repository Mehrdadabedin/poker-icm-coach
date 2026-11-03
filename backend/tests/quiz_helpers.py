"""Shared by the quiz tests (plan 110)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.services.quiz_spots import Spot, Verdict, build_spot, evaluate
from app.services.quiz_store import store
from tests.api_helpers import login_client

QUESTION = "/api/quiz/question"
ANSWER = "/api/quiz/answer"


def pro_client(name: str) -> TestClient:
    """Tests start on Pro (conftest)."""
    return login_client(name)


def solution(user: str, question_id: str) -> tuple[Spot, Verdict]:
    """What the server holds for an open question: the spot and the coach's answer."""
    open_question = store._players[user].open[question_id]  # noqa: SLF001
    spot = build_spot(open_question.template, open_question.seed)
    assert spot is not None
    verdict = evaluate(spot)
    assert verdict is not None
    return spot, verdict


def play(client: TestClient, user: str, right: bool) -> dict:
    """Ask a question and answer it right or wrong. Returns the answer response."""
    question = client.post(QUESTION).json()
    spot, verdict = solution(user, question["id"])
    wrong = next(c for c in spot.choices if c != verdict.choice)
    response = client.post(ANSWER, json={"id": question["id"],
                                         "choice": verdict.choice if right else wrong})
    assert response.status_code == 200, response.text
    return response.json()
