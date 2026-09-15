"""Mobile and voice foundation schema

Revision ID: 2a8c3d7f9e01
Revises: 1d9e5f865329
Create Date: 2026-09-11 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2a8c3d7f9e01'
down_revision: Union[str, None] = '1d9e5f865329'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Update existing locations & alerts with timestamps and fields ───────
    op.add_column('locations', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    
    op.add_column('alerts', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('alerts', sa.Column('message', sa.Text(), nullable=True))
    op.add_column('alerts', sa.Column('weather_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Compatibility view for weather_alerts
    op.execute("CREATE OR REPLACE VIEW weather_alerts AS SELECT * FROM alerts;")

    # ── 2. Create users table ──────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('preferred_language', sa.String(length=10), server_default='en', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_phone', 'users', ['phone'], unique=True)
    op.create_index('ix_users_preferred_language', 'users', ['preferred_language'], unique=False)

    # ── 3. Create user_locations table ─────────────────────────────────────────
    op.create_table(
        'user_locations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('location_name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_user_locations_user_id', 'user_locations', ['user_id'], unique=False)
    op.create_index('ix_user_locations_user_default', 'user_locations', ['user_id', 'is_default'], unique=False)

    # ── 4. Create chat_sessions table ──────────────────────────────────────────
    op.create_table(
        'chat_sessions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chat_sessions_user_id', 'chat_sessions', ['user_id'], unique=False)

    # ── 5. Backfill existing chat_history sessions into chat_sessions ─────────
    op.execute("""
        INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
        SELECT session_id, NULL, 'Chat Session', min(created_at), max(created_at)
        FROM chat_history
        GROUP BY session_id
        ON CONFLICT (id) DO NOTHING;
    """)

    # ── 6. Migrate chat_history to chat_messages ──────────────────────────────
    op.rename_table('chat_history', 'chat_messages')

    # Recreate index on chat_messages if needed
    op.drop_index('ix_chat_history_session_created', table_name='chat_messages')
    op.create_index('ix_chat_messages_session_created', 'chat_messages', ['session_id', 'created_at'], unique=False)

    # Add foreign key from chat_messages.session_id to chat_sessions.id
    op.create_foreign_key(
        'fk_chat_messages_session_id',
        'chat_messages',
        'chat_sessions',
        ['session_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Re-create compatibility view chat_history so any raw queries continue working seamlessly
    op.execute("CREATE OR REPLACE VIEW chat_history AS SELECT * FROM chat_messages;")

    # ── 7. Create alert_preferences table ──────────────────────────────────────
    op.create_table(
        'alert_preferences',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('location_id', sa.Uuid(), nullable=True),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['location_id'], ['user_locations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'location_id', 'alert_type', name='uq_alert_preferences_user_loc_type')
    )
    op.create_index('ix_alert_preferences_user_id', 'alert_preferences', ['user_id'], unique=False)
    op.create_index('ix_alert_preferences_user_enabled', 'alert_preferences', ['user_id', 'enabled'], unique=False)

    # ── 8. Create device_tokens table ──────────────────────────────────────────
    op.create_table(
        'device_tokens',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('push_token', sa.String(length=512), nullable=False),
        sa.Column('platform', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_device_tokens_push_token', 'device_tokens', ['push_token'], unique=True)
    op.create_index('ix_device_tokens_user_id', 'device_tokens', ['user_id'], unique=False)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS weather_alerts;")
    op.drop_table('device_tokens')
    op.drop_table('alert_preferences')

    op.execute("DROP VIEW IF EXISTS chat_history;")
    op.drop_constraint('fk_chat_messages_session_id', 'chat_messages', type_='foreignkey')
    op.drop_index('ix_chat_messages_session_created', table_name='chat_messages')
    op.rename_table('chat_messages', 'chat_history')
    op.create_index('ix_chat_history_session_created', 'chat_history', ['session_id', 'created_at'], unique=False)

    op.drop_table('chat_sessions')
    op.drop_table('user_locations')
    op.drop_table('users')

    op.drop_column('alerts', 'weather_context')
    op.drop_column('alerts', 'message')
    op.drop_column('alerts', 'updated_at')

    op.drop_column('locations', 'updated_at')
