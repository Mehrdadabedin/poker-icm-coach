"""Pydantic schemas for the coach endpoints.

Split out of game_schemas.py to stay under the 200-line file cap (rule 6).
The shared vocabularies (Position, CardModel, MAX_TABLE_PLAYERS) stay in
game_schemas.py, which owns them.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.game_schemas import MAX_TABLE_PLAYERS, CardModel, Position


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
