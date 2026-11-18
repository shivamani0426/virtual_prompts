# Phase 2 — Database schema and privacy contract

**Scope:** PostgreSQL tables, migration, SQLAlchemy mappings, first owner-scoped access helpers, and integration tests. This phase does not introduce a production API, login, LLM, push alerts, or frontend rewrite.

## Entity groups

| Domain | Tables | Main constraints / indices |
|---|---|---|
| Identity | users, households, household_members, household_preferences | OIDC subject unique; membership composite key; owner FK; private aggregate profile flags |
| Geography and readings | locations, aqi_snapshots, weather_snapshots | coarse coordinates, source and observation timestamps, explicit CPCB/US scale, nonnegative AQI, per-source uniqueness |
| Planning and impact | briefings, routines, routine_completions, emissions_factors, impact_events | household ownership, routine date uniqueness, factor provenance, positive estimates with assumptions |
| Community | communities, community_members, community_reports, community_challenges, challenge_participation | member keys, pending moderation, report expiry, valid challenge dates |
| Notifications | notification_subscriptions, notification_preferences | opt-in false by default, hashed endpoint unique, encrypted fields, preferences bound to users |
| RAG and auditing | guideline_sources, guideline_chunks, audit_events | publisher/source URL, version and checksum, chunk ordering, minimal security audit records |

All 22 tables have migration definitions in `apps/api/alembic/versions/0001_winter_smog.py`, with matching SQLAlchemy mappings in `apps/api/app/db/models.py`.

### Main relationships

- users 1:N households (owner), M:N households (household_members)
- households 1:1 household_preferences, 1:N briefings/routines/impact_events
- locations 1:N aqi_snapshots and weather_snapshots
- users M:N communities through community_members
- communities 1:N pending/approved community_reports and community_challenges
- community_challenges M:N households through challenge_participation
- guideline_sources 1:N guideline_chunks

### Protection and deletion

- Users are identified by an external OIDC subject. No passwords or diagnosis names are stored by this schema.
- `has_children`, `has_older_adults`, `has_respiratory_sensitive` are **sensitive opt-in household summaries**, not public leaderboard fields. No GPS trail, precise street address, personal medication name or precise exposure history is stored.
- A household owner cannot be silently deleted because its FK is RESTRICT. First transfer ownership to a consenting member **or explicitly delete the household**; then delete the user, cascading their memberships and notification records. The deletion workflow is not implemented yet; it must be atomic, auditable and respect legally required retention.
- Public/community reports contain coarse place references and are moderation-pending by default. Before enabling community posting, implement EXIF stripping, permissions, approval, retention and abuse controls.
- `notification_subscriptions` requires **application-layer encryption at rest** and key rotation before use; no plaintext endpoints or push credentials should be stored.
- `guideline_sources` stores provenance and checksums. Only permitted or appropriately excerpted guideline text should be indexed, and user-supplied material cannot become trusted instructions.
- Audit entries must not store raw addresses, health flags, tokens, medication names or chat history.

### Ownership/authorization contract

The first `app.db.access` helpers require the **verified authenticated actor ID** and scope `visible_household`, `visible_households` and `visible_preferences` queries. These are tested for cross-user isolation. All later household queries MUST use the same scope pattern. Never accept a household owner/user identity from an untrusted client parameter. An authorized JWT/OIDC implementation, restricted PostgreSQL app role, and ideally RLS + denial tests are prerequisites for production, not yet completed here.

### Index strategy

- FK hot paths: household_members(user_id), households(owner_user_id), community_members(user_id), report community/time and report status/time.
- Time series: aqi_snapshots(location_id, observed_at), weather_snapshots(location_id, observed_at).
- User experiences: briefings(household_id, briefing_date), impact_events(household_id, occurred_on), routines(household_id, is_active).
- Unique pairs: routine_completions(routine_id, completed_on), sources, forecast reading source/timestamp and challenge participation.
- Retention is **not implemented yet**. Proposed: periodic expiration of approved/stale community reports, age limits on high-frequency measurements, and explicit deletion for user-owned profiles; retention windows require policy approval.

### Data quality and impact honesty

`aqi_scale` distinguishes `CPCB_INDIA`, `US_AQI`, and `NONE`. `is_official` must be set only after verification of a source's official designation; never infer it from numeric AQI. The database does not contain a made-up `exposure_reduction_percent`. `impact_events` records estimated kg CO₂e only when factor assumptions and provenance exist. Provider cache and stale-data handling are Phase 3 tasks.

### Testing

`tests/test_schema.py` tests unique identity, constraint enforcement, table creation and owner-scoped reads with isolated PostgreSQL transactions. `pytest` skips live DB checks locally unless DATABASE_URL is set, whereas GitHub CI supplies a test database. Checklist items requiring a real app, users, deployment or API are pending.
