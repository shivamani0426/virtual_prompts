# Winter Smog Assistant — final project acceptance checklist

**Acceptance policy:** Every item must be **PASS** with a test artifact or reproducible manual evidence before the project is called demo-ready or production-ready. **PENDING** means it has not yet been verified. **BLOCKED** means an external prerequisite prevents completion. Architecture docs, source files or passing unit tests alone do **not** count as end-to-end success.

Progress updated: 2026-11-18. Milestones 2–4 passed CI. The React frontend is live at https://winter-smog-web.1nc24cs197.workers.dev/ and FastAPI/Uvicorn is live on Render; environmental data was independently verified. Milestone 5 planner, indoor-air and low-emission alternatives were released; 33 frontend tests and production deployment passed. Milestone 6 adds a reviewed 13-passage WHO/CPCB RAG registry, a citation-first assistant API with constrained optional Cloudflare model generation and safety refusals. Milestone 7 adds browser-local self-reported impact metrics and reversible badges. Automated M6/M7 CI is underway; live model quality, security and accessibility require verification. Manual browser/device testing of routine persistence remains pending. The existing legacy ClearSkies worker is preserved. The PostgreSQL schema is tested but not linked to a production account system; authentication, community functions, full RAG, mobile, device/accessibility audits and final release gates remain pending.

## 1. Functionality
- [ ] PENDING — Daily briefing is tested; Milestone 5 seven-day planner, rescheduling and local storage implemented with automated tests; chat, alerts, community and complete user acceptance remain pending
- [ ] PENDING — City selection, household categories, home types and budget guidance implemented; real-world multi-location/budget manual validation pending
- [ ] PENDING — FastAPI invalid location, offline, high-AQI tests and React offline-state tests pass; full browser/offline E2E pending
- [ ] PENDING — AQI/weather/LLM outage fallback tested end to end
- [ ] PENDING — Manual audit for dead links, buttons and placeholder text

## 2. AI / GenAI quality
- [ ] PENDING — Versioned 13-passage curated WHO/CPCB source registry, public citations and safety tests implemented; independent medical/scientific editorial review and model answer entailment evaluation pending
- [ ] PENDING — Child/elder/respiratory safety and medical disclaimer scenarios
- [ ] PENDING — Numeric evidence whitelist and citation-free-model-output validation implemented; broad hallucination/entailment red-team evaluation pending
- [ ] PENDING — Basic prompt-injection and model-outage test suite added; adversarial red team beyond these cases pending
- [ ] PENDING — Regional language and voice accuracy with human review
- [ ] PENDING — Response latency and LLM cost budget measured

## 3. Code quality
- [ ] PENDING — ESLint/Prettier and Black/Flake8 in strict CI
- [ ] PENDING — Unused code/debug traces and comments cleaned
- [ ] PENDING — Database/API/React feature directories implemented; overall modularity and code quality audit pending
- [ ] PENDING — Unit/integration/E2E test coverage thresholds set and passed
- [ ] PENDING — README instructions and tested screenshots

## 4. Security
- [ ] PENDING — Secret scan across files and Git history
- [ ] PENDING — .env ignored, .env.example present for every app
- [ ] PENDING — Input validation, XSS, injection and bad-URL test cases
- [ ] PENDING — Login/logout, token verification and tenant isolation end-to-end
- [ ] PENDING — React and FastAPI HTTPS preview is publicly accessible; production auth, user data isolation and full security audit remain pending
- [ ] PENDING — npm audit, pip-audit and dependency update review
- [ ] PENDING — Generic error responses without stack trace leakage

## 5. Efficiency and performance
- [ ] PENDING — 12-minute per-process AQI/weather TTL unit **PASS** in Phase 3; shared distributed production cache still pending
- [ ] PENDING — Lighthouse on actual deployment, realistic network profiles
- [ ] PENDING — Database EXPLAIN ANALYZE on seeded production-like data
- [ ] PENDING — Memory/leak/API dedupe tests
- [ ] PENDING — Concurrent-user load and LLM quota controls

## 6. UI/UX
- [ ] PENDING — Responsive CSS layouts implemented; actual mobile/tablet/desktop browser verification pending
- [ ] PENDING — Design consistency review
- [ ] PENDING — React loading/error/empty/stale components built and basic test assertions pass; complete accessibility audit pending
- [ ] PENDING — Readable contrast, keyboard support and screen reader audit
- [ ] PENDING — Elder/family usability feedback

## 7. Data and privacy
- [ ] PENDING — Data minimization and opt-in health flags reviewed
- [ ] PENDING — Secure storage/authorized access to household/location data
- [ ] PENDING — User privacy policy, informed consent and retention notice
- [ ] PENDING — Account/data export and permanent deletion flow tested

## 8. Testing
- [ ] PENDING — Automated unit/HTTP/component tests for M6/M7 run; independent device, browser, live model and manual end-user testing pending
- [ ] PENDING — Cross-browser and real device testing
- [ ] PENDING — Friends/family usability trials and feedback records
- [ ] PENDING — Defect tracker, severity and fix evidence

## 9. Deployment
- [ ] PENDING — React dashboard is deployed on Cloudflare account c37eaec570d5c0261dd4b3fdf8764ce4 and FastAPI on Render; production-level auth, storage, E2E monitoring and final deployment gate still pending
- [ ] PENDING — Production environment/secrets validation
- [ ] PENDING — PostgreSQL encrypted backup/restore drill
- [ ] PENDING — Logs, sanitized metrics, tracing and error alerts
- [ ] PENDING — Fresh machine build and setup

## 10. Documentation and submission
- [x] PASS — Initial architecture and proposed folder structure are in docs/ (Phase 1)
- [ ] PENDING — Up-to-date README, API specification and runnable service docs
- [ ] PENDING — Report/abstract with problem, method, results, limitations, references
- [ ] PENDING — Presentation slides
- [ ] PENDING — Recorded demo/screenshots
- [x] PASS — Application source in GitHub with traceable commits
- [ ] PENDING — Final source/data/API attribution audit

## 11. Viva/demo preparation
- [ ] PENDING — Explain architecture and technology tradeoffs
- [ ] PENDING — Demonstrate how RAG grounds answers
- [ ] PENDING — Explain security/privacy/caching decisions
- [ ] PENDING — Document limitations and ethical boundaries
- [ ] PENDING — Unique value and challenges Q&A
- [ ] PENDING — Rehearsed 3–5 minute demo and offline backup

## Final 10-minute release gate
- [ ] Fresh install from README
- [ ] Re-run main user flow
- [ ] Scan secrets/history and verify privacy behavior
- [ ] Check real live URL
- [ ] Have backup video and slides locally

## Evidence ledger

| Gate | Evidence | Result |
|---|---|---|
| Phase 1 architecture | docs/architecture.md and docs/project-structure.md | PASS (documentation only) |
| Phase 2 schema | apps/api/alembic/versions/0001_winter_smog.py; PostgreSQL CI on 2026-11-18 | PASS: migration up/down/up and 22 tables |
| Phase 2 isolation helpers | apps/api/app/db/access.py; apps/api/tests/test_schema.py | PASS: database-level membership helper tests, **not** proof of API-wide authorization |
| Legacy prototype | Existing JavaScript CI | Not evidence for React/FastAPI end-to-end acceptance |
| Legacy ClearSkies preview | https://clearskies-ai.1nc24cs197.workers.dev/ | PASS: homepage, health, city search and modelled air API independently verified |
| Phase 3 FastAPI public environmental API | https://github.com/shivamani0426/virtual_prompts/actions/runs/44317021168 | PASS: 18 total PostgreSQL/API tests, including geocoding, weather, validation, 12-minute TTL, stale/error handling, rate limiting and migration roundtrip |
| Phase 4 React dashboard | https://github.com/shivamani0426/virtual_prompts/actions/runs/44320757262 | PASS: first React TypeScript build, component/unit tests, ESLint; final opt-in regression rerun pending |
| React + FastAPI deployment (Milestone 4 preview) | https://winter-smog-web.1nc24cs197.workers.dev/ and https://winter-smog-fastapi.onrender.com/api/v1/health | PASS: live frontend and public health/AQI/weather endpoints individually verified; later full E2E production acceptance PENDING |\n| Milestone 5 planner and guidance | https://github.com/shivamani0426/virtual_prompts/pull/1 and https://github.com/shivamani0426/virtual_prompts/actions/runs/44351013489 | PASS: merged, build/lint and 33 frontend tests, Cloudflare upload; public page shows planner, indoor and alternatives sections. Manual cross-device/localStorage verification PENDING |
| Milestone 6 assistant and Milestone 7 badges | Feature branch `feat/milestones-06-07-trustworthy-rag-impact` | Backend and React automated tests in progress; separate model gateway dry-run passed. Public model inference and live end-to-end verification PENDING |
