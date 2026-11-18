# Winter Smog Assistant — final project acceptance checklist

**Acceptance policy:** Every item must be **PASS** with a test artifact or reproducible manual evidence before the project is called demo-ready or production-ready. **PENDING** means it has not yet been verified. **BLOCKED** means an external prerequisite prevents completion. Architecture docs, source files or passing unit tests alone do **not** count as end-to-end success.

Progress updated: 2026-11-18. Phase 2 (database) in progress; existing ClearSkies Worker remains a separate prototype.

## 1. Functionality
- [ ] PENDING — Personalized daily briefing, planner, chat, alerts and community workflow end-to-end
- [ ] PENDING — Multiple locations, household categories and budgets
- [ ] PENDING — Empty/invalid location, offline and very high AQI boundary cases
- [ ] PENDING — AQI/weather/LLM outage fallback tested end to end
- [ ] PENDING — Manual audit for dead links, buttons and placeholder text

## 2. AI / GenAI quality
- [ ] PENDING — Reviewed WHO/CPCB-grounded answers with cited source versions
- [ ] PENDING — Child/elder/respiratory safety and medical disclaimer scenarios
- [ ] PENDING — Numeric answer provenance and hallucination prevention
- [ ] PENDING — Prompt injection red-team suite
- [ ] PENDING — Regional language and voice accuracy with human review
- [ ] PENDING — Response latency and LLM cost budget measured

## 3. Code quality
- [ ] PENDING — ESLint/Prettier and Black/Flake8 in strict CI
- [ ] PENDING — Unused code/debug traces and comments cleaned
- [ ] PENDING — Modular structure reviewed
- [ ] PENDING — Unit/integration/E2E test coverage thresholds set and passed
- [ ] PENDING — README instructions and tested screenshots

## 4. Security
- [ ] PENDING — Secret scan across files and Git history
- [ ] PENDING — .env ignored, .env.example present for every app
- [ ] PENDING — Input validation, XSS, injection and bad-URL test cases
- [ ] PENDING — Login/logout, token verification and tenant isolation end-to-end
- [ ] BLOCKED — TLS verified on live deployment after Cloudflare account access
- [ ] PENDING — npm audit, pip-audit and dependency update review
- [ ] PENDING — Generic error responses without stack trace leakage

## 5. Efficiency and performance
- [ ] PENDING — AQI/weather cache TTL tested (10–15 min)
- [ ] PENDING — Lighthouse on actual deployment, realistic network profiles
- [ ] PENDING — Database EXPLAIN ANALYZE on seeded production-like data
- [ ] PENDING — Memory/leak/API dedupe tests
- [ ] PENDING — Concurrent-user load and LLM quota controls

## 6. UI/UX
- [ ] PENDING — Mobile/tablet/desktop screen verification
- [ ] PENDING — Design consistency review
- [ ] PENDING — Loading/error/empty states accessible
- [ ] PENDING — Readable contrast, keyboard support and screen reader audit
- [ ] PENDING — Elder/family usability feedback

## 7. Data and privacy
- [ ] PENDING — Data minimization and opt-in health flags reviewed
- [ ] PENDING — Secure storage/authorized access to household/location data
- [ ] PENDING — User privacy policy, informed consent and retention notice
- [ ] PENDING — Account/data export and permanent deletion flow tested

## 8. Testing
- [ ] PENDING — Unit, integration, browser and manual user tests run
- [ ] PENDING — Cross-browser and real device testing
- [ ] PENDING — Friends/family usability trials and feedback records
- [ ] PENDING — Defect tracker, severity and fix evidence

## 9. Deployment
- [ ] BLOCKED — Verified live site on requested Cloudflare account c37eaec570d5c0261dd4b3fdf8764ce4
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
| Phase 2 schema | apps/api/alembic/versions/0001_winter_smog.py | IN PROGRESS (migration tests required) |
| Phase 2 isolation helpers | apps/api/app/db/access.py; apps/api/tests/test_schema.py | IN PROGRESS (integration CI required) |
| Legacy prototype | Existing JavaScript CI | Not evidence for React/FastAPI end-to-end acceptance |
| Live production | Target account authorization unresolved | BLOCKED |
