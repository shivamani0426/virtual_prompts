# Winter Smog Assistant — verified-evidence policy (Milestone 6)

## Verified primary-source registry

Registry: `apps/api/app/knowledge/verified_sources.json`, editorial version `2026-11-18.1`. Facts are **short editorial summaries** cross-checked against the linked official WHO and CPCB webpages on 18 November 2026. They are not live readings, not automatic monitoring and not complete source-document reproductions. Each passage has a stable ID, publisher, published date, URL and specific section. A reviewer must re-verify passages when publishers update guidance. Do not silently expand this registry via web search, model completions or user-submitted URLs.

Key verified pages:
- WHO Global Air Quality Guidelines 2021: https://www.who.int/news-room/questions-and-answers/item/who-global-air-quality-guidelines
- WHO guideline concentration values: https://www.who.int/news/item/07-09-2022-who-releases-new-repository-of-resources-for-air-quality-management
- WHO Personal Interventions (4 October 2024): https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication
- CPCB National AQI: https://airquality.cpcb.gov.in/AQI/

**No official CPCB live feed is connected.** Modelled US AQI from Open-Meteo is a different index from Indian CPCB AQI; neither scale can be transformed into the other by copying the numeric value. WHO PM2.5 and PM10 guideline values apply to *annual/24-hour mean concentration* and may not be compared to a momentary or hourly pollutant concentration as though the averaging periods match.

## Assistant trust policy

1. The FastAPI server retrieves from the fixed registry by query relevance, rejects unsupported requests and returns exact official links for all used evidence. The client does not get to nominate URLs or source excerpts.
2. User prompts are **not instructions to the model about what to ignore**. Prompts, webpages, and retrieved text are lower-trust data. The server controls the model system prompt, model choice, output budget, citations and allowed evidence.
3. The Cloudflare model may rephrase verified excerpts, but citations are always added by the server, never invented by the LLM. Server-side validation rejects unverified numerals, uncited outputs, unsupported confident statements, and medical promises. On failure, the API returns an **extractive source-backed fallback** or abstains.
4. Health emergencies, prescriptions, symptoms, pregnancy/children and individual medical treatment receive a conservative refusal to diagnose and direction to qualified clinical care. For severe breathing difficulty or chest pain, advise urgent local medical attention.
5. Stale modelled AQI is disclosed separately, and no AQI can be invented or taken from an outdated conversation. The first version's GenAI endpoint does **not** use a live AQI value unless independently fetched and time-checked; do not imply that it can tell whether the user's street is currently safe.
6. UI must show **publisher, document title, source section, publication date, editorial verification date, source URL**, and a clear label distinguishing extractive/evidence-only from AI paraphrase. No percentage of CO2 savings or indoor particle reductions is inferred from checking a task.
7. This is an **evidence retrieval and constrained-generation prototype**, not clinical-grade validation. Automated tests and source links reduce hallucinations; they do **not** prove every possible free-form model answer is accurate. Independent clinical review, citation entailment evaluation, prompt-injection tests, limits/accounting and WHO/CPCB source maintenance are release blockers.

## Privacy and deployment

The API accepts only a short question and returns stateless answers. No personal profile, city history, exact coordinates or chat history is required or persisted. Avoid submitting sensitive medical details. API responses are `Cache-Control: no-store`. Cloudflare AI token and cost exposure are treated as production security concerns. Enable model requests only with provider usage budget/alerts configured and verified rate limits; if the remote model is disabled/unavailable, the server serves cited extractive evidence.

## Qualitative impact tracking

Impact means **completed habits and sustained engagement**, not measured emissions reduction, improvements in health, or a claim that pollution in a neighborhood decreased. Badges are awarded for verified local completion status (self-reported), labeled honestly, and can be revoked by undo/reset. Device-local storage cannot verify the underlying actions actually happened.

## Quantitative claim integrity hardening

Numerical WHO/CPCB model sentences must match an entire approved source sentence (normalized whitespace/case), not merely reuse numbers present anywhere in the retrieved documents. This guards against swapping WHO 24-hour and annual values, changing concentration units, and incorrectly presenting an index number as a pollutant concentration. If the model paraphrases a quantitative sentence, the server safely falls back to the reviewed passage. This intentionally favors evidence precision over conversational variety; it does **not** establish a formal scientific entailment guarantee for qualitative claims. See `test_model_cannot_swap_averaging_time_or_unit_using_approved_numbers`.
