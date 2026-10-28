"""Plans (plan 100): one row per user. No row means Free."""
from __future__ import annotations

from sqlalchemy import Column, DateTime, String, Table, func

from app.database.session import Base

user_plans = Table(
    "user_plans",
    Base.metadata,
    Column("owner", String(64), primary_key=True),
    Column("plan", String(8), nullable=False),
    Column("since", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("until", DateTime(timezone=True), nullable=True),
    Column("source", String(16), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)
