"""Named JSON documents: the account registry and the login sessions."""
from __future__ import annotations

from sqlalchemy import Column, DateTime, String, Table, func
from sqlalchemy.dialects.postgresql import JSONB

from app.database.session import Base

app_documents = Table(
    "app_documents",
    Base.metadata,
    Column("name", String(64), primary_key=True),
    Column("body", JSONB, nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)
