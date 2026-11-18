"""PostgreSQL integration checks for Phase 2 schema and authorization scope."""

from datetime import date, datetime, timezone
from decimal import Decimal
import os
import uuid

from alembic import command
from alembic.config import Config
import pytest
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.access import visible_household, visible_households, visible_preferences
from app.db.models import Base, Household, HouseholdMember, HouseholdPreferences, User


@pytest.fixture(scope="session")
def engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL not set; integration tests require PostgreSQL")
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    db = sa.create_engine(url)
    try:
        yield db
    finally:
        db.dispose()


@pytest.fixture()
def session(engine):
    with engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode="create_savepoint") as db:
            yield db
        transaction.rollback()


def test_tables_migrated(engine):
    table_names = set(sa.inspect(engine).get_table_names())
    expected = set(Base.metadata.tables)
    assert expected <= table_names
    assert len(expected) == 22


def test_users_unique_external_subject(session):
    session.add(User(subject="oidc|subject-a"))
    session.add(User(subject="oidc|subject-a"))
    with pytest.raises(IntegrityError):
        session.flush()


def test_household_isolation_and_membership(session):
    owner = User(subject="owner-a")
    visitor = User(subject="visitor-b")
    member = User(subject="member-c")
    session.add_all([owner, visitor, member])
    session.flush()
    household = Household(owner_user_id=owner.id, name="Household A")
    session.add(household)
    session.flush()
    session.add(HouseholdMember(household_id=household.id, user_id=member.id, role="member"))
    session.add(HouseholdPreferences(household_id=household.id, has_children=True, has_respiratory_sensitive=True, budget_band="low"))
    session.flush()

    assert visible_household(session, owner.id, household.id) is not None
    assert visible_household(session, member.id, household.id) is not None
    assert visible_household(session, visitor.id, household.id) is None
    assert visible_preferences(session, visitor.id, household.id) is None
    assert visible_preferences(session, member.id, household.id).has_children is True
    assert len(visible_households(session, visitor.id)) == 0
    assert len(visible_households(session, member.id)) == 1
    with pytest.raises(ValueError):
        visible_households(session, member.id, limit=1000)


def test_invalid_preference_budget_rejected(session):
    owner = User(subject="owner-budget")
    session.add(owner)
    session.flush()
    household = Household(owner_user_id=owner.id, name="Budget family")
    session.add(household)
    session.flush()
    session.add(HouseholdPreferences(household_id=household.id, budget_band="unlimited"))
    with pytest.raises(IntegrityError):
        session.flush()


def test_no_fake_percent_savings_column():
    impact = Base.metadata.tables["impact_events"]
    assert "estimated_kg_co2e" in impact.c
    assert "exposure_reduction_percent" not in impact.c
    assert "assumptions" in impact.c


def test_private_data_foreign_keys():
    relationships = Base.metadata.tables["household_preferences"].foreign_keys
    assert any(fk.target_fullname == "households.id" for fk in relationships)
    assert Base.metadata.tables["community_reports"].c.status is not None


def test_impact_nonnegative_constraint(engine, session):
    owner = User(subject="impact-owner")
    session.add(owner)
    session.flush()
    household = Household(owner_user_id=owner.id, name="Impact home")
    session.add(household)
    session.flush()
    from app.db.models import ImpactEvents
    session.add(ImpactEvents(household_id=household.id, activity_type="carpool", units_avoided=Decimal("-1"), assumptions={}, occurred_on=date.today()))
    with pytest.raises(IntegrityError):
        session.flush()
