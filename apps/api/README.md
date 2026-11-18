# Winter Smog Assistant — Phase 2 PostgreSQL schema

This is an **implemented database module**, not a running FastAPI service yet. Existing ClearSkies AI source and deployment scripts at the repository root are intentionally preserved.

## Setup

1. Install Python 3.12+, and start a PostgreSQL 16+ database you control.
2. Create a virtual environment and activate it.
3. From `apps/api`: `python -m pip install -e '.[dev]'`.
4. Configure `DATABASE_URL` through your shell or a locally sourced ignored .env file. Use the format `postgresql+psycopg://user:password@host:5432/dbname`.
5. Run `alembic upgrade head` to install the schema.
6. Run `pytest -q` for PostgreSQL integration tests.
7. Run `alembic downgrade base` **only on a disposable development database** because it destroys all Phase 2 tables.

### Security boundary

The `app.db.access` helpers accept a **verified** actor UUID only. Do not derive actor IDs from request JSON. Identity provider JWT verification and centralized authorization are scheduled for Phase 3. A true production deployment must also use a restricted database role with RLS/privileges and tenant-scoped service queries; do not expose this module directly as an API yet.

Most tables use UUIDs, foreign keys and indexed relationship columns. Sensitive household flags are aggregated booleans and never a diagnosis record. Notification endpoints and keys have ciphertext-only columns; encryption and key management are prerequisites before enabling notifications. Community reports are pending until moderated.

## Verification

GitHub Actions database workflow provisions a disposable PostgreSQL instance, runs Alembic, and executes data integrity and household access tests. The existing JavaScript CI workflow remains separate.

See `docs/database-schema.md` and `docs/release-checklist.md` at the repository root for schema, privacy, constraints, progress and honest completion status.
