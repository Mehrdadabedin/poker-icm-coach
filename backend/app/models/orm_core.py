"""Core ORM models: sessions, tournaments, players, opponent profiles."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Tournament(Base):
    __tablename__ = "tournaments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="Practice")
    starting_stack: Mapped[int] = mapped_column(Integer, default=45000)
    ante_mode: Mapped[str] = mapped_column(String(20), default="none")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class TournamentConfiguration(Base):
    __tablename__ = "tournament_configurations"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id"))
    players_count: Mapped[int] = mapped_column(Integer, default=9)
    blind_level_minutes: Mapped[int] = mapped_column(Integer, default=20)
    starting_small_blind: Mapped[int] = mapped_column(Integer, default=100)
    starting_big_blind: Mapped[int] = mapped_column(Integer, default=100)
    payouts: Mapped[list] = mapped_column(JSON, default=list)


class Session(Base):
    """A practice session (one running tournament instance)."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="Session")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    tournament_id: Mapped[int | None] = mapped_column(ForeignKey("tournaments.id"), nullable=True)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"))
    name: Mapped[str] = mapped_column(String(60))
    seat: Mapped[int] = mapped_column(Integer)
    is_human: Mapped[bool] = mapped_column(default=False)
    personality: Mapped[str | None] = mapped_column(String(40), nullable=True)
    starting_stack: Mapped[int] = mapped_column(Integer, default=45000)


class OpponentProfile(Base):
    __tablename__ = "opponent_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    vpip: Mapped[float] = mapped_column(Float, default=0.25)
    pfr: Mapped[float] = mapped_column(Float, default=0.15)
    three_bet: Mapped[float] = mapped_column(Float, default=0.08)
    aggression: Mapped[float] = mapped_column(Float, default=0.5)
    bluff: Mapped[float] = mapped_column(Float, default=0.15)
    call_tendency: Mapped[float] = mapped_column(Float, default=0.5)
    fold_tendency: Mapped[float] = mapped_column(Float, default=0.35)
