"""dating refactor created_date and document_date

Revision ID: 00982d2f1670
Revises: 6a41a982bfcc
Create Date: 2026-03-29 11:54:33.273161

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '00982d2f1670'
down_revision: Union[str, Sequence[str], None] = '6a41a982bfcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Zmiana nazw created_at -> created_date (zachowanie danych)
    op.alter_column('users', 'created_at', new_column_name='created_date')
    op.alter_column('cases', 'created_at', new_column_name='created_date')
    op.alter_column('case_facts', 'created_at', new_column_name='created_date')
    op.alter_column('documents', 'created_at', new_column_name='created_date')

    # 2. Dodanie document_date
    op.add_column('documents', sa.Column('document_date', sa.DateTime(timezone=True), nullable=True))
    
    # 3. Usunięcie starego create_date (tekstowego z PISP)
    op.drop_column('documents', 'create_date')

    # 4. Inne porządki (opcjonalne, zgodne z auto-generacją)
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'encrypted_ai_api_key')
    op.drop_column('case_facts', 'metadata_json')


def downgrade() -> None:
    op.add_column('case_facts', sa.Column('metadata_json', postgresql.JSON(astext_type=sa.Text()), autoincrement=False, nullable=True))
    op.alter_column('case_facts', 'created_date', new_column_name='created_at')
    op.add_column('users', sa.Column('encrypted_ai_api_key', sa.VARCHAR(length=512), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=True))
    op.alter_column('users', 'created_date', new_column_name='created_at')
    op.add_column('documents', sa.Column('create_date', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.drop_column('documents', 'document_date')
    op.alter_column('documents', 'created_date', new_column_name='created_at')
    op.alter_column('cases', 'created_date', new_column_name='created_at')
