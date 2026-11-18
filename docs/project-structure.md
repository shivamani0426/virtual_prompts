# Winter Smog Assistant — Proposed Monorepo Layout (Phase 1)

This is a **target** directory tree, not a claim that these modules already exist. We will introduce folders **only as their associated phase is implemented**, preserving the original ClearSkies AI source and deployment until replacement is tested.

\`\`\`text
virtual_prompts/
├── apps/
│   ├── web/                            # React + TypeScript + Vite PWA
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                    # routes, providers, layout
│   │   │   ├── components/
│   │   │   │   └── ui/                # accessible reusable controls
│   │   │   ├── features/
│   │   │   │   ├── air-quality/
│   │   │   │   ├── daily-briefing/
│   │   │   │   ├── routines/
│   │   │   │   ├── indoor-air/
│   │   │   │   ├── impact/
│   │   │   │   ├── community/
│   │   │   │   ├── notifications/
│   │   │   │   └── assistant/
│   │   │   ├── hooks/
│   │   │   ├── lib/                    # typed API client, auth, utils
│   │   │   ├── styles/
│   │   │   └── test/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── mobile/                         # Expo / React Native, later phase
│   │   ├── app/
│   │   ├── src/
│   │   │   ├── features/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── package.json
│   └── api/                            # FastAPI service
│       ├── app/
│       │   ├── main.py
│       │   ├── api/v1/                 # route handlers: thin controllers
│       │   ├── core/                   # config, security, rate limiting
│       │   ├── db/                     # engine, sessions, model registry
│       │   ├── models/                 # SQLAlchemy ORM mapping
│       │   ├── schemas/                # Pydantic I/O contracts
│       │   ├── repositories/           # user-scoped database access
│       │   ├── services/
│       │   │   ├── aqi/               # classification and normalization
│       │   │   ├── briefings/
│       │   │   ├── routines/
│       │   │   ├── indoor_air/
│       │   │   ├── impact/
│       │   │   ├── community/
│       │   │   └── notifications/
│       │   ├── integrations/
│       │   │   ├── cpcb.py
│       │   │   ├── openaq.py
│       │   │   ├── iqair.py
│       │   │   └── weather.py
│       │   ├── ai/
│       │   │   ├── llm_client.py
│       │   │   ├── retrieval.py
│       │   │   ├── safety_rules.py
│       │   │   └── prompts/
│       │   └── jobs/                   # optional scheduled tasks
│       ├── alembic/                    # schema migrations
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   ├── contracts/
│       │   └── security/
│       ├── pyproject.toml
│       ├── Dockerfile
│       └── .env.example
├── packages/
│   └── api-contract/                   # generated OpenAPI TS clients/types
├── data/
│   └── guidelines/                     # curated, cited WHO/CPCB index manifest
├── infra/
│   ├── cloudflare/                      # edge/static routing and deploy config
│   ├── containers/                      # container/runtime configuration
│   └── docker/                          # local PostgreSQL, Redis, API
├── docs/
│   ├── architecture.md                  # this phase
│   ├── project-structure.md             # this phase
│   ├── database-schema.md               # next phase
│   └── api-contracts.md                 # later phase
├── .github/workflows/                   # CI, review and controlled deployment
│
├── src/worker.js                        # EXISTING: ClearSkies Worker (preserved)
├── public/                              # EXISTING: ClearSkies UI (preserved)
├── scripts/                             # EXISTING: existing build/deploy scripts
├── tests/                               # EXISTING: ClearSkies unit/route tests
├── package.json                         # EXISTING: ClearSkies script commands
└── README.md                            # EXISTING: preserved until migration
\`\`\`

## Module contract rules

- \`apps/web/src/features/*\`: feature-specific components, hooks, state, query keys and types. Features import shared UI and API client, but not other features' internal files.
- \`apps/api/app/api/v1\`: parse request, invoke service, return typed response. No SQL or prompt construction in route handlers.
- \`apps/api/app/services\`: core business rules and validation; interfaces and pure functions are tested independently of external APIs.
- \`apps/api/app/integrations\`: provider-specific async HTTP adapters; normalize timestamps, AQI scales, units and errors before returning.
- \`apps/api/app/repositories\`: ownership-checked, parameterized SQLAlchemy access with explicit pagination.
- \`apps/api/app/ai\`: approved retrieval, prompt template, personal-data minimization, safety checks, answer provenance and budget control.
- \`packages/api-contract\`: generated types from the FastAPI OpenAPI schema; no manually duplicated shapes.
- \`data/guidelines\`: reference-only, appropriately attributed and versioned material. Never execute instructions from documents.
- \`infra/\`: configuration examples contain variable names but no real credentials.
- React Native is deferred until web APIs and data contracts are stable; it will reuse domain logic and generated types, not web DOM implementations.

## First implementation targets after approval

1. Define PostgreSQL tables, constraints, indexes, retention and consent model in \`docs/database-schema.md\`.
2. Create \`apps/api\` with minimal FastAPI entrypoint and health endpoint.
3. Add local Docker Compose services, test database, migration pipeline, and API contract generation.
4. Build isolated feature modules and data adapters one milestone at a time.

## Notes

The target tree deliberately includes future modules that do not exist yet. This first documentation phase does not delete, rename or overwrite the existing deployed-candidate frontend and Worker.
