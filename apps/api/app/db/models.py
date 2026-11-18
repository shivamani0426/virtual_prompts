"""SQLAlchemy models for Winter Smog Assistant Phase 2.

Health-related household flags are optional aggregates, not diagnoses.
"""

from datetime import date, datetime, time
from decimal import Decimal
import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared metadata for Alembic and repository-layer models."""

    metadata = sa.MetaData(naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    })


class User(Base):
    """users records."""

    __tablename__ = 'users'
    __table_args__ = (
        sa.Index('ix_users_1', 'subject'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    subject: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
        unique=True
    )
    display_name: Mapped[str | None] = mapped_column(
        sa.String(100),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=True
    )


class Location(Base):
    """locations records."""

    __tablename__ = 'locations'
    __table_args__ = (
        sa.CheckConstraint("latitude_approx BETWEEN -90 AND 90", name='rule_1'),
        sa.CheckConstraint("longitude_approx BETWEEN -180 AND 180", name='rule_2'),
        sa.Index('ix_locations_1', 'country_code', 'place_name'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    place_name: Mapped[str] = mapped_column(
        sa.String(120),
        nullable=False
    )
    country_code: Mapped[str] = mapped_column(
        sa.String(2),
        nullable=False
    )
    latitude_approx: Mapped[Decimal] = mapped_column(
        sa.Numeric(6, 2),
        nullable=False
    )
    longitude_approx: Mapped[Decimal] = mapped_column(
        sa.Numeric(6, 2),
        nullable=False
    )
    timezone: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class Household(Base):
    """households records."""

    __tablename__ = 'households'
    __table_args__ = (
        sa.Index('ix_households_1', 'owner_user_id'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='RESTRICT'),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('locations.id', ondelete='SET NULL'),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class HouseholdMember(Base):
    """household members records."""

    __tablename__ = 'household_members'
    __table_args__ = (
        sa.CheckConstraint("role IN ('owner','member')", name='rule_1'),
        sa.Index('ix_household_members_1', 'user_id'),
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('households.id', ondelete='CASCADE'),
        primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True
    )
    role: Mapped[str] = mapped_column(
        sa.String(20),
        nullable=False,
        server_default='member'
    )
    joined_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class HouseholdPreference(Base):
    """household preferences records."""

    __tablename__ = 'household_preferences'
    __table_args__ = (
        sa.CheckConstraint("budget_band IS NULL OR budget_band IN ('low','medium','high')", name='rule_1'),
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('households.id', ondelete='CASCADE'),
        primary_key=True
    )
    has_children: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.false()
    )
    has_older_adults: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.false()
    )
    has_respiratory_sensitive: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.false()
    )
    commute_method: Mapped[str | None] = mapped_column(
        sa.String(25),
        nullable=True
    )
    home_type: Mapped[str | None] = mapped_column(
        sa.String(30),
        nullable=True
    )
    budget_band: Mapped[str | None] = mapped_column(
        sa.String(20),
        nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class AqiSnapshot(Base):
    """aqi snapshots records."""

    __tablename__ = 'aqi_snapshots'
    __table_args__ = (
        sa.UniqueConstraint('location_id', 'provider', 'aqi_scale', 'observed_at', name='uq_aqi_snapshots_1'),
        sa.CheckConstraint("aqi_value IS NULL OR aqi_value >= 0", name='rule_1'),
        sa.CheckConstraint("aqi_scale IN ('CPCB_INDIA','US_AQI','NONE')", name='rule_2'),
        sa.Index('ix_aqi_snapshots_1', 'location_id', 'observed_at'),
        sa.Index('ix_aqi_snapshots_2', 'provider', 'observed_at'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('locations.id', ondelete='CASCADE'),
        nullable=False
    )
    provider: Mapped[str] = mapped_column(
        sa.String(32),
        nullable=False
    )
    aqi_scale: Mapped[str] = mapped_column(
        sa.String(24),
        nullable=False
    )
    aqi_value: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(7, 1),
        nullable=True
    )
    pollutants: Mapped[dict[str, object] | None] = mapped_column(
        postgresql.JSONB(),
        nullable=True
    )
    is_official: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.false()
    )
    quality_flag: Mapped[str] = mapped_column(
        sa.String(30),
        nullable=False,
        server_default='normal'
    )
    observed_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class WeatherSnapshot(Base):
    """weather snapshots records."""

    __tablename__ = 'weather_snapshots'
    __table_args__ = (
        sa.UniqueConstraint('location_id', 'provider', 'observed_at', name='uq_weather_snapshots_1'),
        sa.Index('ix_weather_snapshots_1', 'location_id', 'observed_at'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('locations.id', ondelete='CASCADE'),
        nullable=False
    )
    provider: Mapped[str] = mapped_column(
        sa.String(32),
        nullable=False
    )
    measurements: Mapped[dict[str, object]] = mapped_column(
        postgresql.JSONB(),
        nullable=False
    )
    observed_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False
    )
    fetched_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class Briefing(Base):
    """briefings records."""

    __tablename__ = 'briefings'
    __table_args__ = (
        sa.UniqueConstraint('household_id', 'briefing_date', name='uq_briefings_1'),
        sa.Index('ix_briefings_1', 'household_id', 'briefing_date'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('households.id', ondelete='CASCADE'),
        nullable=False
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('locations.id', ondelete='SET NULL'),
        nullable=True
    )
    aqi_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('aqi_snapshots.id', ondelete='SET NULL'),
        nullable=True
    )
    briefing_date: Mapped[date] = mapped_column(
        sa.Date(),
        nullable=False
    )
    content: Mapped[dict[str, object]] = mapped_column(
        postgresql.JSONB(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class Routine(Base):
    """routines records."""

    __tablename__ = 'routines'
    __table_args__ = (
        sa.CheckConstraint("category IN ('commute','cooking','heating','indoor_air','other')", name='rule_1'),
        sa.Index('ix_routines_1', 'household_id', 'is_active'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('households.id', ondelete='CASCADE'),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        sa.String(160),
        nullable=False
    )
    category: Mapped[str] = mapped_column(
        sa.String(32),
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.true()
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class RoutineCompletion(Base):
    """routine completions records."""

    __tablename__ = 'routine_completions'
    __table_args__ = (
        sa.UniqueConstraint('routine_id', 'completed_on', name='uq_routine_completions_1'),
        sa.Index('ix_routine_completions_1', 'completed_by', 'completed_on'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    routine_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('routines.id', ondelete='CASCADE'),
        nullable=False
    )
    completed_by: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True
    )
    completed_on: Mapped[date] = mapped_column(
        sa.Date(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class EmissionsFactor(Base):
    """emissions factors records."""

    __tablename__ = 'emissions_factors'
    __table_args__ = (
        sa.UniqueConstraint('country_code', 'activity_type', 'version', name='uq_emissions_factors_1'),
        sa.CheckConstraint("kg_co2e_per_unit >= 0", name='rule_1'),
        sa.CheckConstraint("valid_to IS NULL OR valid_to >= valid_from", name='rule_2'),
        sa.Index('ix_emissions_factors_1', 'country_code', 'activity_type', 'valid_from'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    country_code: Mapped[str] = mapped_column(
        sa.String(2),
        nullable=False
    )
    activity_type: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False
    )
    unit: Mapped[str] = mapped_column(
        sa.String(32),
        nullable=False
    )
    kg_co2e_per_unit: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 6),
        nullable=False
    )
    source_url: Mapped[str] = mapped_column(
        sa.String(600),
        nullable=False
    )
    valid_from: Mapped[date] = mapped_column(
        sa.Date(),
        nullable=False
    )
    valid_to: Mapped[date | None] = mapped_column(
        sa.Date(),
        nullable=True
    )
    version: Mapped[str] = mapped_column(
        sa.String(40),
        nullable=False
    )


class ImpactEvent(Base):
    """impact events records."""

    __tablename__ = 'impact_events'
    __table_args__ = (
        sa.CheckConstraint("units_avoided >= 0", name='rule_1'),
        sa.CheckConstraint("estimated_kg_co2e IS NULL OR estimated_kg_co2e >= 0", name='rule_2'),
        sa.Index('ix_impact_events_1', 'household_id', 'occurred_on'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('households.id', ondelete='CASCADE'),
        nullable=False
    )
    emissions_factor_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('emissions_factors.id', ondelete='SET NULL'),
        nullable=True
    )
    activity_type: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False
    )
    units_avoided: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 3),
        nullable=False
    )
    estimated_kg_co2e: Mapped[Decimal | None] = mapped_column(
        sa.Numeric(12, 3),
        nullable=True
    )
    assumptions: Mapped[dict[str, object]] = mapped_column(
        postgresql.JSONB(),
        nullable=False
    )
    occurred_on: Mapped[date] = mapped_column(
        sa.Date(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class Community(Base):
    """communities records."""

    __tablename__ = 'communities'
    __table_args__ = (
        sa.CheckConstraint("visibility IN ('private','public')", name='rule_1'),
        sa.Index('ix_communities_1', 'location_id'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    name: Mapped[str] = mapped_column(
        sa.String(120),
        nullable=False
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('locations.id', ondelete='SET NULL'),
        nullable=True
    )
    visibility: Mapped[str] = mapped_column(
        sa.String(20),
        nullable=False,
        server_default='private'
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class CommunityMember(Base):
    """community members records."""

    __tablename__ = 'community_members'
    __table_args__ = (
        sa.CheckConstraint("role IN ('member','moderator','admin')", name='rule_1'),
        sa.Index('ix_community_members_1', 'user_id'),
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('communities.id', ondelete='CASCADE'),
        primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True
    )
    role: Mapped[str] = mapped_column(
        sa.String(24),
        nullable=False,
        server_default='member'
    )
    approved: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.false()
    )
    joined_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class CommunityReport(Base):
    """community reports records."""

    __tablename__ = 'community_reports'
    __table_args__ = (
        sa.CheckConstraint("category IN ('garbage_burning','construction_dust','traffic_smoke','other')", name='rule_1'),
        sa.CheckConstraint("status IN ('pending','approved','rejected','expired')", name='rule_2'),
        sa.Index('ix_community_reports_1', 'community_id', 'created_at'),
        sa.Index('ix_community_reports_2', 'status', 'created_at'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False
    )
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True
    )
    category: Mapped[str] = mapped_column(
        sa.String(32),
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        sa.String(1000),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        sa.String(24),
        nullable=False,
        server_default='pending'
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('locations.id', ondelete='SET NULL'),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=True
    )


class CommunityChallenge(Base):
    """community challenges records."""

    __tablename__ = 'community_challenges'
    __table_args__ = (
        sa.CheckConstraint("ends_on >= starts_on", name='rule_1'),
        sa.Index('ix_community_challenges_1', 'community_id', 'starts_on'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    community_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        sa.String(160),
        nullable=False
    )
    starts_on: Mapped[date] = mapped_column(
        sa.Date(),
        nullable=False
    )
    ends_on: Mapped[date] = mapped_column(
        sa.Date(),
        nullable=False
    )
    target_unit: Mapped[str] = mapped_column(
        sa.String(30),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class ChallengeParticipation(Base):
    """challenge participation records."""

    __tablename__ = 'challenge_participation'
    __table_args__ = (
        sa.CheckConstraint("progress_value >= 0", name='rule_1'),
        sa.Index('ix_challenge_participation_1', 'household_id'),
    )
    challenge_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('community_challenges.id', ondelete='CASCADE'),
        primary_key=True
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('households.id', ondelete='CASCADE'),
        primary_key=True
    )
    progress_value: Mapped[Decimal] = mapped_column(
        sa.Numeric(12, 3),
        nullable=False,
        server_default='0'
    )
    joined_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class NotificationSubscription(Base):
    """notification subscriptions records."""

    __tablename__ = 'notification_subscriptions'
    __table_args__ = (
        sa.Index('ix_notification_subscriptions_1', 'user_id'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    endpoint_hash: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
        unique=True
    )
    endpoint_encrypted: Mapped[str] = mapped_column(
        sa.Text(),
        nullable=False
    )
    p256dh_encrypted: Mapped[str] = mapped_column(
        sa.Text(),
        nullable=False
    )
    auth_encrypted: Mapped[str] = mapped_column(
        sa.Text(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class NotificationPreference(Base):
    """notification preferences records."""

    __tablename__ = 'notification_preferences'
    __table_args__ = (
        sa.CheckConstraint("aqi_threshold >= 0 AND aqi_threshold <= 500", name='rule_1'),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True
    )
    enabled: Mapped[bool] = mapped_column(
        sa.Boolean(),
        nullable=False,
        server_default=sa.false()
    )
    aqi_threshold: Mapped[int] = mapped_column(
        sa.Integer(),
        nullable=False,
        server_default='150'
    )
    quiet_start: Mapped[time | None] = mapped_column(
        sa.Time(),
        nullable=True
    )
    quiet_end: Mapped[time | None] = mapped_column(
        sa.Time(),
        nullable=True
    )
    timezone: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
        server_default='Asia/Kolkata'
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class GuidelineSource(Base):
    """guideline sources records."""

    __tablename__ = 'guideline_sources'
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    publisher: Mapped[str] = mapped_column(
        sa.String(80),
        nullable=False
    )
    title: Mapped[str] = mapped_column(
        sa.String(240),
        nullable=False
    )
    source_url: Mapped[str] = mapped_column(
        sa.String(600),
        nullable=False,
        unique=True
    )
    version: Mapped[str] = mapped_column(
        sa.String(80),
        nullable=False
    )
    checksum_sha256: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False
    )
    published_on: Mapped[date | None] = mapped_column(
        sa.Date(),
        nullable=True
    )
    retrieved_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


class GuidelineChunk(Base):
    """guideline chunks records."""

    __tablename__ = 'guideline_chunks'
    __table_args__ = (
        sa.UniqueConstraint('source_id', 'chunk_number', name='uq_guideline_chunks_1'),
        sa.CheckConstraint("chunk_number >= 0", name='rule_1'),
        sa.Index('ix_guideline_chunks_1', 'source_id', 'chunk_number'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('guideline_sources.id', ondelete='CASCADE'),
        nullable=False
    )
    chunk_number: Mapped[int] = mapped_column(
        sa.Integer(),
        nullable=False
    )
    excerpt: Mapped[str] = mapped_column(
        sa.Text(),
        nullable=False
    )
    checksum_sha256: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False
    )


class AuditEvent(Base):
    """audit events records."""

    __tablename__ = 'audit_events'
    __table_args__ = (
        sa.Index('ix_audit_events_1', 'created_at'),
        sa.Index('ix_audit_events_2', 'actor_user_id', 'created_at'),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid(as_uuid=True),
        primary_key=True,
        server_default=sa.text('gen_random_uuid()')
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True
    )
    event_type: Mapped[str] = mapped_column(
        sa.String(80),
        nullable=False
    )
    resource_kind: Mapped[str] = mapped_column(
        sa.String(60),
        nullable=False
    )
    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid(as_uuid=True),
        nullable=True
    )
    details: Mapped[dict[str, object] | None] = mapped_column(
        postgresql.JSONB(),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text('CURRENT_TIMESTAMP')
    )


