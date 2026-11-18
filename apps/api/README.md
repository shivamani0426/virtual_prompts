# Winter Smog Assistant — FastAPI backend (Phase 3)

This directory contains the **new, independently tested Python API** and the Phase 2 PostgreSQL models/migrations. It is NOT yet connected to, or deployed with, the public ClearSkies AI Cloudflare Worker. The existing JavaScript site is preserved at the repository root.

## Run locally

Requirements: Python 3.12+, optional PostgreSQL 16+ for database integration tests, Internet access for real environmental readings.

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
uvicorn app.main:app --reload --port 8000
```

Open http://127.0.0.1:8000/docs (development only). Try a city or coordinates:

```bash
curl 'http://127.0.0.1:8000/api/v1/health'
curl 'http://127.0.0.1:8000/api/v1/places?q=Bengaluru'
curl 'http://127.0.0.1:8000/api/v1/air-quality?lat=12.97&lon=77.59'
curl 'http://127.0.0.1:8000/api/v1/forecast?lat=12.97&lon=77.59'
curl 'http://127.0.0.1:8000/api/v1/weather?lat=12.97&lon=77.59'
```

### Database migration and tests

Set `DATABASE_URL` for a disposable PostgreSQL database as shown in `.env.example` (use a real private password outside source control), then run:

```bash
alembic upgrade head
pytest -q
```

The end-to-end test workflow creates a temporary PostgreSQL service. HTTP provider tests use mock responses and work **even without DATABASE_URL**; PostgreSQL-specific tests skip locally if no database is configured. Never run `alembic downgrade base` on a database containing real user data (it removes these tables).

### Environment variables

- `DATABASE_URL`: PostgreSQL DSN, required only when running migration/database operations (FastAPI public routes do not access the DB yet)
- `APP_ENV=development`: enables local interactive API docs; `production` disables docs
- `CORS_ALLOWED_ORIGINS`: exact comma-separated frontend origins; wildcard is rejected
- `CACHE_TTL_SECONDS=720`: shared environmental cache contract, limited to 600–900 seconds
- `STALE_MAX_SECONDS=3600`: cached last-known reading may be returned as **stale** for up to one hour when a provider fails
- `PUBLIC_RATE_LIMIT_PER_MINUTE=60`: temporary process-local per-client limiter

### APIs

| Method | Path | Function |
|---|---|---|
| GET | `/api/v1/health` | service readiness |
| GET | `/api/v1/places?q=Delhi` | fixed-provider geocoding, 5 suggestions max |
| GET | `/api/v1/air-quality?lat=..&lon=..` | current US AQI, pollutants and hourly forecast |
| GET | `/api/v1/forecast?lat=..&lon=..` | hourly air-quality outlook |
| GET | `/api/v1/weather?lat=..&lon=..` | temperature, humidity and wind |

Responses include `freshness` (`live`, `cached`, or `stale`) and `fetched_at` (UTC). If upstream data is missing and no usable cached reading exists, an intentionally generic HTTP 503 is returned. Invalid coordinates and invalid search terms yield HTTP 422. Requests exceeding the process-local quota return HTTP 429. No fabricated numeric AQI values.

### Important safeguards and current limitations

- Open-Meteo returns **modelled US AQI**, not official India CPCB AQI. Keep this scale visible to all users; WHO/CPCB RAG and official CPCB ingestion are future modules. Air recommendations are general educational guidance and not medical advice.
- No household or health information is sent to providers in this API: coordinates are rounded for cache identity, and city queries are sent to the selected geocoding provider. HTTP requests still transmit coordinates to upstream providers; review user consent/retention before using precise browser location.
- Cache uses **memory inside one Python process**. For production with multiple app replicas, move caching and rate limits into a shared Redis-backed service, add metrics and secure client-IP handling, and apply authenticated quotas before any AI features.
- OIDC login, user-specific authorization endpoints, community data, persistent routines and React consumption are **not yet implemented**. Database access helpers exist but are not exposed over this public API.
- Fixed upstream provider URLs and no redirects help avoid SSRF. Exceptions are converted to generic HTTP 503; HTTPS must be enforced by the eventual reverse proxy/container deployment.
- See `../../docs/api-contracts.md` for the response contract and `../../docs/release-checklist.md` for full launch readiness.

External provider documentation and attribution: https://open-meteo.com/en/docs/air-quality-api and https://open-meteo.com/en/docs . Check terms and fair-use provisions before commercial deployment.

### Environment-specific upstream fallback (production preview)

If the Render free instance cannot access Open-Meteo air and weather endpoints directly, set `OPEN_METEO_RELAY_ENABLED=1` on the FastAPI host. The adapter then tries the fixed-host, read-only `winter-smog-relay.1nc24cs197.workers.dev` Cloudflare Worker **only after a direct provider request fails**. The relay forwards approximate coordinates (two decimals) to Open-Meteo, caches the provider request at Cloudflare for ten minutes and returns unmodified provider JSON. Python still normalizes and validates all readings. If both providers fail, the endpoint returns 503 without fabricated values. This relay is an availability workaround for the preview, not a substitute for a production provider SLA, rate-limit controls and user consent.

## Milestone 6 — WHO/CPCB-grounded assistant

`POST /api/v1/assistant` accepts `{"question":"What does WHO say about PM2.5?"}` (5–400 characters; no household or exact location input). `GET /api/v1/assistant/sources` exposes the reviewed evidence registry and its verification dates. Every returned source has an official URL, publisher and section. No live AQI is inferred from the chat request.

Generation is optional: `RAG_MODEL_ENABLED=0` returns carefully reviewed extractive summaries and never silently calls an LLM. If enabled, the server sends only an allowlisted evidence ID set and the short question to `winter-smog-rag-ai`, then screens the generated response for unsupported numbers, bogus citations and excessive divergence. It falls back to reviewed evidence if inference fails or is rejected. Clinical or emergency requests are not sent to the model.

**Do not claim that statistical generation guarantees factual accuracy.** Reviewed evidence and a lexical support gate are a first safeguard, not clinical assurance. Full source versioning, independent entailment tests, data-policy approvals, AI spend/rate caps and prompt-injection testing are part of the production release gates. The worker is deployed separately using `.github/workflows/deploy-rag-ai.yml`; Cloudflare model charges and per-location rate limits may apply.
