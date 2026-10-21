"""Player portraits (plan 094): one row per user, the picture and its review.

Stored in the database because Render's disk is wiped on every deploy.
"""
from __future__ import annotations

from sqlalchemy import Column, DateTime, LargeBinary, String, Table, func

from app.database.session import Base

user_portraits = Table(
    "user_portraits",
    Base.metadata,
    Column("owner", String(64), primary_key=True),
    Column("content_type", String(16), nullable=False),
    Column("image", LargeBinary, nullable=False),
    Column("status", String(16), nullable=False),  # pending, approved, rejected
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)
