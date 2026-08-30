"""Pydantic schemas for the poker API (mirrors frontend models)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ActionRequest(BaseModel):
    kind: str = Field(pattern="^(fold|check|call|bet|raise|all_in)$")
    amount: int | None = Field(default=None, ge=0)


class CardModel(BaseModel):
    rank: str
    suit: str


class PlayerStateModel(BaseModel):
    seat: int
    name: str
    stack: int
    stackInBB: float
    position: str
    bet: int
    folded: bool
    isHero: bool
    isDealer: bool
    sitsOut: bool
    holeCards: list[CardModel] | None = None


class LegalActionModel(BaseModel):
    kind: str
    amount: int | None = None
    minAmount: int | None = None
    maxAmount: int | None = None


class GameStateModel(BaseModel):
    tableId: str
    handNumber: int
    players: list[PlayerStateModel]
    communityCards: list[CardModel]
    pot: int
    smallBlind: int
    bigBlind: int
    ante: int
    level: int
    secondsLeft: int
    street: str
    currentActor: int | None
    dealerSeat: int
    heroSeat: int
    waitingForHero: bool
    phase: str
    legalActions: list[LegalActionModel] = []
    toCall: int = 0


class TournamentCreateRequest(BaseModel):
    players: int = Field(default=9, ge=2, le=9)
    starting_stack: int = Field(default=45000, ge=100)
    blind_level_minutes: int = Field(default=20, ge=1)
    ante_mode: str = "none"
    fast_mode: float = Field(default=1.0, ge=1.0)


class CoachAdviceRequest(BaseModel):
    heroCards: list[CardModel]
    position: str
    stack: int = Field(ge=0)
    bigBlind: int = Field(ge=1)
    smallBlind: int = Field(ge=0)
    ante: int = Field(ge=0)
    pot: int = Field(ge=0)
    toCall: int = Field(ge=0)
    board: list[CardModel] = []
    street: str = "preflop"
    playersRemaining: int = Field(default=9, ge=2, le=9)
    paidPositions: int = Field(default=6, ge=1)
    stacks: list[int]
    payout: list[float] | None = None
    facingRaise: bool = False
    heroSeat: int = 0
    mode: str = "advanced"


class CoachResponseModel(BaseModel):
    recommendedAction: str
    confidence: float
    reasoning: str
    alternativeAction: str
    detail: dict[str, str]


class RangeQuery(BaseModel):
    position: str
    stack_bb: int = Field(default=30, ge=2, le=200)


class RangeGridResponse(BaseModel):
    position: str
    stack_bb: int
    columns: list[str]
    grid: list[list[str]]
