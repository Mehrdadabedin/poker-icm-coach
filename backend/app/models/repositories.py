"""Persistence layer: map domain records to ORM models."""
from __future__ import annotations

from sqlalchemy.orm import Session as OrmSession

from app.models.orm_core import Session as OrmSessionRow
from app.models.orm_hands import (
    CoachRecommendation,
    HandAction,
    HandResult,
    PokerHand,
    SessionStatistics,
    StrategyDecision,
)
from app.services.hand_history import HandHistoryRecord


def save_hand(db: OrmSession, session_id: int, record: HandHistoryRecord) -> int:
    """Persist a hand history record; returns the PokerHand id."""
    hand = PokerHand(
        session_id=session_id,
        hand_number=record.hand_number,
        hero_seat=0,
        hero_position=record.hero_position,
        blind_level=record.blind_level,
        community_cards=[c.ascii() for c in record.community_cards],
        hero_cards=[c.ascii() for c in record.hero_cards],
        starting_stacks={},
        ending_stacks={},
        pot_total=record.pot_total,
        winner_seats=record.winner_seats,
        tournament_stage=record.tournament_stage,
        icm_pressure=record.icm_pressure,
    )
    db.add(hand)
    db.flush()
    for i, action in enumerate(record.actions):
        db.add(HandAction(
            hand_id=hand.id, sequence=i, seat=action.seat,
            action=action.action, amount=action.amount, street=action.street,
        ))
    if record.winner_seats:
        db.add(HandResult(hand_id=hand.id, main_winner_seat=record.winner_seats[0],
                          amounts=[record.pot_total]))
    if record.coach_recommendation:
        db.add(CoachRecommendation(
            hand_id=hand.id, recommended_action=record.coach_recommendation,
            confidence=0.7, reasoning="", alternative_action="",
        ))
    if record.hero_decision:
        db.add(StrategyDecision(hand_id=hand.id, hero_action=record.hero_decision,
                                grade=record.grade, mode="advanced"))
    db.commit()
    return hand.id


def load_hand(db: OrmSession, hand_id: int) -> dict:
    """Load a persisted hand with actions, result and decision."""
    hand = db.get(PokerHand, hand_id)
    if hand is None:
        raise KeyError(f"hand {hand_id} not found")
    actions = (
        db.query(HandAction).filter(HandAction.hand_id == hand_id)
        .order_by(HandAction.sequence).all()
    )
    decision = db.query(StrategyDecision).filter(StrategyDecision.hand_id == hand_id).first()
    return {
        "hand_number": hand.hand_number,
        "hero_position": hand.hero_position,
        "pot_total": hand.pot_total,
        "winner_seats": hand.winner_seats,
        "stage": hand.tournament_stage,
        "icm_pressure": hand.icm_pressure,
        "actions": [(a.seat, a.action, a.amount, a.street) for a in actions],
        "grade": decision.grade if decision else None,
    }


def save_statistics(db: OrmSession, session_id: int, stats) -> int:
    row = SessionStatistics(
        session_id=session_id, hands_played=stats.hands_played,
        hands_won=stats.hands_won, vpip=stats.vpip, pfr=stats.pfr,
        coach_agreement=stats.coach_agreement, icm_mistakes=stats.icm_mistakes,
        chip_profit=stats.chip_profit,
        payload={
            "aggression": stats.aggression,
            "bb_won_lost": stats.bb_won_lost,
            "position_performance": stats.position_performance,
        },
    )
    db.add(row)
    db.commit()
    return row.id


def create_session(db: OrmSession, name: str = "Session") -> int:
    row = OrmSessionRow(name=name)
    db.add(row)
    db.commit()
    return row.id
