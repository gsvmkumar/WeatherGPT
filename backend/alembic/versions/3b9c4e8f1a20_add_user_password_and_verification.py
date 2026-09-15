"""Add user password_hash and email_verified columns

Revision ID: 3b9c4e8f1a20
Revises: 2a8c3d7f9e01
Create Date: 2026-09-11 22:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b9c4e8f1a20'
down_revision: Union[str, None] = '2a8c3d7f9e01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add password_hash and email_verified to users table
    op.add_column('users', sa.Column('password_hash', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'password_hash')
