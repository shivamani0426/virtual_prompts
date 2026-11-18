# ClearSkies AI 🌿

A location-aware air-quality companion for families and communities during urban smog. Live **modelled** AQI and pollutant forecasts, tailored household advice, a practical sustainability checklist, and an AI question-and-answer assistant.

## Features
- Search by city worldwide or optionally use browser geolocation (rounded coordinates).
- Current **US AQI** and 12-hour outlook, PM2.5, PM10, NO₂ and O₃ from [Open-Meteo's CAMS-backed API](https://open-meteo.com/en/docs/air-quality-api).
- Daily routine cards adapt to the air, household sensitive groups, commute and HEPA filtration.
- Clearly separates **personal exposure reduction** from **pollution/emissions reduction**, with qualitative rather than made-up savings.
- Real text generation with **Cloudflare Workers AI** when the AI binding is configured; explicitly labeled rule-based fallback otherwise.
- Browser-local preferences and habit checklists; no third-party analytics, account system, or backend profile database. Selected city, current AQI and household preferences are sent to Cloudflare Workers AI when a user asks a chat question.
- Responsive, keyboard-friendly UI with reduced-motion support.

## Development

Requires Node.js 20+ for the dependency-free build and tests.

    npm run test
    npm run build
    node --check dist/worker.js

The build embeds HTML/CSS/client JavaScript from public/ into a **single** deployable ES module at dist/worker.js. Deploy that module as a Cloudflare Worker and attach a Workers AI binding named **AI**. The Worker uses the model @cf/google/gemma-4-26b-a4b-it.

**Cloudflare deployment (target locked):** The prepared manual GitHub Actions workflow deploys only to Cloudflare account `c37eaec570d5c0261dd4b3fdf8764ce4`, the user's requested account.

1. Confirm the Cloudflare account that owns `c37eaec570d5c0261dd4b3fdf8764ce4` and create an API token scoped to it with the necessary Workers deployment permissions. Do not commit the token.
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret. Name it `CLOUDFLARE_API_TOKEN` and paste the token.
3. GitHub repo → Actions → **Deploy ClearSkies AI to selected Cloudflare account** → Run workflow. It validates the app, creates the Worker script, binds Cloudflare Workers AI as `AI`, and enables the `workers.dev` route.
4. Verify `/api/health`, city search, live air data and an AI chat question on the deployed site. `/api/health` must report `aiConfigured: true`.

The upload command is `npm run deploy:cloudflare`. The deployment will refuse any other Cloudflare account ID; it will fail safely when the correct account token or permissions are missing. No additional static hosting is needed. Before broad public launch, set Workers AI spending alerts/limits and add production API rate limiting to protect `/api/assist`. Cloudflare usage limits and Workers AI billing depend on the account plan.

## Endpoints

- GET /api/health — readiness and AI-binding status
- GET /api/places?q=Delhi — city geocoding
- GET /api/air?lat=28.6139&lon=77.2090 — modelled current/hourly air forecast
- POST /api/assist — accepts JSON {question, location, aqi, profile}; returns {mode,answer,disclaimer}

## Important cautions

The displayed scale is **US AQI, not India's CPCB AQI**. Forecast values are broad-area model estimates, not hyperlocal sensor readings, not legal compliance data, and not official emergency warnings. Indoor air cannot be inferred directly from outdoor readings. The app provides general education, never diagnosis. Seek urgent medical assistance for serious symptoms.

Open-Meteo sources and CAMS attribution are shown in the application footer; review provider terms before commercial scale-up. If upstream data is down, the app shows an unavailable state instead of a fake number. AI availability depends on the bound Cloudflare Workers AI service.

## Project files

- src/worker.js — backend, data adapters, AQI interpretation, AI integration, security headers
- public/index.html — accessible page markup
- public/styles.css — responsive design system
- public/app.js — browser UI, city search, visual forecast, personalized plans, AI chat
- scripts/build.mjs — single-module bundling
- tests/guidance.test.mjs — basic validation tests

## Winter Smog Assistant — React + FastAPI application

**Live React dashboard:** https://winter-smog-web.1nc24cs197.workers.dev/

**Live Python FastAPI/Uvicorn:** https://winter-smog-fastapi.onrender.com/api/v1/health

This frontend lives in [apps/web/](apps/web/) and the Python backend with tested PostgreSQL schema in [apps/api/](apps/api/). The original `clearskies-ai` Worker is a separate preserved prototype. The dashboard includes location-aware **modelled US AQI** (not official India CPCB AQI), weather, forecasts, personalized daily briefings, a 21-activity weekly routine planner, indoor-air and low-emission recommendations.

**Milestone 6 — cited WHO/CPCB assistant:** A stateless `POST /api/v1/assistant` endpoint retrieves from a **fixed, 13-passage reviewed source registry**, refuses unsupported or medical/live-diagnosis requests and supplies official cited sources with publication and verification dates. Inference through a separate metered Cloudflare Workers AI gateway can paraphrase these references only when enabled and must pass a validation gate; otherwise reviewed-source summaries are shown. This is not unrestricted web browsing or a guarantee of clinical factual accuracy.

**Milestone 7 — truthful impact tracking and badges:** 90-day browser-local activity totals, day streak, category counts and six reversible achievement badges. This tracks **self-reported completed tasks**, not measured CO₂ savings, changes in air quality or prevented disease. No account/cloud synchronization yet.

Read [apps/web/README.md](apps/web/README.md), [apps/api/README.md](apps/api/README.md), [docs/rag-evidence-policy.md](docs/rag-evidence-policy.md), [docs/api-contracts.md](docs/api-contracts.md) and the [release checklist](docs/release-checklist.md).

Cloudflare React publishing happens only from `main` via `.github/workflows/deploy-react.yml`. The dedicated model Worker deploys through `.github/workflows/deploy-rag-ai.yml`. The real Python API is hosted on Render. Strong shared rate limits, AI account budget controls, identity, full clinical review and browser accessibility testing remain production readiness gates.
