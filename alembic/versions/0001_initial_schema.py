"""Initial schema — all tables from Phase 1-4.

Revision ID: 0001
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("provider", sa.String(32), nullable=False, server_default="email"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("plan", sa.String(32), nullable=False, server_default="free"),
        sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("onboarding_complete", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("risk_tolerance", sa.String(32), nullable=True),
        sa.Column("investment_experience", sa.String(32), nullable=True),
        sa.Column("preferred_currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("preferred_markets", sa.String(255), nullable=False, server_default="NSE,NASDAQ"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # market_bars
    op.create_table(
        "market_bars",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("symbol", sa.String(24), nullable=False),
        sa.Column("timeframe", sa.String(8), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Float, nullable=False),
        sa.Column("high", sa.Float, nullable=False),
        sa.Column("low", sa.Float, nullable=False),
        sa.Column("close", sa.Float, nullable=False),
        sa.Column("volume", sa.Float, nullable=False),
        sa.UniqueConstraint("symbol", "timeframe", "timestamp", name="uq_market_bar"),
    )
    op.create_index("ix_market_bars_symbol", "market_bars", ["symbol"])
    op.create_index("ix_market_bars_timestamp", "market_bars", ["timestamp"])

    # trade_decisions
    op.create_table(
        "trade_decisions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(24), nullable=False),
        sa.Column("action", sa.String(8), nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("explanation", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_trade_decisions_user_id", "trade_decisions", ["user_id"])

    # portfolios
    op.create_table(
        "portfolios",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(128), nullable=False, server_default="My Portfolio"),
        sa.Column("cash_balance", sa.Float, nullable=False, server_default="100000.0"),
        sa.Column("is_paper", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"])

    # holdings
    op.create_table(
        "holdings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("portfolio_id", sa.Integer, sa.ForeignKey("portfolios.id"), nullable=False),
        sa.Column("ticker", sa.String(24), nullable=False),
        sa.Column("quantity", sa.Float, nullable=False),
        sa.Column("average_price", sa.Float, nullable=False),
        sa.Column("sector", sa.String(64), nullable=True),
        sa.Column("asset_class", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_holdings_portfolio_id", "holdings", ["portfolio_id"])

    # chat_conversations
    op.create_table(
        "chat_conversations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False, server_default="New conversation"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_chat_conversations_user_id", "chat_conversations", ["user_id"])

    # chat_messages
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("conversation_id", sa.Integer, sa.ForeignKey("chat_conversations.id"), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("tool_calls", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])

    # usage_records
    op.create_table(
        "usage_records",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("metadata", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usage_records_user_id", "usage_records", ["user_id"])
    op.create_index("ix_usage_records_created_at", "usage_records", ["created_at"])

    # price_alerts
    op.create_table(
        "price_alerts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("symbol", sa.String(24), nullable=False),
        sa.Column("condition", sa.String(16), nullable=False),
        sa.Column("target_price", sa.Float, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_price_alerts_user_id", "price_alerts", ["user_id"])
    op.create_index("ix_price_alerts_symbol", "price_alerts", ["symbol"])


def downgrade() -> None:
    for tbl in [
        "price_alerts", "usage_records", "chat_messages",
        "chat_conversations", "holdings", "portfolios",
        "trade_decisions", "market_bars", "users",
    ]:
        op.drop_table(tbl)
