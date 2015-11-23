"""Create user metadata table.

Revision ID: 5e9c17be1f64
Revises: 7a45f789c964
Create Date: 2015-11-20 13:26:29.138416

"""

# revision identifiers, used by Alembic.
revision = '5e9c17be1f64'
down_revision = '7a45f789c964'
MYSQL_CHARSET = 'utf8'

from alembic import op
from oslo_utils import timeutils
from oslo_utils import uuidutils
import sqlalchemy as sa


def upgrade():
    """Upgrade DB."""
    table = op.create_table(
        'schemas',
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('deleted_at', sa.DateTime()),
        sa.Column('deleted', sa.Integer, default=0),
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('openid', sa.String(length=128)),
        sa.Column('description', sa.Text()),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('cached_data', sa.Text()),
        sa.ForeignKeyConstraint(['openid'], ['user.openid'], ),
        mysql_charset=MYSQL_CHARSET
    )
    op.bulk_insert(table, [
        {'id': uuidutils.generate_uuid(),
         'created_at': timeutils.utcnow(),
         'description': 'Defcore 2015.03',
         'url': 'https://raw.githubusercontent.com/openstack/defcore/'
                'master/2015.03.json'},
        {'id': uuidutils.generate_uuid(),
         'created_at': timeutils.utcnow(),
         'description': 'Defcore 2015.04',
         'url': 'https://raw.githubusercontent.com/openstack/defcore/'
                'master/2015.04.json'},
        {'id': uuidutils.generate_uuid(),
         'created_at': timeutils.utcnow(),
         'description': 'Defcore 2015.05',
         'url': 'https://raw.githubusercontent.com/openstack/defcore/'
                'master/2015.05.json'},
        {'id': uuidutils.generate_uuid(),
         'created_at': timeutils.utcnow(),
         'description': 'Defcore 2015.06',
         'url': 'https://raw.githubusercontent.com/openstack/defcore/'
                'master/2015.07.json'},
        {'id': uuidutils.generate_uuid(),
         'created_at': timeutils.utcnow(),
         'description': 'Defcore 2016.01',
         'url': 'https://raw.githubusercontent.com/openstack/defcore/'
                'master/2016.01.json'},
    ])


def downgrade():
    """Downgrade DB."""
    op.drop_table('schemas')
