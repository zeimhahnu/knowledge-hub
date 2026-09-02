# Corporate Action Hub — P0 release ledger

**Gate rerun:** 2026-09-02 15:32–15:38 UTC

**Repository / baseline SHA:** `agents/goop/knowledge-hub` / `f48ee7aec28fa48a93a0d9910e62da4e3cdc2237`

**Baseline branch:** `main` tracking `origin/main`; `git ls-remote origin refs/heads/main` returned the same SHA.

**Deployment:** https://corporate-action.vercel.app — reachable on 2026-09-02 15:37 UTC (HTTP 200); deployment revision is not exposed by the response, so it is **unknown**.

## P0 acceptance assertions

| Assertion | Result | Exact evidence |
| --- | --- | --- |
| Type-safe, linted, production build | PASS | `npx tsc --noEmit` passed; `npm run lint` exited 0 (one pre-existing unused-variable warning in `scripts/spike-yahoo-forward.mjs`); `npm run build` passed and generated `/lookup/[ticker]` plus `/api/news`. |
| Coverage window preserves timing semantics | PASS | `node scripts/check-coverage.mjs` — 6 assertions passed. |
| Lead-time settings retain source/provenance | PASS | `node scripts/check-coverage-settings.mjs` — 13 assertions passed. |
| Lookup verdict applies vendor scope and honest grading | PASS | `node scripts/check-lookup.mjs` — 16 assertions passed. |
| News validation is citation- and failure-safe | PASS | `node scripts/check-news-validation.mjs` — 52 assertions passed. |
| AAPL cash-dividend lookup header is valid | PASS | Local production server returned HTTP 200 for `/lookup/AAPL/?eventType=cash-dividend&exDate=2026-09-30`, with title `AAPL · Cash Dividend — Corporate-Action Lookup`, event `Cash Dividend`, CAEV `DVOP`, and ex-date `2026-09-30`. The deployed URL returned HTTP 200 and the same header fields. |
| In-scope vendor rows and honest matrix verdict | PASS | Default scope is all seven vendors. For this 28-day-out event, FTSE Russell is the sole assessed row: `not-yet-due`, 5d, provenance `from FTSE 5-day proforma tracker`; the six vendors without a documented or operator-set publication window are `not assessed`. The verdict is therefore the honest empty state: `No verdicts yet — no coverage period is set for an in-scope vendor.` This is exercised by the real `check-lookup.mjs` module assertions and the local production route. |
| News-verdict section never invents a result | PASS locally / BLOCKED in deployment | The local production route returned HTTP 200 with a `contradicted` medium-confidence verdict, four dated sources, and the 2026-07-02..2026-10-14 search window. The deployed `/api/news/` returned HTTP 503 with `validationRan:false` and `News search is not configured (TAVILY_API_KEY missing) — validation could not run.` The UI renders that warning rather than a fabricated verdict. |

## Commands actually run

```text
npx tsc --noEmit                                      PASS
npm run lint                                          PASS (0 errors; 1 warning)
npm run build                                         PASS
node scripts/check-coverage.mjs                       PASS (6 assertions)
node scripts/check-coverage-settings.mjs              PASS (13 assertions)
node scripts/check-lookup.mjs                         PASS (16 assertions)
node scripts/check-news-validation.mjs                PASS (52 assertions)
npm run start -- --hostname 127.0.0.1 --port 3100    PASS (local production journey)
```

## Release state

**BLOCKED for a fully live P0 news-validation journey:** the Vercel deployment lacks `TAVILY_API_KEY`; production correctly returns its explicit unverified warning (HTTP 503), while the local production build completes validation. The managed browser also cannot launch because this runtime's Chromium executable requires an unavailable Snap installation, so visual hydration was not independently browser-driven. No code integration defect was proven, so no product fix or dependency was added.

## Sole next slice

**P1a only — CA Analyst contextual assistant.** Do not start it until a program-design document specifies: affected files; frontend/API/VPS call flow; request/response and read-only tool schemas; RAG corpus and citation contract; Cloudflare Access and other security boundaries; unit/integration/e2e tests; and the release check. P1a remains 2-D (`vendor × event_type`) and excludes the fund master.
