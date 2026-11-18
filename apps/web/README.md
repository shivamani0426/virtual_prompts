# Winter Smog Assistant — React Dashboard (Milestones 4–7)

An accessible, mobile-responsive React/TypeScript/Vite interface for the new **Python FastAPI backend**. Production frontend: [Winter Smog Assistant](https://winter-smog-web.1nc24cs197.workers.dev/), deployed separately from the original [ClearSkies AI preview](https://clearskies-ai.1nc24cs197.workers.dev/). The public FastAPI API is hosted at [winter-smog-fastapi.onrender.com](https://winter-smog-fastapi.onrender.com/api/v1/health). The original ClearSkies Worker is unchanged.

## Run both services locally

Terminal 1 (FastAPI):

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2 (React):

```bash
cd apps/web
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api/*` to FastAPI at `127.0.0.1:8000`. The database is not required for the public environmental endpoints at this phase.

Verify:

```bash
cd apps/web
npm run build
npm test
npm run lint
npm run format:check
```

The frontend does not include any API keys. `VITE_API_BASE_URL` can point at the public HTTPS FastAPI service when deployed separately. Never put secrets into Vite env variables: the browser can read them.

## Features implemented

- Responsive dashboard and keyboard-accessible navigation.
- City search with explicit city selection and optional approximate geolocation, rounded to 2 decimal places.
- Current **modelled US AQI**, PM2.5/PM10/NO₂/ozone estimates and 12-hour forecast chart.
- Weather, lower-estimated AQI hour with **not-necessarily-safe** warnings where appropriate.
- Deterministic personalized advice for children, older adults and breathing sensitivities plus commute and indoor-air tips.
- Browser-local opt-in household preferences, including home and budget category (no sensitive details sent to FastAPI or an LLM).
- Loading/error/empty/stale states, cancellation of outdated requests, data source attribution, reduced-motion styling.
- **Milestone 6:** Cited WHO/CPCB assistant with source validation, prompt-injection/medical refusal, evidence-only fallback and optional AI paraphrasing. Each question is independent and transient; the assistant does not know today's AQI from chat alone.
- **Milestone 7:** Honest impact tracking: category completion totals, seven-day history, active-day streak and six reversible achievement badges; no fabricated kg CO₂ or health savings.
- **Milestone 5:** Monday–Sunday seven-day routine planner (21 tasks total), with activity categories for personal exposure precautions, low-emission travel and indoor-air habits.
- Mark activities complete/skip/undo; reschedule activities inside the current week; track total completion and reset the week after a confirmation step.
- **Persistent browser-local habit progress:** completion and rescheduling stored using a versioned bounded localStorage record. Task identities are date/category-based and remain stable when AQI and preferences change.
- Guidance adapts to current US AQI, household categories, commute type, home type and budget. Missing AQI is treated as unknown, not a safe value.
- Separate indoor-air assistant with smoke, kitchen extraction, ventilation, filtration and home-specific advice; no assumption of an indoor sensor.
- Clear distinction between potential emissions reduction and personal exposure precautions; no invented CO₂ or health benefit percentages.

## Limits and privacy

- **US AQI is not the official Indian CPCB AQI.** The modelled Open-Meteo data is appropriate only when plainly labeled as an estimate; local sensor measurements can differ.
- The default displayed location is **Bengaluru, explicitly labeled an example city** until the visitor searches or enables approximate location.
- Outdoor planning shows the lowest modelled hour, never certifies a safe window in polluted conditions. Advice is informational, not medical advice.
- This stage is a dashboard, not a fully verified RAG system. It does not contain login, alerts, community reports, *cloud-synchronized* planning, or any official CPCB integration. They remain in later milestones.
- Household preferences and routine completion/rescheduling are in browser localStorage and can be reset. Routine data is not synced across devices; history older than approximately 90 days is pruned on subsequent saves. On shared devices, others using the same browser profile may see them. Application cookies/auth are not configured in this phase.
- City and optional approximate geocoordinates are sent to the backend/provider for environmental data. The app does not retain the user's continuous location history.
- Production release requires shared API caching/rate limits, authentication for household-specific operations, accessibility audits and manual browser/device testing.
- Cloudflare deployment is handled by `.github/workflows/deploy-react.yml` and `scripts/deploy-react-cloudflare.mjs`, only on merges/pushes to `main`; feature branches run frontend CI before deployment. Do not overwrite the legacy `clearskies-ai` Worker.
- The FastAPI public provider endpoints are live, but this is an early public preview. Redis-backed distributed rate limiting/cache, account authentication, PWA/offline support, full device accessibility audits, and database-backed sync are **not** complete.

References: [FastAPI API contract](../../docs/api-contracts.md), [project release checklist](../../docs/release-checklist.md), [Open-Meteo data documentation](https://open-meteo.com/en/docs/air-quality-api).

## Milestone 5 user workflow

1. Open the dashboard and choose a city (Bengaluru is an example default, not auto-detected).
2. Visit **Your household** to opt in to relevant group categories and select commute, home type and budget. These preferences only affect locally generated guidance.
3. Visit **Weekly plan**, choose a day (Monday–Sunday), mark tasks **done** or **skipped**, or use **Move to** to reschedule within the week. Completed tasks remain completed when moved.
4. Refresh the browser; completed tasks, skipped tasks and moved dates should be restored. You can undo completion or reset the current week using the confirmation step.
5. Read **Low-emission choices** and **Indoor air** for explanations of benefits and limitations, then review the official alerts relevant to your area.
6. To clear local planner records manually: open browser developer tools → Application/Storage → Local Storage and remove `winter-smog:routines-v1`. The dashboard's Reset week button clears the currently displayed week only.

The assistant does not store chat history, health flags, exact coordinates or identity. Entering personally identifiable medical details is discouraged because generation may be sent to Cloudflare Workers AI. The planner does **not** save city, modelled AQI, health flags, or identity in routine storage; it stores only completion and date changes. It is browser-local, not encrypted, and other users of a shared browser profile could see the activity history.

## Tests

```bash
cd apps/web
npm install
npm run build
npm test
npm run lint
```

Automated tests cover calendar boundaries, stable task identities as AQI changes, high AQI / missing AQI advice, budget and home variations, persistence after remount, skip/reschedule/undo/reset, malformed storage and failure handling. Real-device, screen-reader, production smoke testing and household usability tests remain separate acceptance requirements.

## Milestone 6 and 7 validation

Source registry: `apps/api/app/knowledge/verified_sources.json`, editorial version `2026-11-18.1`, comprising curated official WHO and CPCB summary passages. Each answer shows original source URLs plus publication/review dates. The model may never invent citations. The retrieval is curated keyword-based retrieval, not an exhaustive search or automatic verification that an official page has not changed. See [RAG evidence and release policy](../../docs/rag-evidence-policy.md).

Try these in the live **Evidence AI assistant**: `What does WHO recommend for PM2.5?`, `How does India's CPCB AQI differ from US AQI?`, and `What makes indoor air less polluted?`. Unsupported questions should abstain; urgent symptoms trigger emergency guidance instead of diagnosis. The model has explicit costs and rate limits; generation can be disabled without preventing reviewed-source answers.

**Impact & badges** shows completion counts based on the local routine task status. Undoing or resetting a completed task revokes earned badge status immediately. Current streak counts consecutive dates with at least one self-reported completion, anchored on today or yesterday. Old activity history is pruned on subsequent saves after approximately 90 days. Badges are not independent evidence that any real-world action occurred.

```bash
cd apps/web
npm run build && npm test && npm run lint
cd ../api
pytest -q
```

Do not call this entire application clinically verified or fully production ready: WHO/CPCB content must undergo editorial revalidation, hallucination/entailment and prompt-injection reviews, and model billing safeguards and multi-device/end-to-end testing remain open.
