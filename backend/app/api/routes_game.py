"""REST routes for tournament/game/coach operations."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_user
from app.core.config import settings
from app.schemas.coach_schemas import (
    CoachAdviceRequest,
    CoachResponseModel,
    RangeGridResponse,
)
from app.schemas.game_schemas import (
    ActionRequest,
    GameStateModel,
    Position,
    TournamentCreateRequest,
)
from app.services.game_session import GameSession
from app.services.session_store import session_store
from app.strategy.baseline_ranges import matrix_for_position
from app.strategy.coach import Coach, CoachRequest

router = APIRouter(prefix="/api")
_coach = Coach()


def get_session(table_id: str, user: str) -> GameSession:
    """The caller's table, or 404 — an unowned table is indistinguishable
    from a missing one, so ownership never leaks through the status code."""
    session = session_store.get(table_id)
    if session is None or session.owner != user:
        raise HTTPException(status_code=404, detail="table not found")
    return session


@router.post("/tournament", response_model=GameStateModel)
def create_tournament(request: TournamentCreateRequest,
                      user: str = Depends(require_user)) -> dict:
    from app.core.tournament_settings import settings as settings_store

    tournament_settings = settings_store.for_user(user)  # issue #3: per user
    starting_stack = request.starting_stack or tournament_settings.starting_stack
    small = tournament_settings.starting_small_blind
    big = tournament_settings.starting_big_blind
    minutes = request.blind_level_minutes or tournament_settings.blind_level_minutes
    fast = request.fast_mode
    session = GameSession(
        fast_mode=fast,
        starting_stack=starting_stack,
        small_blind=small, big_blind=big,
        level_minutes=minutes,
        owner=user,
        hero_name=user,
        table_label=session_store.next_label(),
        history_dir=settings.history_dir,
    )
    session.start()
    session_store.add(session)
    return session.state()


@router.get("/game/{table_id}/state", response_model=GameStateModel)
def game_state(table_id: str, user: str = Depends(require_user)) -> dict:
    return get_session(table_id, user).state()


@router.post("/game/{table_id}/action", response_model=GameStateModel)
def game_action(table_id: str, request: ActionRequest,
                user: str = Depends(require_user)) -> dict:
    session = get_session(table_id, user)
    try:
        session.hero_action(request.kind, request.amount)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return session.state()


@router.post("/game/{table_id}/next-hand", response_model=GameStateModel)
def next_hand(table_id: str, user: str = Depends(require_user)) -> dict:
    session = get_session(table_id, user)
    try:
        session.next_hand()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return session.state()


@router.post("/game/{table_id}/coach", response_model=CoachResponseModel)
def coach_advice(table_id: str, user: str = Depends(require_user)) -> dict:
    session = get_session(table_id, user)
    try:
        return session.coach_advice()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/game/{table_id}/coach/compare")
def coach_compare(table_id: str, user: str = Depends(require_user)) -> dict:
    result = get_session(table_id, user).grade_hero()
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
        exact_cards=request.exactCards,
    )
    rec = _coach.recommend(req)
    return {
        "recommendedAction": rec.recommended_action,
        "confidence": rec.confidence,
        "reasoning": rec.reasoning,
        "alternativeAction": rec.alternative_action,
        "detail": rec.recommendation_detail,
        "ev": rec.ev,
        "outs": rec.outs,
        "education": rec.education,
    }


@router.get("/coach/hands")
def coach_hands() -> dict:
    """All 169 starting-hand classes with a representative exact combo each."""
    from app.strategy.hand_classes import all_starting_hands

    return {"hands": all_starting_hands()}


@router.get("/ranges", response_model=RangeGridResponse)
def ranges(position: Position = "BTN",
           stack_bb: int = Query(default=30, ge=2, le=200)) -> dict:
    matrix = matrix_for_position(position, stack_bb)
    return {
        "position": position,
        "stack_bb": stack_bb,
        "columns": ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"],
        "grid": matrix.as_grid(),
    }
