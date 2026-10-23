"""user_profiles: personal details of each player (plan 095)

Revision ID: e8b4c1d7f2a9
Revises: d7a3f9b2c4e8
Create Date: 2026-10-23 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e8b4c1d7f2a9'
down_revision: Union[str, Sequence[str], None] = 'd7a3f9b2c4e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The backend creates this table itself on its first start with
    # AUTH_STORAGE=database, so a later `alembic upgrade` finds it present.
    if "user_profiles" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "user_profiles",
        sa.Column("owner", sa.String(length=64), nullable=False),
        sa.Column("first_name", sa.String(length=40), nullable=False),
        sa.Column("last_name", sa.String(length=40), nullable=False),
        sa.Column("display_name", sa.String(length=24), nullable=False),
        sa.Column("birthday", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(length=24), nullable=False),
        sa.Column("gender_text", sa.String(length=40), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.PrimaryKeyConstraint("owner"),
    )


def downgrade() -> None:
    op.drop_table("user_profiles")
