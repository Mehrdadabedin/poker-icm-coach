"""REST routes for tournament/game/coach operations."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.game_schemas import (
    ActionRequest,
    CoachAdviceRequest,
    CoachResponseModel,
    GameStateModel,
    RangeGridResponse,
    TournamentCreateRequest,
)
from app.services.game_session import GameSession
from app.strategy.baseline_ranges import matrix_for_position
from app.strategy.coach import Coach, CoachRequest

router = APIRouter(prefix="/api")
_sessions: dict[str, GameSession] = {}
_coach = Coach()


def get_session(table_id: str) -> GameSession:
    try:
        return _sessions[table_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="table not found") from exc


@router.post("/tournament", response_model=GameStateModel)
def create_tournament(request: TournamentCreateRequest) -> dict:
    session = GameSession(fast_mode=request.fast_mode)
    session.tournament.structure.level_duration = request.blind_level_minutes * 60
    session.start()
    _sessions[session.session_id] = session
    return session.state()


@router.get("/game/{table_id}/state", response_model=GameStateModel)
def game_state(table_id: str) -> dict:
    return get_session(table_id).state()


@router.post("/game/{table_id}/action", response_model=GameStateModel)
def game_action(table_id: str, request: ActionRequest) -> dict:
    session = get_session(table_id)
    try:
        session.hero_action(request.kind, request.amount)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return session.state()


@router.post("/game/{table_id}/next-hand", response_model=GameStateModel)
def next_hand(table_id: str) -> dict:
    session = get_session(table_id)
    try:
        session.next_hand()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return session.state()


@router.post("/game/{table_id}/coach", response_model=CoachResponseModel)
def coach_advice(table_id: str) -> dict:
    session = get_session(table_id)
    try:
        return session.coach_advice()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/game/{table_id}/coach/compare")
def coach_compare(table_id: str) -> dict:
    result = get_session(table_id).grade_hero()
    if result is None:
        raise HTTPException(status_code=400, detail="hero has not acted yet")
    return result


@router.post("/coach/advice", response_model=CoachResponseModel)
def standalone_coach_advice(request: CoachAdviceRequest) -> dict:
    """Coach advice from a caller-supplied decision point (validated input)."""
    from app.poker.card import Card, Rank, Suit

    rank_value = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
                  "T": 10, "J": 11, "Q": 12, "K": 13, "A": 14}
    suit_value = {"c": 0, "d": 1, "h": 2, "s": 3}

    def to_card(model) -> Card:
        return Card(Rank(rank_value[model.rank]), Suit(suit_value[model.suit]))

    req = CoachRequest(
        hero=[to_card(c) for c in request.heroCards],
        position=request.position, stack=request.stack, big_blind=request.bigBlind,
        small_blind=request.smallBlind, ante=request.ante, pot=request.pot,
        to_call=request.toCall, board=[to_card(c) for c in request.board],
        street=request.street, players_remaining=request.playersRemaining,
        paid_positions=request.paidPositions, stacks=request.stacks,
        payout=request.payout, facing_raise=request.facingRaise,
        hero_seat=request.heroSeat, mode=request.mode,
    )
    rec = _coach.recommend(req)
    return {
        "recommendedAction": rec.recommended_action,
        "confidence": rec.confidence,
        "reasoning": rec.reasoning,
        "alternativeAction": rec.alternative_action,
        "detail": rec.recommendation_detail,
    }


@router.get("/ranges", response_model=RangeGridResponse)
def ranges(position: str = "BTN", stack_bb: int = 30) -> dict:
    matrix = matrix_for_position(position, stack_bb)
    return {
        "position": position,
        "stack_bb": stack_bb,
        "columns": ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"],
        "grid": matrix.as_grid(),
    }
