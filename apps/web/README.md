# Winter Smog Assistant — React Dashboard (Milestone 4)

An accessible, mobile-responsive React/TypeScript/Vite interface for the new **Python FastAPI backend**. It is an isolated development application. The publicly deployed [ClearSkies AI preview](https://clearskies-ai.1nc24cs197.workers.dev/) is deliberately unchanged.

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

## Limits and privacy

- **US AQI is not the official Indian CPCB AQI.** The modelled Open-Meteo data is appropriate only when plainly labeled as an estimate; local sensor measurements can differ.
- The default displayed location is **Bengaluru, explicitly labeled an example city** until the visitor searches or enables approximate location.
- Outdoor planning shows the lowest modelled hour, never certifies a safe window in polluted conditions. Advice is informational, not medical advice.
- This stage is a dashboard, not a fully verified RAG system. It does not contain login, alerts, community reports, full habit planner or any official CPCB integration. They remain in later milestones.
- Household preferences are in browser localStorage and can be reset. On shared devices, others using the same browser profile may see them. Application cookies/auth are not configured in this phase.
- City and optional approximate geocoordinates are sent to the backend/provider for environmental data. The app does not retain the user's continuous location history.
- Production release requires shared API caching/rate limits, authentication for household-specific operations, accessibility audits and manual browser/device testing.
- This folder is not auto-deployed to Cloudflare yet; new frontend deployment must await a working and protected FastAPI production endpoint, with a separate staging smoke test.

References: [FastAPI API contract](../../docs/api-contracts.md), [project release checklist](../../docs/release-checklist.md), [Open-Meteo data documentation](https://open-meteo.com/en/docs/air-quality-api).
