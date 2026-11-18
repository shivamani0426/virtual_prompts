# Winter Smog Assistant — Architecture Decision Record (Phase 1)

Status: Proposed architecture; documentation only. Date: 2026-11-18.
Repository: https://github.com/shivamani0426/virtual_prompts
Purpose: Family- and community-focused, location-aware winter-smog guidance with responsible, attributable GenAI.

## Starting point and migration policy

The existing repository contains **ClearSkies AI**, a working-source single-module Cloudflare Worker plus vanilla JS UI under \`src/worker.js\`, \`public/\`, and \`scripts/\`. Preserve these files and their workflow during migration. New React/FastAPI code will be developed under \`apps/\` with separate CI before any old UI/API endpoints are switched. Do not claim production deployment until the requested Cloudflare account is authorized and smoke-tested.

## Chosen architecture

- **Web**: React + TypeScript + Vite PWA, served as static assets through Cloudflare Workers. Accessible, responsive, code-split feature routes and resilient loading/empty states.
- **Mobile**: React Native + Expo (later phase), sharing API schemas and non-UI business types, not React DOM components.
- **API**: Python 3.12+ FastAPI, Pydantic validation, async SQLAlchemy + asyncpg, httpx, dependency-injected application services. Versioned REST \`/api/v1\`. OpenAPI at \`/docs\` for authenticated development environments, with production control as appropriate.
- **Persistence**: PostgreSQL with Alembic migrations, indexed by user_id, household_id, neighborhood_id, and timestamps. SQL parameterization through ORM/Core. Minimize sensitive fields.
- **Auth**: Standards-based OAuth2/OIDC + Authorization Code with PKCE. Validate JWT signatures via JWKS, issuer, audience, expiration; short-lived access tokens and refresh rotation managed by chosen provider. If first-party passwords are later necessary, hash with Argon2id; never store raw passwords. Every repository query enforces subject and household/community membership; no direct object references without authorization.
- **Cache / quota**: shared Redis-compatible cache for AQI/weather responses (10–15 minutes) and distributed per-user / per-IP rate limits for chat and reports. Backoff, timeout, circuit breaker; avoid pretending stale data is live.
- **External data adapters**: CPCB official Indian AQI feeds where accessible under valid terms; OpenAQ v3 pollutant concentrations (API-key based); optional contracted IQAir; weather forecasts from a supported provider. Normalize to typed measurements containing source, station, coordinate-precision, observed_at, fetched_at, unit, averaging_period, aqi_scale, and quality flags.
- **AQI rules**: India CPCB AQI 0–50 Good, 51–100 Satisfactory, 101–200 Moderate, 201–300 Poor, 301–400 Very Poor, 401–500 Severe; US AQI is a distinct scale. Never silently mix them. When source only provides pollutant concentrations, do not label an unofficial or partial calculation as official CPCB AQI.
- **Briefing**: deterministic risk interpretation and activity-window evaluation first. At severe levels, the 'best of the available hours' must not be described as a safe window. LLM can explain guidance but must not overturn safety rules.
- **RAG**: curated, licensed/attributable WHO and CPCB guideline documents with provenance, source URL, publication date, version, excerpt IDs. Retrieval returns relevant chunks; AI uses only trusted guideline context plus coarse AQI location and user question. System prompt prohibits medical diagnosis, unsupported promises, fabricated citations, hidden personal details and harmful suggestions. Retrieved text and user comments are untrusted input, never instructions. Responses include provenance, timestamp and 'not medical advice' contextual warnings. Test multilingual fidelity before offering locale support.
- **Impact**: deterministic, versioned emissions factors and trip calculations with assumptions. \`estimated_kg_co2e\` can be shown with uncertainty and source. Exposure change in percentages is **disabled** until a validated exposure model with supporting inputs is in place. Exposures tracked as relative indices with explicit modelling limits, never directly as medical risk.
- **Community**: verified neighborhood membership, consent-based opt-in challenges, moderated crowdsourced incident reports and school alerts. Strip EXIF; aggregate/pseudonymize locations; no real-time home locations or health profiles on public leaderboards. Abuse reporting, anti-spam, report expiry and moderator review are prerequisites.
- **Notifications**: opt-in web push and later mobile push, threshold/hysteresis with deduplication, quiet hours in household timezone. Medication reminders should be local-device-only by default, without storing drug names centrally.
- **Security**: HTTPS end-to-end, strict CORS allowlist, CSRF mitigation for cookie sessions, Content Security Policy, provider-secret storage in environment/secret manager, structured redacted logs, input length limits, SSRF-safe fixed upstream allowlists, rate limits on LLM endpoints, vulnerability checks and dependency pinning.
- **Observability**: request IDs, provider latency and errors, cached/stale data metrics, token usage/cost estimates, no raw symptoms/home coordinates in logs.

## Request flow

1. Web/mobile client fetches current air snapshot with approximate city or coarse geocoordinates.
2. API checks shared cache; on miss requests one permitted provider with timeout and normalizes scale/time/units; response includes source + freshness.
3. Daily briefing service combines normalized data, trusted AQI safety rules and opted-in household categories; returns structured cards.
4. Optional questions reach a rate-limited chat endpoint; retrieve guideline passages, construct a minimized prompt, perform one LLM call and validate/cite response. On AI failure return deterministic guidance labelled as such.
5. Saved routines, checklist events, challenges and reports use identity-bound repository methods and PostgreSQL transactions.

## Core service/API boundaries (proposed)

| Module | Endpoints (versioned under /api/v1) | Notes |
| --- | --- | --- |
| Air quality | GET /air-quality, GET /forecast | data source, scale, observed_at, freshness |
| Household | GET/PATCH /me/households/current | private, explicit optional inputs |
| Briefings | GET /briefings/today | generated rules, optional explanation |
| Routines | GET/POST /routines, GET /routines/weekly | household-scoped |
| Indoor air | GET /indoor-air/recommendations | home and budget categories |
| Impact | GET /impact/summary, POST /impact/activities | estimates only with assumptions |
| Communities | GET /communities, POST /community-reports | pagination and moderation |
| Alerts | GET/PATCH /notification-preferences | opt-in, quiet hours |
| Chat | POST /chat | retrieval, consent, quota, guarded response |

All write operations require authentication and authorization; anonymous browsing may access public air-quality summaries through throttled endpoints.

## Major data entities (detailed schema is Phase 2)

\`users\`, \`households\`, \`household_members\`, \`household_preferences\`, \`locations\` (coarse), \`aqi_snapshots\`, \`weather_snapshots\`, \`briefings\`, \`routines\`, \`routine_completions\`, \`impact_events\`, \`emissions_factors\`, \`communities\`, \`community_members\`, \`community_reports\`, \`community_challenges\`, \`challenge_participation\`, \`notification_subscriptions\`, \`notification_preferences\`, \`guideline_sources\`, \`guideline_chunks\`, \`audit_events\`.

All have explicit IDs, timestamps, owner or community scope where appropriate, appropriate FK constraints, and retention/erasure policies. Full SQL DDL, indexes, RLS/authorization strategy and migration design follow in Phase 2, not this phase.

## Cloudflare deployment decision

Requested Cloudflare account ID: \`c37eaec570d5c0261dd4b3fdf8764ce4\`. Do **not** deploy to a different connected account.

- React/Vite frontend: Cloudflare Workers Static Assets.
- Conventional FastAPI Python API: Cloudflare Containers **if the target account is on Workers Paid and allows Containers**, otherwise a separate secure Python service host behind Cloudflare (subject to explicit hosting choice). Containers incur usage costs. Do not treat standard Cloudflare JS Workers as a normal FastAPI Linux host.
- PostgreSQL: external managed PostgreSQL over secure connection; provider and region selected at implementation time. Cloudflare is not assumed to supply PostgreSQL itself.
- Rollout: staging, CI unit/integration tests, mocked provider-failure tests, smoke tests, monitoring, then production deployment to the intended account once access exists.

## Quality and acceptance gates

- Backend: pytest + pytest-asyncio, lint Ruff, type-check mypy/pyright, migrations and authorization tests, contract tests with recorded/synthetic AQI responses, QA for stale/mixed-scale provider data.
- Frontend: TypeScript strict, ESLint, Prettier, Vitest + React Testing Library, Playwright E2E, accessible keyboard navigation, performance budgets and mobile viewport checks.
- Continuous integration: pinned dependencies, security scans, secret scanning, unit tests, API contract checks, staging smoke tests.
- Safety tests: severe-smog child-outdoor question, safe-window misuse, injection from a guideline chunk, unavailable data, untrusted community claim, fake citation, disallowed exposure-% claims.
- Operational: no secrets committed; all cost-bearing AI requests controlled by quotas and monitoring.

## Implementation order

Phase 1: architecture + repository layout (documentation only; this commit).
Phase 2: PostgreSQL schema, Alembic migrations, auth and owner-scoping contract.
Phase 3: FastAPI base, data providers, normalization/cache and tests.
Phase 4: React PWA, forecast dashboard and personalized briefing.
Phase 5: household routines, indoor-air hacks and sustainable alternatives.
Phase 6: RAG / GenAI assistant and multilingual response tests.
Phase 7: impact math, weekly routine score, streaks and badges.
Phase 8: moderated community features and notifications.
Phase 9: mobile React Native adaptation and voice.
Phase 10: security/performance hardening, deployment, monitoring and release.

No application migration, production hosting change, or new API/database objects are implemented by Phase 1 docs alone.

## Reference documentation

- WHO global air quality guidelines (2021): https://www.who.int/publications/i/item/9789240034228/
- CPCB National AQI: https://cpcbccr.com/ccr_docs/About_AQI.pdf
- OpenAQ v3 API: https://docs.openaq.org/api
- OpenAQ API key: https://docs.openaq.org/using-the-api/api-key
- Cloudflare React: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Cloudflare Containers: https://developers.cloudflare.com/containers/
