"""Request and response shapes of the quiz (plan 110).

The question never carries the answer. Vocabularies are Literals (hard rule 7).
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.game_schemas import CardModel

ChoiceName = Literal["fold", "call", "raise", "allin"]
TemplateName = Literal["push_fold", "call_allin", "bubble", "pay_jump", "open_position"]
LevelName = Literal["easy", "medium", "hard"]


class SituationModel(BaseModel):
    template: TemplateName
    position: str
    playersLeft: int
    paidPlaces: int
    stackBb: float
    bigBlind: int
    smallBlind: int
    ante: int
    allInBb: float | None = None
    allInPosition: str | None = None
    bigBlindStackBb: float | None = None  # folded to the small blind: what the big blind holds


class TodayModel(BaseModel):
    answered: int
    correct: int
    bestStreak: int
    streak: int
    goal: int
    level: LevelName


class QuestionModel(BaseModel):
    id: str
    cards: list[CardModel]
    back: Literal["red", "blue"]
    situation: SituationModel
    choices: list[ChoiceName]
    today: TodayModel


class AnswerRequest(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    choice: ChoiceName


class AnswerModel(BaseModel):
    correct: bool
    answer: ChoiceName
    action: str
    alsoPlayed: ChoiceName | None
    confidence: float
    reasoning: str
    reasonCode: str
    reasonParams: dict[str, str]
    today: TodayModel
