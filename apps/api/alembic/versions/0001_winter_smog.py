"""Initial Winter Smog Assistant relational schema.

Revision ID: 0001_winter_smog
Revises:
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision = "0001_winter_smog"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('subject', sa.String(255), nullable=False, unique=True),
        sa.Column('display_name', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_1', 'users', ['subject'])

    op.create_table(
        'locations',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('place_name', sa.String(120), nullable=False),
        sa.Column('country_code', sa.String(2), nullable=False),
        sa.Column('latitude_approx', sa.Numeric(6, 2), nullable=False),
        sa.Column('longitude_approx', sa.Numeric(6, 2), nullable=False),
        sa.Column('timezone', sa.String(64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("latitude_approx BETWEEN -90 AND 90", name='rule_1'),
        sa.CheckConstraint("longitude_approx BETWEEN -180 AND 180", name='rule_2'),
    )
    op.create_index('ix_locations_1', 'locations', ['country_code', 'place_name'])

    op.create_table(
        'households',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('owner_user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('location_id', sa.Uuid(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_households_1', 'households', ['owner_user_id'])

    op.create_table(
        'household_members',
        sa.Column('household_id', sa.Uuid(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(20), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("role IN ('owner','member')", name='rule_1'),
    )
    op.create_index('ix_household_members_1', 'household_members', ['user_id'])

    op.create_table(
        'household_preferences',
        sa.Column('household_id', sa.Uuid(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('has_children', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('has_older_adults', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('has_respiratory_sensitive', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('commute_method', sa.String(25), nullable=True),
        sa.Column('home_type', sa.String(30), nullable=True),
        sa.Column('budget_band', sa.String(20), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("budget_band IS NULL OR budget_band IN ('low','medium','high')", name='rule_1'),
    )

    op.create_table(
        'aqi_snapshots',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('location_id', sa.Uuid(as_uuid=True), sa.ForeignKey('locations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(32), nullable=False),
        sa.Column('aqi_scale', sa.String(24), nullable=False),
        sa.Column('aqi_value', sa.Numeric(7, 1), nullable=True),
        sa.Column('pollutants', postgresql.JSONB(), nullable=True),
        sa.Column('is_official', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('quality_flag', sa.String(30), nullable=False, server_default='normal'),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('location_id', 'provider', 'aqi_scale', 'observed_at', name='uq_aqi_snapshots_1'),
        sa.CheckConstraint("aqi_value IS NULL OR aqi_value >= 0", name='rule_1'),
        sa.CheckConstraint("aqi_scale IN ('CPCB_INDIA','US_AQI','NONE')", name='rule_2'),
    )
    op.create_index('ix_aqi_snapshots_1', 'aqi_snapshots', ['location_id', 'observed_at'])
    op.create_index('ix_aqi_snapshots_2', 'aqi_snapshots', ['provider', 'observed_at'])

    op.create_table(
        'weather_snapshots',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('location_id', sa.Uuid(as_uuid=True), sa.ForeignKey('locations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(32), nullable=False),
        sa.Column('measurements', postgresql.JSONB(), nullable=False),
        sa.Column('observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('location_id', 'provider', 'observed_at', name='uq_weather_snapshots_1'),
    )
    op.create_index('ix_weather_snapshots_1', 'weather_snapshots', ['location_id', 'observed_at'])

    op.create_table(
        'briefings',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('household_id', sa.Uuid(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), nullable=False),
        sa.Column('location_id', sa.Uuid(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('aqi_snapshot_id', sa.Uuid(as_uuid=True), sa.ForeignKey('aqi_snapshots.id', ondelete='SET NULL'), nullable=True),
        sa.Column('briefing_date', sa.Date(), nullable=False),
        sa.Column('content', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('household_id', 'briefing_date', name='uq_briefings_1'),
    )
    op.create_index('ix_briefings_1', 'briefings', ['household_id', 'briefing_date'])

    op.create_table(
        'routines',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('household_id', sa.Uuid(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('category', sa.String(32), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("category IN ('commute','cooking','heating','indoor_air','other')", name='rule_1'),
    )
    op.create_index('ix_routines_1', 'routines', ['household_id', 'is_active'])

    op.create_table(
        'routine_completions',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('routine_id', sa.Uuid(as_uuid=True), sa.ForeignKey('routines.id', ondelete='CASCADE'), nullable=False),
        sa.Column('completed_by', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('completed_on', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('routine_id', 'completed_on', name='uq_routine_completions_1'),
    )
    op.create_index('ix_routine_completions_1', 'routine_completions', ['completed_by', 'completed_on'])

    op.create_table(
        'emissions_factors',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('country_code', sa.String(2), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('unit', sa.String(32), nullable=False),
        sa.Column('kg_co2e_per_unit', sa.Numeric(12, 6), nullable=False),
        sa.Column('source_url', sa.String(600), nullable=False),
        sa.Column('valid_from', sa.Date(), nullable=False),
        sa.Column('valid_to', sa.Date(), nullable=True),
        sa.Column('version', sa.String(40), nullable=False),
        sa.UniqueConstraint('country_code', 'activity_type', 'version', name='uq_emissions_factors_1'),
        sa.CheckConstraint("kg_co2e_per_unit >= 0", name='rule_1'),
        sa.CheckConstraint("valid_to IS NULL OR valid_to >= valid_from", name='rule_2'),
    )
    op.create_index('ix_emissions_factors_1', 'emissions_factors', ['country_code', 'activity_type', 'valid_from'])

    op.create_table(
        'impact_events',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('household_id', sa.Uuid(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), nullable=False),
        sa.Column('emissions_factor_id', sa.Uuid(as_uuid=True), sa.ForeignKey('emissions_factors.id', ondelete='SET NULL'), nullable=True),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('units_avoided', sa.Numeric(12, 3), nullable=False),
        sa.Column('estimated_kg_co2e', sa.Numeric(12, 3), nullable=True),
        sa.Column('assumptions', postgresql.JSONB(), nullable=False),
        sa.Column('occurred_on', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("units_avoided >= 0", name='rule_1'),
        sa.CheckConstraint("estimated_kg_co2e IS NULL OR estimated_kg_co2e >= 0", name='rule_2'),
    )
    op.create_index('ix_impact_events_1', 'impact_events', ['household_id', 'occurred_on'])

    op.create_table(
        'communities',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('location_id', sa.Uuid(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='private'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("visibility IN ('private','public')", name='rule_1'),
    )
    op.create_index('ix_communities_1', 'communities', ['location_id'])

    op.create_table(
        'community_members',
        sa.Column('community_id', sa.Uuid(as_uuid=True), sa.ForeignKey('communities.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(24), nullable=False, server_default='member'),
        sa.Column('approved', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("role IN ('member','moderator','admin')", name='rule_1'),
    )
    op.create_index('ix_community_members_1', 'community_members', ['user_id'])

    op.create_table(
        'community_reports',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('community_id', sa.Uuid(as_uuid=True), sa.ForeignKey('communities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('category', sa.String(32), nullable=False),
        sa.Column('description', sa.String(1000), nullable=False),
        sa.Column('status', sa.String(24), nullable=False, server_default='pending'),
        sa.Column('location_id', sa.Uuid(as_uuid=True), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("category IN ('garbage_burning','construction_dust','traffic_smoke','other')", name='rule_1'),
        sa.CheckConstraint("status IN ('pending','approved','rejected','expired')", name='rule_2'),
    )
    op.create_index('ix_community_reports_1', 'community_reports', ['community_id', 'created_at'])
    op.create_index('ix_community_reports_2', 'community_reports', ['status', 'created_at'])

    op.create_table(
        'community_challenges',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('community_id', sa.Uuid(as_uuid=True), sa.ForeignKey('communities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('starts_on', sa.Date(), nullable=False),
        sa.Column('ends_on', sa.Date(), nullable=False),
        sa.Column('target_unit', sa.String(30), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("ends_on >= starts_on", name='rule_1'),
    )
    op.create_index('ix_community_challenges_1', 'community_challenges', ['community_id', 'starts_on'])

    op.create_table(
        'challenge_participation',
        sa.Column('challenge_id', sa.Uuid(as_uuid=True), sa.ForeignKey('community_challenges.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('household_id', sa.Uuid(as_uuid=True), sa.ForeignKey('households.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('progress_value', sa.Numeric(12, 3), nullable=False, server_default='0'),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("progress_value >= 0", name='rule_1'),
    )
    op.create_index('ix_challenge_participation_1', 'challenge_participation', ['household_id'])

    op.create_table(
        'notification_subscriptions',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('endpoint_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('endpoint_encrypted', sa.Text(), nullable=False),
        sa.Column('p256dh_encrypted', sa.Text(), nullable=False),
        sa.Column('auth_encrypted', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_notification_subscriptions_1', 'notification_subscriptions', ['user_id'])

    op.create_table(
        'notification_preferences',
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('aqi_threshold', sa.Integer(), nullable=False, server_default='150'),
        sa.Column('quiet_start', sa.Time(), nullable=True),
        sa.Column('quiet_end', sa.Time(), nullable=True),
        sa.Column('timezone', sa.String(64), nullable=False, server_default='Asia/Kolkata'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.CheckConstraint("aqi_threshold >= 0 AND aqi_threshold <= 500", name='rule_1'),
    )

    op.create_table(
        'guideline_sources',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('publisher', sa.String(80), nullable=False),
        sa.Column('title', sa.String(240), nullable=False),
        sa.Column('source_url', sa.String(600), nullable=False, unique=True),
        sa.Column('version', sa.String(80), nullable=False),
        sa.Column('checksum_sha256', sa.String(64), nullable=False),
        sa.Column('published_on', sa.Date(), nullable=True),
        sa.Column('retrieved_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    op.create_table(
        'guideline_chunks',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('source_id', sa.Uuid(as_uuid=True), sa.ForeignKey('guideline_sources.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_number', sa.Integer(), nullable=False),
        sa.Column('excerpt', sa.Text(), nullable=False),
        sa.Column('checksum_sha256', sa.String(64), nullable=False),
        sa.UniqueConstraint('source_id', 'chunk_number', name='uq_guideline_chunks_1'),
        sa.CheckConstraint("chunk_number >= 0", name='rule_1'),
    )
    op.create_index('ix_guideline_chunks_1', 'guideline_chunks', ['source_id', 'chunk_number'])

    op.create_table(
        'audit_events',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('actor_user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(80), nullable=False),
        sa.Column('resource_kind', sa.String(60), nullable=False),
        sa.Column('resource_id', sa.Uuid(as_uuid=True), nullable=True),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_audit_events_1', 'audit_events', ['created_at'])
    op.create_index('ix_audit_events_2', 'audit_events', ['actor_user_id', 'created_at'])



def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('guideline_chunks')
    op.drop_table('guideline_sources')
    op.drop_table('notification_preferences')
    op.drop_table('notification_subscriptions')
    op.drop_table('challenge_participation')
    op.drop_table('community_challenges')
    op.drop_table('community_reports')
    op.drop_table('community_members')
    op.drop_table('communities')
    op.drop_table('impact_events')
    op.drop_table('emissions_factors')
    op.drop_table('routine_completions')
    op.drop_table('routines')
    op.drop_table('briefings')
    op.drop_table('weather_snapshots')
    op.drop_table('aqi_snapshots')
    op.drop_table('household_preferences')
    op.drop_table('household_members')
    op.drop_table('households')
    op.drop_table('locations')
    op.drop_table('users')
