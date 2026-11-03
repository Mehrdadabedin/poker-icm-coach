"""quiz_daily: one row per player per day of quiz answers (plan 110)

Revision ID: f9c5d2e8a3b7
Revises: e8b4c1d7f2a9
Create Date: 2026-11-03 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f9c5d2e8a3b7'
down_revision: Union[str, Sequence[str], None] = 'e8b4c1d7f2a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The backend creates this table itself on its first start with
    # AUTH_STORAGE=database, so a later `alembic upgrade` finds it present.
    if "quiz_daily" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "quiz_daily",
        sa.Column("owner", sa.String(length=64), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("answered", sa.Integer(), server_default="0", nullable=False),
        sa.Column("correct", sa.Integer(), server_default="0", nullable=False),
        sa.Column("best_streak", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("owner", "day"),
    )


def downgrade() -> None:
    op.drop_table("quiz_daily")
