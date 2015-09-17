"""Create user metadata table.

Revision ID: 7a45f789c964
Revises: 534e20be9964
Create Date: 2015-07-03 13:26:29.138416

"""

# revision identifiers, used by Alembic.
revision = '7a45f789c964'
down_revision = '534e20be9964'
MYSQL_CHARSET = 'utf8'

from alembic import op
import sqlalchemy as sa


def upgrade():
    """Upgrade DB."""
    op.create_table(
        'clouds',
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('deleted_at', sa.DateTime()),
        sa.Column('deleted', sa.Integer, default=0),
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('openid', sa.String(length=128),
                  nullable=False, index=True),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('config', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['openid'], ['user.openid'], ),
        mysql_charset=MYSQL_CHARSET
    )


def downgrade():
    """Downgrade DB."""
    op.drop_table('clouds')
