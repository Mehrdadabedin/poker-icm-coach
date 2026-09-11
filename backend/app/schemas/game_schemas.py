"""Pydantic schemas for the poker API (mirrors frontend models)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.icm.icm_engine import MAX_EXACT_ICM_PLAYERS

# Bounded vocabularies used by request schemas. Rejecting an unknown rank/suit
# at the edge keeps the route's rank/suit lookup tables from raising KeyError
# (a 500) on hostile input.
Rank = Literal["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
Suit = Literal["c", "d", "h", "s"]
Position = Literal["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"]
# A request that can reach the ICM engine is bounded by what the engine can
# compute exactly; without it an unauthenticated body is a CPU denial of
# service. See app/icm/icm_engine.py.
MAX_TABLE_PLAYERS = MAX_EXACT_ICM_PLAYERS


class ActionRequest(BaseModel):
    kind: str = Field(pattern="^(fold|check|call|bet|raise|all_in)$")
    amount: int | None = Field(default=None, ge=0)


class CardModel(BaseModel):
    rank: Rank
    suit: Suit


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
    tableLabel: str = ""
    username: str | None = None
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
    players: int = Field(default=9, ge=2, le=MAX_TABLE_PLAYERS)
    starting_stack: int | None = Field(default=None, ge=100)
    blind_level_minutes: int | None = Field(default=None, ge=1)
    ante_mode: str = "bba"
    fast_mode: float = Field(default=1.0, ge=1.0)


class CoachAdviceRequest(BaseModel):
    heroCards: list[CardModel] = Field(min_length=2, max_length=2)
    position: Position
    stack: int = Field(ge=0)
    bigBlind: int = Field(ge=1)
    smallBlind: int = Field(ge=0)
    ante: int = Field(ge=0)
    pot: int = Field(ge=0)
    toCall: int = Field(ge=0)
    board: list[CardModel] = Field(default=[], max_length=5)
    street: Literal["preflop", "flop", "turn", "river"] = "preflop"
    playersRemaining: int = Field(default=9, ge=2, le=MAX_TABLE_PLAYERS)
    paidPositions: int = Field(default=6, ge=1, le=MAX_TABLE_PLAYERS)
    stacks: list[int] = Field(min_length=1, max_length=MAX_TABLE_PLAYERS)
    payout: list[float] | None = Field(default=None, max_length=MAX_TABLE_PLAYERS)
    facingRaise: bool = False
    heroSeat: int = 0
    mode: str = "advanced"
    exactCards: bool = False

    @model_validator(mode="after")
    def _street_matches_board(self) -> CoachAdviceRequest:
        """Issue #7: a board length and a street name that disagree describe no
        real hand, and the coach would price the spot against the wrong one."""
        expected = {0: "preflop", 3: "flop", 4: "turn", 5: "river"}
        wanted = expected.get(len(self.board))
        if wanted != self.street:
            raise ValueError(
                f"street '{self.street}' does not match {len(self.board)} board "
                f"card(s); expected '{wanted or 'a 0/3/4/5-card board'}'"
            )
        return self


class CoachResponseModel(BaseModel):
    recommendedAction: str
    confidence: float
    reasoning: str
    alternativeAction: str
    detail: dict[str, str]
    ev: dict | None = None
    outs: dict | None = None
    education: str = ""


class RangeGridResponse(BaseModel):
    position: str
    stack_bb: int
    columns: list[str]
    grid: list[list[str]]
