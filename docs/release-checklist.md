# Winter Smog Assistant — final project acceptance checklist

**Acceptance policy:** Every item must be **PASS** with a test artifact or reproducible manual evidence before the project is called demo-ready or production-ready. **PENDING** means it has not yet been verified. **BLOCKED** means an external prerequisite prevents completion. Architecture docs, source files or passing unit tests alone do **not** count as end-to-end success.

Progress updated: 2026-11-18. Milestones 1–5 are implemented, with the React dashboard and Python FastAPI/Uvicorn publicly accessible. Milestone 6 (source-grounded WHO/CPCB assistant) and Milestone 7 (self-reported habit metrics and reversible badges) have also been merged and deployed. M6/7 passed 36 backend/PostgreSQL tests, 43 frontend tests and live public release smoke checks including actual Cloudflare AI inference, server-owned WHO citations, prompt-injection refusal, and urgent medical escalation. The source catalog has 13 editorial summaries and now exposes the reviewed evidence supporting each answer. **Do not call this clinically validated, exhaustive RAG or fully production ready.** Independent scientific/medical review, broad hallucination/entailment testing, model usage-cost controls, identity/cloud synchronization, browser/device accessibility and manual multi-user QA remain pending. The original ClearSkies Worker is preserved. PostgreSQL schema is tested, but not connected to production user profiles.

## 1. Functionality
- [ ] PENDING — Daily briefing and weekly planner are tested; M6 WHO/CPCB cited assistant is live and passes automated smoke checks; alerts, community workflows and full manual user acceptance remain pending
- [ ] PENDING — City selection, household categories, home types and budget guidance implemented; real-world multi-location/budget manual validation pending
- [ ] PENDING — FastAPI invalid location, offline, high-AQI tests and React offline-state tests pass; full browser/offline E2E pending
- [ ] PENDING — AQI/weather fallback and mocked model-outage fallback pass automated tests; broader live outage and recovery drill pending
- [ ] PENDING — Manual audit for dead links, buttons and placeholder text

## 2. AI / GenAI quality
- [ ] PENDING — Versioned 13-passage curated WHO/CPCB source registry, public citations and safety tests implemented; independent medical/scientific editorial review and model answer entailment evaluation pending
- [ ] PENDING — Child/elder/respiratory safety and medical disclaimer scenarios
- [ ] PENDING — Numeric evidence whitelist and citation-free-model-output validation implemented; broad hallucination/entailment red-team evaluation pending
- [ ] PENDING — Basic prompt-injection and model-outage test suite added; adversarial red team beyond these cases pending
- [ ] PENDING — Regional language and voice accuracy with human review
- [ ] PENDING — Cloudflare live inference succeeded; model request billing, strict account budget alerts, global abuse throttling and latency SLO measurement pending

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
- [ ] PENDING — README, API contracts and source policy updated for M6/M7; fresh-machine independent verification and docs audit pending
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
| React + FastAPI deployment (Milestone 4 preview) | https://winter-smog-web.1nc24cs197.workers.dev/ and https://winter-smog-fastapi.onrender.com/api/v1/health | PASS: live frontend and public health/AQI/weather endpoints individually verified; later full E2E production acceptance PENDING |
| Milestone 5 planner and guidance | https://github.com/shivamani0426/virtual_prompts/pull/1 and https://github.com/shivamani0426/virtual_prompts/actions/runs/44351013489 | PASS: merged, build/lint and 33 frontend tests, Cloudflare upload; public page shows planner, indoor and alternatives sections. Manual cross-device/localStorage verification PENDING |
| Milestone 6 WHO/CPCB RAG | https://github.com/shivamani0426/virtual_prompts/pull/2 and https://github.com/shivamani0426/virtual_prompts/actions/runs/44362248792 | PASS: versioned 13-source catalog, citation metadata and reviewed evidence excerpts, FastAPI/PostgreSQL 36-test suite; independent medical validation PENDING |
| Milestone 6 live generated answers | https://github.com/shivamani0426/virtual_prompts/actions/runs/44362724226 | PASS: public model inference, cited FastAPI response, prompt-injection refusal and emergency escalation; model answer entailment/clinical review PENDING |
| Milestone 7 impact and badges | https://github.com/shivamani0426/virtual_prompts/actions/runs/44362248663 and https://github.com/shivamani0426/virtual_prompts/actions/runs/44362248877 | PASS: 43 frontend tests, React build/lint and Cloudflare deploy; manual live click/refresh and cross-device validation PENDING |
| Cloudflare AI gateway | https://github.com/shivamani0426/virtual_prompts/actions/runs/44361521333 | PASS: separate metered inference Worker deployed; quota and spending controls require independent audit |


## Milestone 6–7 live browser regression evidence

- Browser-based Chromium desktop and 390px mobile smoke: [GitHub Actions run 44363773759](https://github.com/shivamani0426/virtual_prompts/actions/runs/44363773759) — **PASS**.
- Verified actual user interaction: WHO PM2.5 question → relevant answer → official WHO link + exact reviewed evidence, browser-local task completion → badge unlock → page reload persistence → undo and badge revocation.
- Verified no horizontal document overflow at 390px and no uncaught JavaScript errors in this smoke journey.
- Automated with `scripts/test-winter-browser.mjs` and `.github/workflows/browser-e2e.yml`. Uses ephemeral browser localStorage and no accounts or personal data.
- **Limits:** This is a single end-to-end journey, not full assistive-technology, security, clinical entailment, real-device performance or regional-language coverage. Test execution can consume one metered model request and GitHub Actions minutes. The source registry still needs ongoing editorial governance and independent scientific review.


## Milestones 8–9 implementation evidence and acceptance boundaries

- Milestone 8 community D1 Worker + database schema, pseudonymous reports, moderator-only approval, opt-in foreground AQI alert controls and daily check-in challenges: `apps/community`. **Offline Node SQLite simulation** and deploy-dry-run CI passed at [44380031854](https://github.com/shivamani0426/virtual_prompts/actions/runs/44380031854) (4 tests). Actual Cloudflare D1 deployment and public write-path smoke verification **pending until merge and D1 token permission validation**.
- Milestone 8 React community flow: city-scoped approved reports, user submissions, challenge actions and alert preferences; 48 web tests, TypeScript, lint and build passed at [44380800822](https://github.com/shivamani0426/virtual_prompts/actions/runs/44380800822). **Not an end-to-end public D1 write-flow verification**.
- Milestone 9 Expo native mobile source at `apps/mobile`: TypeScript, 3 locale tests and Android/iOS JavaScript exports passed at [44380235457](https://github.com/shivamani0426/virtual_prompts/actions/runs/44380235457). **This is not a signed APK/IPA, an app-store release or a physical-device QA test**.
- Milestone 9 regional languages: 7 UI dictionary options, English fallback. Important safety notes translated, but full copy and evidence **not** independently reviewed in each language.
- Milestone 9 voice: optional browser speech recognition, web TTS and native Expo TTS; no first-party offline STT engine, no guarantee that a target browser supports a regional recognizer, and no recorded permission/device acceptance matrix.
- Release blockers retained: cross-device accounts, anti-abuse hardening, mobile signing, native device tests, independent translations, clinical trust reviews, backend push, scheduled alert delivery, monitoring and data privacy/export/deletion policy. These must not be represented as 100% finished.
