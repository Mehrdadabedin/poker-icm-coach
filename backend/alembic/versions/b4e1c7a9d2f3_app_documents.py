"""app_documents: accounts and login sessions

Revision ID: b4e1c7a9d2f3
Revises: 16083a9995d7
Create Date: 2026-10-08 13:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b4e1c7a9d2f3'
down_revision: Union[str, Sequence[str], None] = '16083a9995d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The backend creates this table itself on its first start with
    # AUTH_STORAGE=database, so a later `alembic upgrade` finds it present.
    if "app_documents" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "app_documents",
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("body", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
        sa.PrimaryKeyConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("app_documents")
