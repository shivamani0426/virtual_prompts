"""Owner- and membership-scoped query helpers.

Never use these without a verified user ID from the authentication boundary.
"""

import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.db.models import Household, HouseholdMember, HouseholdPreferences


def visible_households(session: Session, actor_id: uuid.UUID, *, limit: int = 20, offset: int = 0) -> list[Household]:
    """List households accessible to the authenticated user with bounded paging."""
    if not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Invalid pagination")
    membership = sa.exists(
        sa.select(HouseholdMember.household_id).where(
            HouseholdMember.household_id == Household.id,
            HouseholdMember.user_id == actor_id,
        )
    )
    stmt = (
        sa.select(Household)
        .where(sa.or_(Household.owner_user_id == actor_id, membership))
        .order_by(Household.created_at.desc(), Household.id)
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(stmt))


def visible_household(session: Session, actor_id: uuid.UUID, household_id: uuid.UUID) -> Household | None:
    """Return one household only when the user owns or belongs to it."""
    membership = sa.exists(
        sa.select(HouseholdMember.household_id).where(
            HouseholdMember.household_id == Household.id,
            HouseholdMember.user_id == actor_id,
        )
    )
    stmt = sa.select(Household).where(
        Household.id == household_id,
        sa.or_(Household.owner_user_id == actor_id, membership),
    )
    return session.scalar(stmt)


def visible_preferences(session: Session, actor_id: uuid.UUID, household_id: uuid.UUID) -> HouseholdPreferences | None:
    """Read sensitive aggregate preferences only with household membership."""
    if visible_household(session, actor_id, household_id) is None:
        return None
    return session.get(HouseholdPreferences, household_id)
