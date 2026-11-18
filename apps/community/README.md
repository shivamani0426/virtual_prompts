# Winter Smog Assistant — Community service (Milestone 8)

The Community API uses a **dedicated Cloudflare Worker + D1 database** under the existing `1nc24cs197` Cloudflare account. It does not touch the older `clearskies-ai` Worker, and preserves the existing Python FastAPI + Uvicorn environmental/RAG backend.

## Security and moderation

- New browser/device sessions receive random 256-bit bearer tokens. Only SHA-256 token hashes are stored in D1. Browser tokens are in localStorage (shared-device warning); mobile tokens use Expo SecureStore. Pseudonymous ≠ fully authenticated.
- Report descriptions are capped at 500 characters and reject typical email/URL/phone/HTML content. They are scoped to a city, never precise GPS. Inputs are parameterized in SQL.
- **All reports are pending** until a maintainer manually approves or rejects them. No public API can alter moderation decisions. Run `Moderate one community report (maintainers only)` from GitHub Actions → Run workflow with UUID and decision.
- Approved reports are publicly displayed for up to 14 days with the warning that they are *unverified community observations, not AQI sensor measurements*.
- Sessions and submissions have two layers of abuse limits: Cloudflare per-IP rate limit bindings (approximate per location) and D1 per-session counters. No anonymous user can publish directly.
- Daily challenge participation is self-reported, deduplicated per date and not treated as independently measured emissions impact.

## Alert delivery

Alert preferences are stored in D1 (city, modelled **US AQI** threshold, opt-in). `GET /alerts/check` fetches a fresh modelled AQI snapshot from FastAPI and returns uncertainty/failure rather than fabricating an official government alert. **Only foreground checks and browser/native dialogs are available currently.** Background push notification delivery, cross-device authentication, scheduled monitoring and anti-bot CAPTCHA are release blockers.

## Deployment

`.github/workflows/deploy-community.yml` (main branch only) creates or reuses a dedicated database, idempotently applies `schema.sql`, then uploads the Worker with a D1 binding. It requires the `CLOUDFLARE_API_TOKEN` repository secret to include **Workers Scripts: Edit and D1: Edit** permissions for the selected Cloudflare account. A token scoped only to Workers cannot create D1 and should fail without altering other services.

For moderator access, use GitHub Actions only; moderation is not exposed through an end-user API. Do not publish a moderator key or expose a moderation endpoint to clients.

```bash
node --test apps/community/tests/*.test.mjs
COMMUNITY_DRY_RUN=1 node scripts/deploy-community.mjs
```

## Known limits

No account login, no community photos or user-location history, no abuse appeal queue yet, no scheduled push delivery, no retention janitor yet. These must be completed during release hardening, and an actual moderator must review test reports before public posts can appear.
