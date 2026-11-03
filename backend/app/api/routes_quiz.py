"""Quiz routes (plan 110). Plain `def`, so FastAPI runs them in its thread pool
and the coach never blocks the event loop (hard rule 2).
"""
from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_pro
from app.api.rate_limit_deps import limit_quiz
from app.core.config import settings
from app.schemas.quiz_schemas import AnswerModel, AnswerRequest, QuestionModel, TodayModel
from app.services import quiz_totals
from app.services.quiz_spots import Level, Spot, build_spot, evaluate, find_question
from app.services.quiz_store import store

router = APIRouter(prefix="/api/quiz", tags=["quiz"], dependencies=[Depends(limit_quiz)])


def _today(user: str, level: Level) -> TodayModel:
    day = quiz_totals.totals.get(user, quiz_totals.today())
    return TodayModel(answered=day.answered, correct=day.correct, bestStreak=day.best_streak,
                      streak=store.streak(user), goal=settings.quiz_daily_goal, level=level)


def _situation(spot: Spot) -> dict:
    req = spot.request
    return {
        "template": spot.template, "position": req.position,
        "playersLeft": req.playersRemaining, "paidPlaces": req.paidPositions,
        "stackBb": round(req.stack / req.bigBlind, 1), "bigBlind": req.bigBlind,
        "smallBlind": req.smallBlind, "ante": req.ante,
        "allInBb": None if spot.villain_stack is None else round(spot.villain_stack / req.bigBlind, 1),
        "allInPosition": spot.villain_position or None,
        # The coach plays the smaller of the two stacks, so the player needs both.
        "bigBlindStackBb": round((spot.opponents[0] + req.bigBlind) / req.bigBlind, 1)
        if req.position == "SB" and spot.villain_stack is None and len(spot.opponents) == 1 else None,
    }


@router.post("/question", response_model=QuestionModel)
def new_question(user: str = Depends(require_pro)) -> dict:
    level = store.level(user)
    rng = random.Random()
    found = find_question(level, rng, store.seen(user))
    if found is None:
        raise HTTPException(status_code=503, detail="no_question")
    seed, template, spot = found
    question = store.open(user, seed, template, spot.key)
    return {
        "id": question.id, "cards": [card.model_dump() for card in spot.request.heroCards],
        "back": rng.choice(["red", "blue"]), "situation": _situation(spot),
        "choices": list(spot.choices), "today": _today(user, level),
    }


@router.post("/answer", response_model=AnswerModel)
def answer(body: AnswerRequest, user: str = Depends(require_pro)) -> dict:
    """The first answer is graded and closes the question. Anything else is a 404."""
    question = store.close(user, body.id)
    spot = build_spot(question.template, question.seed) if question else None
    verdict = evaluate(spot) if spot else None
    if verdict is None:
        raise HTTPException(status_code=404, detail="question not found")
    correct = body.choice == verdict.choice
    level, streak = store.record(user, correct)
    quiz_totals.totals.add(user, quiz_totals.today(), correct, streak)
    return {
        "correct": correct, "answer": verdict.choice, "action": verdict.action,
        "alsoPlayed": verdict.also_played, "confidence": verdict.confidence,
        "reasoning": verdict.advice["reasoning"], "reasonCode": verdict.advice["reasonCode"],
        "reasonParams": verdict.advice["reasonParams"], "today": _today(user, level),
    }
