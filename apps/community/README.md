# Winter Smog Assistant — Community service (Milestone 8)

The Community API uses a **dedicated Cloudflare Worker + D1 database** under the existing `1nc24cs197` Cloudflare account. It does not touch the older `clearskies-ai` Worker, and preserves the existing Python FastAPI + Uvicorn environmental/RAG backend.

## Security and moderation

- New browser/device sessions receive random 256-bit bearer tokens. Only SHA-256 token hashes are stored in D1. Browser tokens are in localStorage (shared-device warning); mobile tokens use Expo SecureStore. Pseudonymous ≠ fully authenticated.
- Report descriptions are capped at 500 characters and reject typical email/URL/phone/HTML content. They are scoped to a city, never precise GPS. Inputs are parameterized in SQL.
- **All reports are pending** until a maintainer manually approves or rejects them. No public API can alter moderation decisions. Run `Moderate one community report (maintainers only)` from GitHub Actions → Run workflow with UUID and decision.
- Approved reports are publicly displayed for up to 14 days with the warning that they are *unverified community observations, not AQI sensor measurements*.
- Sessions and submissions have two layers of abuse limits: Cloudflare per-IP rate limit bindings (approximate per location) and D1 per-session counters. No anonymous user can publish directly.
- Removing your own report now permanently deletes its record from D1. Daily challenge participation is self-reported, deduplicated by India local date and not treated as independently measured emissions impact.

## Alert delivery

Alert preferences are stored in D1 (city, modelled **US AQI** threshold, opt-in). `GET /alerts/check` fetches a fresh modelled AQI snapshot from FastAPI and returns uncertainty/failure rather than fabricating an official government alert. **Only foreground checks and browser/native dialogs are available currently.** Background push notification delivery, cross-device authentication, scheduled monitoring and anti-bot CAPTCHA are release blockers.

## Deployment

`.github/workflows/deploy-community.yml` (main branch only) creates or reuses a dedicated database, idempotently applies `schema.sql`, then uploads the Worker with a D1 binding. Two separate GitHub Actions repository secrets are required, scoped to the **1nc24cs197** Cloudflare account: `CLOUDFLARE_API_TOKEN` with **Workers Scripts: Edit** (existing Worker deploys), and **`CLOUDFLARE_D1_API_TOKEN`** with **D1: Edit** (new permission for this database only). The second must be created in the target Cloudflare account and saved directly in GitHub → repository Settings → Secrets and variables → Actions. Do **not** send the token to chat. A token scoped only to Workers cannot list or create D1 and returns HTTP 401. No worker or database mutation occurs until both tokens are present.

For moderator access, use GitHub Actions only; moderation is not exposed through an end-user API. Do not publish a moderator key or expose a moderation endpoint to clients.

```bash
node --test apps/community/tests/*.test.mjs
COMMUNITY_DRY_RUN=1 node scripts/deploy-community.mjs
```

## Known limits

No account login, no community photos or user-location history, no abuse appeal queue yet, no scheduled push delivery. The `Daily community privacy retention` workflow now prunes report records after 14 days, expired pseudonymous sessions and their linked challenge/alert data, and obsolete rate records (48 hours). It is scheduled via GitHub Actions and may be delayed by GitHub's scheduler. The final release still requires a complete privacy-policy, deletion/export audit and independent moderators. An actual moderator must review test reports before public posts can appear.

## Verified live acceptance (19 November 2026)

The separate Cloudflare D1 database and `winter-smog-community` Worker are now deployed successfully on the intended Cloudflare account. The existing React site was updated only after verifying D1 health. [Deployment evidence](https://github.com/shivamani0426/virtual_prompts/actions/runs/44383641879) includes a real D1 moderation-isolation and challenge/alert smoke. [React deployment](https://github.com/shivamani0426/virtual_prompts/actions/runs/44382069385) passed. [Real browser evidence](https://github.com/shivamani0426/virtual_prompts/actions/runs/44511930008) confirms community reports, browser refresh, check-ins, foreground preference changes, temporary QA report removal and mobile layout.

The `CLOUDFLARE_D1_API_TOKEN` is configured as a GitHub Actions secret; its value must never be logged or committed. Foreground alerts are **not** guaranteed push notifications. Human moderators are still required to approve actual reports; no official authority verification is implied.
