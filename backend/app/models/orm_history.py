"""Saved hand history: one row per tournament, one per hand (plan 076).

Hands used to live only in the table's memory and a file on the host's disk,
so a deploy or restart erased them. The owner is the username, so a user's
reports read every tournament they played and nobody else's.
"""
from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB

from app.database.session import Base

history_tournaments = Table(
    "history_tournaments",
    Base.metadata,
    Column("id", String(32), primary_key=True),  # the table id
    Column("owner", String(64), nullable=False, index=True),
    Column("table_label", String(16), nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("ended_at", DateTime(timezone=True), nullable=True),
    Column("status", String(16), nullable=False),  # active, finished, abandoned
    Column("finish_place", Integer, nullable=True),
    Column("starting_stack", Integer, nullable=False),
    Column("bots", JSONB, nullable=True),  # the 8-bot lineup, when one was chosen
    Column("hands", Integer, nullable=False, server_default="0"),
)

history_hands = Table(
    "history_hands",
    Base.metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("tournament_id", String(32),
           ForeignKey("history_tournaments.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("owner", String(64), nullable=False, index=True),
    Column("hand_number", Integer, nullable=False),
    Column("played_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("net", Integer, nullable=False),
    Column("record", JSONB, nullable=False),  # the full hand with the coach's verdicts
    UniqueConstraint("tournament_id", "hand_number", name="uq_history_hand"),
)
