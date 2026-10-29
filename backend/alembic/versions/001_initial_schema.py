"""Initial schema migration: Opportunity Radar core tables with pgvector support

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-28 22:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Enable pgvector extension if running on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. profiles
    op.create_table(
        "profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("headline", sa.String(length=255), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("education", sa.Text(), nullable=True),
        sa.Column("experience_summary", sa.Text(), nullable=True),
        sa.Column("links", sa.JSON(), nullable=False),
        sa.Column("resume_text", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("remote_ok", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("min_stipend", sa.Float(), nullable=True),
        sa.Column("min_freelance_budget", sa.Float(), nullable=True),
        sa.Column("opportunity_types", sa.JSON(), nullable=False),
        sa.Column("keywords_include", sa.JSON(), nullable=False),
        sa.Column("keywords_exclude", sa.JSON(), nullable=False),
        sa.Column("match_threshold", sa.Integer(), nullable=False, server_default="70"),
        sa.Column(
            "profile_embedding",
            postgresql.ARRAY(sa.Float()) if bind.dialect.name != "postgresql" else sa.text("vector(1536)"),
            nullable=True
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_profile_user_id"),
    )
    op.create_index("ix_profiles_user_id", "profiles", ["user_id"])

    # 3. sources
    op.create_table(
        "sources",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_sources_name"),
    )

    # 4. opportunities
    op.create_table(
        "opportunities",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source_id", sa.String(length=36), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("org", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("remote", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("pay_min", sa.Float(), nullable=True),
        sa.Column("pay_max", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=10), nullable=True, server_default="USD"),
        sa.Column("deadline", sa.DateTime(), nullable=True),
        sa.Column("posted_at", sa.DateTime(), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("raw", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "embedding",
            postgresql.ARRAY(sa.Float()) if bind.dialect.name != "postgresql" else sa.text("vector(1536)"),
            nullable=True
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", "external_id", name="uq_source_external_id"),
    )
    op.create_index("ix_opportunities_content_hash", "opportunities", ["content_hash"])
    op.create_index("ix_opportunities_source_id", "opportunities", ["source_id"])
    op.create_index("ix_opportunities_type", "opportunities", ["type"])

    # 5. matches
    op.create_table(
        "matches",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("red_flags", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "opportunity_id", name="uq_user_opportunity_match"),
    )
    op.create_index("ix_matches_user_id", "matches", ["user_id"])
    op.create_index("ix_matches_opportunity_id", "matches", ["opportunity_id"])
    op.create_index("ix_matches_status", "matches", ["status"])

    # 6. applications
    op.create_table(
        "applications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("opportunity_id", sa.String(length=36), nullable=False),
        sa.Column("stage", sa.String(length=50), nullable=False, server_default="saved"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(), nullable=True),
        sa.Column("follow_up_at", sa.DateTime(), nullable=True),
        sa.Column("drafts", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "opportunity_id", name="uq_user_opportunity_application"),
    )
    op.create_index("ix_applications_user_id", "applications", ["user_id"])
    op.create_index("ix_applications_opportunity_id", "applications", ["opportunity_id"])

    # 7. notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("match_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("urgency", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    # 8. push_subscriptions
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("keys", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint", name="uq_push_subscriptions_endpoint"),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade() -> None:
    op.drop_table("push_subscriptions")
    op.drop_table("notifications")
    op.drop_table("applications")
    op.drop_table("matches")
    op.drop_table("opportunities")
    op.drop_table("sources")
    op.drop_table("profiles")
    op.drop_table("users")
