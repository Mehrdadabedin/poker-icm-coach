"""Hand records for a live table: the coach's verdict on each hero decision,
and the finished hand with those verdicts attached.

Kept out of GameSession, which is at the project's 200-line limit.
"""
from __future__ import annotations

import time
from typing import TYPE_CHECKING

from app.game.positions import position_labels
from app.services.hand_history import HandDecision, HandHistoryRecord
from app.strategy.coach import Coach, CoachRequest
from app.strategy.test_mode import compare_decisions

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.services.game_session import GameSession

_SEVERITY = {"PREFERRED": 0, "ACCEPTABLE": 1, "SUBOPTIMAL": 2}


def decision_verdict(coach: Coach, action: str, request: CoachRequest) -> HandDecision:
    """Grade the hero's action against the advice for the same decision point.

    The request is the table as the hero saw it before acting, so this is the
    advice the coach panel showed, not advice for a later street.
    """
    advice = coach.recommend(request)
    comparison = compare_decisions(action, advice.recommended_action)
    return HandDecision(
        street=request.street,
        hero_action=comparison.hero_action,
        coach_action=advice.recommended_action,
        grade=str(comparison.grade),
        icm_pressure=advice.icm_pressure,
        explanation=advice.reasoning or comparison.explanation,
        stack_bb=round(request.stack / max(1, request.big_blind), 1),
        to_call=request.to_call,
        board=[card.ascii() for card in request.board],
    )


def build_record(session: GameSession, decisions: list[HandDecision]) -> HandHistoryRecord | None:
    """The finished hand, or None while it is still being played.

    The summary fields come from the worst decision, so hero action, coach
    action and grade always describe the same moment of the hand.
    """
    assert session.engine is not None
    result = session.engine.result
    if result is None:
        return None
    tournament = session.tournament
    positions = position_labels(tournament.button,
                                {p.seat for p in tournament.active_players()},
                                len(tournament.players))
    hero = tournament.players[session.hero_seat]
    level = tournament.current_blind_level()
    record = HandHistoryRecord(
        hand_number=result.hand_number,
        hero_cards=list(hero.hole_cards),
        hero_position=positions.get(session.hero_seat, ""),
        community_cards=list(result.community_cards),
        starting_stack=result.starting_stacks.get(session.hero_seat, hero.stack),
        ending_stack=hero.stack,
        blind_level=f"{level.small}/{level.big}",
        level_index=tournament.level_index,
        actions=list(result.actions), pot_total=result.pot_total,
        winner_seats=result.winner_seats(),
        username=session.owner or "",
        table_label=session.table_label,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        decisions=list(decisions),
    )
    if decisions:
        worst = max(decisions, key=lambda d: _SEVERITY.get(d.grade, 0))
        record.hero_decision = worst.hero_action
        record.coach_recommendation = worst.coach_action
        record.grade = worst.grade
        record.icm_pressure = worst.icm_pressure
    return record
