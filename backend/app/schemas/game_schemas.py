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


class TableActionModel(BaseModel):
    seat: int
    action: str
    amount: int | None = None
    street: str


class ReviewCardModel(BaseModel):
    rank: str
    suit: str


class ReviewShowdownModel(BaseModel):
    seat: int
    name: str
    cards: list[ReviewCardModel]
    handName: str | None = None
    isHero: bool = False
    won: bool = False


class ReviewActionModel(BaseModel):
    seat: int
    name: str
    action: str
    amount: int | None = None
    street: str


class BotExplanationModel(BaseModel):
    seat: int
    name: str
    action: str
    amount: int | None = None
    street: str
    position: str
    hand: str
    handCode: str = ""
    stackBB: float
    potOdds: str
    equity: str
    icmPressure: str
    faced: str
    reason: str


class HandReviewModel(BaseModel):
    handNumber: int
    pot: int
    board: list[ReviewCardModel]
    heroSeat: int
    heroCards: list[ReviewCardModel] = []
    heroStart: int
    heroEnd: int
    heroNet: int
    heroWon: bool
    chop: bool
    heroPosition: str
    heroRankBefore: int
    heroRankAfter: int
    winners: list[int]
    foldedSeats: list[int]
    allInSeats: list[int]
    showdown: list[ReviewShowdownModel]
    actions: list[ReviewActionModel]
    explanations: list[BotExplanationModel]
    winningHandName: str | None = None
    heroHandName: str | None = None
    losingHandName: str | None = None
    pressure: str = "Low"


class GameStateModel(BaseModel):
    tableId: str
    handNumber: int
    players: list[PlayerStateModel]
    actionLog: list[TableActionModel] = []
    playersRemaining: int | None = None
    inHand: int | None = None
    totalChips: int | None = None
    averageStack: int | None = None
    review: HandReviewModel | None = None
    communityCards: list[CardModel]
    pot: int
    smallBlind: int
    bigBlind: int
    ante: int
    level: int
    secondsLeft: int
    inBreak: bool = False
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
    starting_stack: int | None = Field(default=None, ge=100)
    blind_level_minutes: int | None = Field(default=None, ge=1)
    ante_mode: str = "bba"
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
    exactCards: bool = False


class CoachResponseModel(BaseModel):
    recommendedAction: str
    confidence: float
    reasoning: str
    alternativeAction: str
    detail: dict[str, str]
    ev: dict | None = None
    outs: dict | None = None
    education: str = ""


class RangeQuery(BaseModel):
    position: str
    stack_bb: int = Field(default=30, ge=2, le=200)


class RangeGridResponse(BaseModel):
    position: str
    stack_bb: int
    columns: list[str]
    grid: list[list[str]]
