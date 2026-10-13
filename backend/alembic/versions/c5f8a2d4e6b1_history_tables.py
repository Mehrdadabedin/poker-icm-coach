"""history_tournaments, history_hands: saved hand history (plan 076)

Revision ID: c5f8a2d4e6b1
Revises: b4e1c7a9d2f3
Create Date: 2026-10-13 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c5f8a2d4e6b1'
down_revision: Union[str, Sequence[str], None] = 'b4e1c7a9d2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The backend creates these tables itself on its first start with the
    # history database on, so a later `alembic upgrade` may find them present.
    present = set(sa.inspect(op.get_bind()).get_table_names())
    if "history_tournaments" not in present:
        op.create_table(
            "history_tournaments",
            sa.Column("id", sa.String(length=32), nullable=False),
            sa.Column("owner", sa.String(length=64), nullable=False),
            sa.Column("table_label", sa.String(length=16), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(length=16), nullable=False),
            sa.Column("finish_place", sa.Integer(), nullable=True),
            sa.Column("starting_stack", sa.Integer(), nullable=False),
            sa.Column("bots", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("hands", sa.Integer(), server_default="0", nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_history_tournaments_owner", "history_tournaments", ["owner"])
    if "history_hands" not in present:
        op.create_table(
            "history_hands",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("tournament_id", sa.String(length=32), nullable=False),
            sa.Column("owner", sa.String(length=64), nullable=False),
            sa.Column("hand_number", sa.Integer(), nullable=False),
            sa.Column("played_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                      nullable=False),
            sa.Column("net", sa.Integer(), nullable=False),
            sa.Column("record", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.ForeignKeyConstraint(["tournament_id"], ["history_tournaments.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("tournament_id", "hand_number", name="uq_history_hand"),
        )
        op.create_index("ix_history_hands_tournament_id", "history_hands", ["tournament_id"])
        op.create_index("ix_history_hands_owner", "history_hands", ["owner"])


def downgrade() -> None:
    op.drop_table("history_hands")
    op.drop_table("history_tournaments")
