"""Meta routes: hands, icm, statistics, settings."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.icm.icm_engine import ICMEngine
from app.services.game_session import GameSession
from app.services.statistics import aggregate

router = APIRouter(prefix="/api")


@router.get("/game/{table_id}/hands")
def list_hands(table_id: str, stage: str | None = None) -> dict:
    session = _session_or_404(table_id)
    records = session.history.filter(stage=stage) if stage else session.history.all()
    return {"hands": [
        {
            "handNumber": r.hand_number,
            "heroPosition": r.hero_position,
            "pot": r.pot_total,
            "winnerSeats": r.winner_seats,
            "stage": r.tournament_stage,
            "net": r.net_chips(),
            "heroDecision": r.hero_decision,
            "coachRecommendation": r.coach_recommendation,
            "grade": r.grade,
            "level": r.level_index + 1,
            "blindLevel": r.blind_level,
        } for r in records
    ]}


@router.get("/game/{table_id}/statistics")
def session_statistics(table_id: str) -> dict:
    session = _session_or_404(table_id)
    stats = aggregate(session.history.all())
    return {
        "handsPlayed": stats.hands_played,
        "handsWon": stats.hands_won,
        "vpip": stats.vpip,
        "pfr": stats.pfr,
        "threeBet": stats.three_bet,
        "aggression": stats.aggression,
        "averagePot": stats.average_pot,
        "bbWonLost": stats.bb_won_lost,
        "chipProfit": stats.chip_profit,
        "coachAgreement": stats.coach_agreement,
        "icmMistakes": stats.icm_mistakes,
        "positionPerformance": stats.position_performance,
        "stackDepthPerformance": stats.stack_depth_performance,
    }


@router.get("/icm")
def icm_calculate(stacks: str, payouts: str) -> dict:
    """Query: /api/icm?stacks=45000,30000,20000&payouts=0.4,0.25,0.2,0.1,0.05"""
    try:
        stack_list = [int(x) for x in stacks.split(",") if x.strip()]
        payout_list = [float(x) for x in payouts.split(",") if x.strip()]
        if not stack_list or not payout_list:
            raise ValueError("empty input")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="invalid stacks/payouts") from exc
    result = ICMEngine(stack_list, payout_list).calculate()
    return {"equities": result.equities, "method": result.method}


@router.get("/settings")
def get_settings() -> dict:
    from app.core.tournament_settings import settings as tournament_settings

    return tournament_settings.to_dict()


@router.put("/settings")
def put_settings(request: dict) -> dict:
    from app.core.tournament_settings import settings as tournament_settings

    allowed = {
        "startingStack": ("starting_stack", int),
        "startingSmallBlind": ("starting_small_blind", int),
        "startingBigBlind": ("starting_big_blind", int),
        "blindLevelMinutes": ("blind_level_minutes", int),
        "fastMode": ("fast_mode", bool),
    }
    for key, (attr, caster) in allowed.items():
        if key in request and hasattr(tournament_settings, attr):
            setattr(tournament_settings, attr, caster(request[key]))
    return tournament_settings.to_dict()


@router.get("/active-table")
def active_table() -> dict:
    """The single active tournament table (most recent session)."""
    from app.api.routes_game import _sessions

    if not _sessions:
        return {"tableId": None}
    last = list(_sessions.values())[-1]
    return {"tableId": last.session_id}


def _session_or_404(table_id: str) -> GameSession:
    from app.api.routes_game import _sessions

    try:
        return _sessions[table_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="table not found") from exc
