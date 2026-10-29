"""Ingestion pipeline schema: ingestion_runs, source configuration, and opportunity deduplication

Revision ID: 002_ingestion_pipeline
Revises: 001_initial_schema
Create Date: 2026-10-28 23:40:00.000000

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa

revision: str = "002_ingestion_pipeline"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update sources table
    op.add_column("sources", sa.Column("interval_hours", sa.Integer(), nullable=False, server_default="3"))
    op.add_column("sources", sa.Column("last_error", sa.Text(), nullable=True))

    # 2. Update opportunities table
    op.add_column("opportunities", sa.Column("duplicate_of_id", sa.String(length=36), nullable=True))
    op.add_column("opportunities", sa.Column("status", sa.String(length=50), nullable=False, server_default="active"))
    op.create_foreign_key(
        "fk_opportunities_duplicate_of", "opportunities", "opportunities", ["duplicate_of_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_opportunities_duplicate_of_id", "opportunities", ["duplicate_of_id"])
    op.create_index("ix_opportunities_status", "opportunities", ["status"])

    # 3. Create ingestion_runs table
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("fetched", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicates", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errors", sa.JSON(), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ingestion_runs_source_id", "ingestion_runs", ["source_id"])
    op.create_index("ix_ingestion_runs_started_at", "ingestion_runs", ["started_at"])


def downgrade() -> None:
    op.drop_table("ingestion_runs")
    op.drop_index("ix_opportunities_status", "opportunities")
    op.drop_index("ix_opportunities_duplicate_of_id", "opportunities")
    op.drop_constraint("fk_opportunities_duplicate_of", "opportunities", type_="foreignkey")
    op.drop_column("opportunities", "status")
    op.drop_column("opportunities", "duplicate_of_id")
    op.drop_column("sources", "last_error")
    op.drop_column("sources", "interval_hours")
