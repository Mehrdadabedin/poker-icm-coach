"""ORM models for hands, actions, results, decisions and statistics."""
from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class PokerHand(Base):
    __tablename__ = "poker_hands"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    hand_number: Mapped[int] = mapped_column(Integer)
    hero_seat: Mapped[int] = mapped_column(Integer, default=0)
    hero_position: Mapped[str] = mapped_column(String(10), default="BTN")
    blind_level: Mapped[str] = mapped_column(String(20), default="100/100")
    community_cards: Mapped[list] = mapped_column(JSON, default=list)
    starting_stacks: Mapped[dict] = mapped_column(JSON, default=dict)
    ending_stacks: Mapped[dict] = mapped_column(JSON, default=dict)
    pot_total: Mapped[int] = mapped_column(Integer, default=0)
    winner_seats: Mapped[list] = mapped_column(JSON, default=list)
    tournament_stage: Mapped[str] = mapped_column(String(30), default="")
    icm_pressure: Mapped[str] = mapped_column(String(20), default="LOW")
    hero_cards: Mapped[list] = mapped_column(JSON, default=list)


class HandAction(Base):
    __tablename__ = "hand_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    hand_id: Mapped[int] = mapped_column(ForeignKey("poker_hands.id"))
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    seat: Mapped[int] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    street: Mapped[str] = mapped_column(String(10), default="preflop")


class HandResult(Base):
    __tablename__ = "hand_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    hand_id: Mapped[int] = mapped_column(ForeignKey("poker_hands.id"))
    main_winner_seat: Mapped[int] = mapped_column(Integer)
    amounts: Mapped[list] = mapped_column(JSON, default=list)


class CoachRecommendation(Base):
    __tablename__ = "coach_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    hand_id: Mapped[int] = mapped_column(ForeignKey("poker_hands.id"))
    recommended_action: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    reasoning: Mapped[str] = mapped_column(String(500), default="")
    alternative_action: Mapped[str] = mapped_column(String(20), default="")


class StrategyDecision(Base):
    __tablename__ = "strategy_decisions"

    id: Mapped[int] = mapped_column(primary_key=True)
    hand_id: Mapped[int] = mapped_column(ForeignKey("poker_hands.id"))
    hero_action: Mapped[str] = mapped_column(String(20))
    grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mode: Mapped[str] = mapped_column(String(20), default="advanced")


class SessionStatistics(Base):
    __tablename__ = "session_statistics"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    hands_played: Mapped[int] = mapped_column(Integer, default=0)
    hands_won: Mapped[int] = mapped_column(Integer, default=0)
    vpip: Mapped[float] = mapped_column(Float, default=0.0)
    pfr: Mapped[float] = mapped_column(Float, default=0.0)
    coach_agreement: Mapped[float] = mapped_column(Float, default=0.0)
    icm_mistakes: Mapped[int] = mapped_column(Integer, default=0)
    chip_profit: Mapped[int] = mapped_column(Integer, default=0)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
