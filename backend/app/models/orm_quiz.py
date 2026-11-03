"""Quiz totals (plan 110): one row per player per day. Questions are not saved."""
from __future__ import annotations

from sqlalchemy import Column, Date, Integer, String, Table

from app.database.session import Base

quiz_daily = Table(
    "quiz_daily",
    Base.metadata,
    Column("owner", String(64), primary_key=True),
    Column("day", Date, primary_key=True),
    Column("answered", Integer, nullable=False, server_default="0"),
    Column("correct", Integer, nullable=False, server_default="0"),
    Column("best_streak", Integer, nullable=False, server_default="0"),
)
