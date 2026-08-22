"""fleet operator app schema

Revision ID: a1f3c9d2e6b4
Revises: 9ed75ca12aaa
Create Date: 2026-08-22 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1f3c9d2e6b4'
down_revision: Union[str, None] = '9ed75ca12aaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('vehicles',
    sa.Column('registration_number', sa.String(length=32), nullable=False),
    sa.Column('city_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('vehicle_type', sa.String(length=32), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicles_city_id'), 'vehicles', ['city_id'], unique=False)
    op.create_index(op.f('ix_vehicles_registration_number'), 'vehicles', ['registration_number'], unique=True)

    op.create_table('fleet_operator_profiles',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('operator_code', sa.String(length=32), nullable=False),
    sa.Column('city_id', sa.UUID(), nullable=True),
    sa.Column('zone_name', sa.String(length=120), nullable=True),
    sa.Column('assigned_vehicle_id', sa.UUID(), nullable=True),
    sa.Column('operator_role', sa.String(length=32), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['assigned_vehicle_id'], ['vehicles.id'], ),
    sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_fleet_operator_profiles_city_id'), 'fleet_operator_profiles', ['city_id'], unique=False)
    op.create_index(op.f('ix_fleet_operator_profiles_operator_code'), 'fleet_operator_profiles', ['operator_code'], unique=True)

    op.create_table('collection_sessions',
    sa.Column('operator_id', sa.UUID(), nullable=False),
    sa.Column('vehicle_id', sa.UUID(), nullable=False),
    sa.Column('city_id', sa.UUID(), nullable=True),
    sa.Column('zone_name', sa.String(length=120), nullable=True),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
    sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
    sa.Column('start_latitude', sa.Float(), nullable=True),
    sa.Column('start_longitude', sa.Float(), nullable=True),
    sa.Column('end_latitude', sa.Float(), nullable=True),
    sa.Column('end_longitude', sa.Float(), nullable=True),
    sa.Column('reported_distance_km', sa.Float(), nullable=False),
    sa.Column('validated_distance_km', sa.Float(), nullable=True),
    sa.Column('observation_count', sa.Integer(), nullable=False),
    sa.Column('valid_observation_count', sa.Integer(), nullable=False),
    sa.Column('data_quality_score', sa.Float(), nullable=True),
    sa.Column('device_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('client_session_id', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ),
    sa.ForeignKeyConstraint(['operator_id'], ['fleet_operator_profiles.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('client_session_id')
    )
    op.create_index(op.f('ix_collection_sessions_city_id'), 'collection_sessions', ['city_id'], unique=False)
    op.create_index(op.f('ix_collection_sessions_client_session_id'), 'collection_sessions', ['client_session_id'], unique=True)
    op.create_index(op.f('ix_collection_sessions_operator_id'), 'collection_sessions', ['operator_id'], unique=False)
    op.create_index(op.f('ix_collection_sessions_status'), 'collection_sessions', ['status'], unique=False)
    op.create_index(op.f('ix_collection_sessions_vehicle_id'), 'collection_sessions', ['vehicle_id'], unique=False)

    op.create_table('earning_records',
    sa.Column('operator_id', sa.UUID(), nullable=False),
    sa.Column('session_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=16), nullable=False),
    sa.Column('coverage_amount', sa.Float(), nullable=False),
    sa.Column('observation_amount', sa.Float(), nullable=False),
    sa.Column('quality_bonus_amount', sa.Float(), nullable=False),
    sa.Column('total_amount', sa.Float(), nullable=False),
    sa.Column('computed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['operator_id'], ['fleet_operator_profiles.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['session_id'], ['collection_sessions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('session_id')
    )
    op.create_index(op.f('ix_earning_records_operator_id'), 'earning_records', ['operator_id'], unique=False)
    op.create_index(op.f('ix_earning_records_status'), 'earning_records', ['status'], unique=False)

    op.add_column('fleet_observations', sa.Column('session_id', sa.UUID(), nullable=True))
    op.add_column('fleet_observations', sa.Column('vehicle_ref_id', sa.UUID(), nullable=True))
    op.add_column('fleet_observations', sa.Column('operator_ref_id', sa.UUID(), nullable=True))
    op.add_column('fleet_observations', sa.Column('client_observation_id', sa.String(length=64), nullable=True))
    op.add_column('fleet_observations', sa.Column('hazard_type', sa.String(length=32), nullable=True))
    op.add_column('fleet_observations', sa.Column('model_name', sa.String(length=64), nullable=True))
    op.add_column('fleet_observations', sa.Column('model_version', sa.String(length=64), nullable=True))
    op.add_column('fleet_observations', sa.Column('gps_accuracy', sa.Float(), nullable=True))
    op.create_index(op.f('ix_fleet_observations_session_id'), 'fleet_observations', ['session_id'], unique=False)
    op.create_index(op.f('ix_fleet_observations_vehicle_ref_id'), 'fleet_observations', ['vehicle_ref_id'], unique=False)
    op.create_index(op.f('ix_fleet_observations_operator_ref_id'), 'fleet_observations', ['operator_ref_id'], unique=False)
    op.create_index(op.f('ix_fleet_observations_client_observation_id'), 'fleet_observations', ['client_observation_id'], unique=True)
    # Named explicitly (unlike the municipality migration's `create_foreign_key(None, ...)`
    # calls) so `downgrade()` can drop them by name — Postgres auto-names an
    # unnamed FK, but `op.drop_constraint(None, ...)` cannot discover that
    # name back without a naming_convention configured on the metadata, and
    # fails to compile (verified while testing this migration's downgrade).
    op.create_foreign_key('fk_fleet_observations_session_id_collection_sessions', 'fleet_observations', 'collection_sessions', ['session_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_fleet_observations_vehicle_ref_id_vehicles', 'fleet_observations', 'vehicles', ['vehicle_ref_id'], ['id'])
    op.create_foreign_key('fk_fleet_observations_operator_ref_id_fleet_operator_profiles', 'fleet_observations', 'fleet_operator_profiles', ['operator_ref_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_fleet_observations_operator_ref_id_fleet_operator_profiles', 'fleet_observations', type_='foreignkey')
    op.drop_constraint('fk_fleet_observations_vehicle_ref_id_vehicles', 'fleet_observations', type_='foreignkey')
    op.drop_constraint('fk_fleet_observations_session_id_collection_sessions', 'fleet_observations', type_='foreignkey')
    op.drop_index(op.f('ix_fleet_observations_client_observation_id'), table_name='fleet_observations')
    op.drop_index(op.f('ix_fleet_observations_operator_ref_id'), table_name='fleet_observations')
    op.drop_index(op.f('ix_fleet_observations_vehicle_ref_id'), table_name='fleet_observations')
    op.drop_index(op.f('ix_fleet_observations_session_id'), table_name='fleet_observations')
    op.drop_column('fleet_observations', 'gps_accuracy')
    op.drop_column('fleet_observations', 'model_version')
    op.drop_column('fleet_observations', 'model_name')
    op.drop_column('fleet_observations', 'hazard_type')
    op.drop_column('fleet_observations', 'client_observation_id')
    op.drop_column('fleet_observations', 'operator_ref_id')
    op.drop_column('fleet_observations', 'vehicle_ref_id')
    op.drop_column('fleet_observations', 'session_id')

    op.drop_index(op.f('ix_earning_records_status'), table_name='earning_records')
    op.drop_index(op.f('ix_earning_records_operator_id'), table_name='earning_records')
    op.drop_table('earning_records')

    op.drop_index(op.f('ix_collection_sessions_vehicle_id'), table_name='collection_sessions')
    op.drop_index(op.f('ix_collection_sessions_status'), table_name='collection_sessions')
    op.drop_index(op.f('ix_collection_sessions_operator_id'), table_name='collection_sessions')
    op.drop_index(op.f('ix_collection_sessions_client_session_id'), table_name='collection_sessions')
    op.drop_index(op.f('ix_collection_sessions_city_id'), table_name='collection_sessions')
    op.drop_table('collection_sessions')

    op.drop_index(op.f('ix_fleet_operator_profiles_operator_code'), table_name='fleet_operator_profiles')
    op.drop_index(op.f('ix_fleet_operator_profiles_city_id'), table_name='fleet_operator_profiles')
    op.drop_table('fleet_operator_profiles')

    op.drop_index(op.f('ix_vehicles_registration_number'), table_name='vehicles')
    op.drop_index(op.f('ix_vehicles_city_id'), table_name='vehicles')
    op.drop_table('vehicles')
