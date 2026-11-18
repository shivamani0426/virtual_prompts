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

The build embeds HTML/CSS/client JavaScript from public/ into a **single** deployable ES module at dist/worker.js. Deploy that module as a Cloudflare Worker and attach a Workers AI binding named **AI**. The Worker uses the model @cf/google/gemma-4-26b-a4b-it.

**Cloudflare deployment:** Create a Worker named clearskies-ai in your intended Cloudflare account, upload dist/worker.js as the main module, add a Workers AI binding with variable name AI, and enable a workers.dev route. The app routes itself; no additional static hosting or environment secrets are needed. Cloudflare usage limits and Workers AI billing depend on the account plan.

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
