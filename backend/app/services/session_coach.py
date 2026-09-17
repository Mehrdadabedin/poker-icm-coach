"""Mapping between a live GameSession and the coach's request/response shapes.

Lives outside GameSession: turning table state into a CoachRequest is domain
translation, not table ownership, and the session file is at the project's
200-line limit.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.game.positions import position_for
from app.strategy.coach import CoachRecommendation, CoachRequest
from app.strategy.test_mode import compare_decisions

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.services.game_session import GameSession


def coach_request(session: GameSession) -> CoachRequest:
    """The hero's current decision point, as the coach expects it."""
    engine = session.engine
    assert engine is not None
    tournament = session.tournament
    hero = tournament.players[session.hero_seat]
    level = tournament.current_blind_level()
    contributed = engine._street.contributions.get(session.hero_seat, 0)
    return CoachRequest(
        hero=list(hero.hole_cards),
        position=position_for(tournament.button, session.hero_seat,
                              len(tournament.players)),
        stack=hero.stack, big_blind=level.big, small_blind=level.small,
        ante=tournament.structure.ante_for(tournament.ante_mode, level),
        pot=sum(p.bet_total for p in tournament.players),
        to_call=max(0, engine._street.current_bet - contributed),
        board=list(engine._board), street=engine.street,
        players_remaining=sum(1 for p in tournament.players if not p.is_eliminated),
        paid_positions=6, stacks=[p.stack for p in tournament.players],
        payout=[float(x) for x in tournament.payout.percentages],
        facing_raise=(engine._street.current_bet > level.big),
        hero_seat=session.hero_seat, level_index=tournament.level_index,
        mode=session.coach_mode,
    )


def advice_dict(rec: CoachRecommendation) -> dict:
    """The coach recommendation in the API's camelCase shape."""
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


def grade_last_action(session: GameSession) -> dict | None:
    """The hero's last decision against the advice that stood when they made it.

    Recomputing the advice here instead would price a decision the hero has
    already taken against the table as it is now, after the bots answered and
    often after the street changed.
    """
    action = session._last_hero_action
    request = session._last_hero_request
    if action is None or request is None:
        return None
    advice = advice_dict(session.coach.recommend(request))
    comparison = compare_decisions(action, advice["recommendedAction"])
    return {
        "heroAction": action,
        "coachAction": advice["recommendedAction"],
        "grade": comparison.grade,
        "explanation": comparison.explanation,
        "icmFactors": comparison.icm_factors,
        "rangeNote": comparison.range_note,
    }
