"""Player profiles (plan 095): one row per user, personal details only.

Stored in the database because Render's disk is wiped on every deploy. Kept
apart from the user registry so deleting an account removes them in one place.
"""
from __future__ import annotations

from sqlalchemy import Column, Date, DateTime, String, Table, func

from app.database.session import Base

user_profiles = Table(
    "user_profiles",
    Base.metadata,
    Column("owner", String(64), primary_key=True),
    Column("first_name", String(40), nullable=False),
    Column("last_name", String(40), nullable=False),
    Column("display_name", String(24), nullable=False),
    Column("birthday", Date, nullable=False),
    Column("gender", String(24), nullable=False),
    Column("gender_text", String(40), nullable=True),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)
