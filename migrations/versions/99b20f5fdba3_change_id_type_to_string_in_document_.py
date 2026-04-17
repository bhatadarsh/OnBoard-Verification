"""Change id type to String in document_extractions

Revision ID: 99b20f5fdba3
Revises: 7487cf55f4c8
Create Date: 2026-04-14 23:21:42.544869

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99b20f5fdba3'
down_revision: Union[str, Sequence[str], None] = '7487cf55f4c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Drop the primary key constraint first
    op.execute('ALTER TABLE document_extractions DROP CONSTRAINT document_extractions_pkey CASCADE')
    
    # 2. Alter the column type from INTEGER to VARCHAR
    # We use CAST(id AS VARCHAR) to preserve existing IDs if any (though they'll be strings now)
    op.execute('ALTER TABLE document_extractions ALTER COLUMN id TYPE VARCHAR(50) USING id::varchar')
    
    # 3. Add the primary key constraint back
    op.execute('ALTER TABLE document_extractions ADD PRIMARY KEY (id)')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('ALTER TABLE document_extractions DROP CONSTRAINT document_extractions_pkey CASCADE')
    # Use id::integer to cast back. This will fail if IDs are already UUIDs!
    op.execute('ALTER TABLE document_extractions ALTER COLUMN id TYPE INTEGER USING id::integer')
    op.execute('ALTER TABLE document_extractions ADD PRIMARY KEY (id)')
