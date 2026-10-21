"""user_portraits: player photos and their review (plan 094)

Revision ID: d7a3f9b2c4e8
Revises: c5f8a2d4e6b1
Create Date: 2026-10-21 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd7a3f9b2c4e8'
down_revision: Union[str, Sequence[str], None] = 'c5f8a2d4e6b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The backend creates this table itself on its first start with
    # AUTH_STORAGE=database, so a later `alembic upgrade` finds it present.
    if "user_portraits" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "user_portraits",
        sa.Column("owner", sa.String(length=64), nullable=False),
        sa.Column("content_type", sa.String(length=16), nullable=False),
        sa.Column("image", sa.LargeBinary(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.PrimaryKeyConstraint("owner"),
    )


def downgrade() -> None:
    op.drop_table("user_portraits")
