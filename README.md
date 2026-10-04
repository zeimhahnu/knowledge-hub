# Corporate-Action Hub (CoAc)

For index-fund operators: how each of seven index vendors — MSCI, S&P DJI,
FTSE Russell, STOXX, Solactive, Morningstar, VettaFi — treats a given corporate
action for a given fund, with the answer cited to the vendor's methodology.

Corporate action projection never agrees across vendors. The same event, same
security: one vendor applies it today, another next week, a third not until its
quarterly review. This tool explains why, and when each answer lands.

**Production:** https://hub.vpszeimhahnu.uk — Vercel, behind Cloudflare Access.

---

## How it works

- **Lookup** — enter a Franklin ETF ticker, pick the event type, and get each
  vendor's treatment with its `source_ref`, plus a coverage matrix and timeline.
- **Deferral** — a vendor whose review has not come yet is reported as *deferred
  to its next review date*, not as a gap. Calendars are per vendor index.
- **Analyst** — an embedded chat that answers only from the cited rules. The
  browser reaches it through `/api/ca-analyst/turn`, which verifies a Cloudflare
  Access JWT and validates the payload before relaying to a separate service.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage — symbol typeahead, then event-type selection |
| `/lookup/[ticker]` | Per-fund verdict: vendor treatments, coverage matrix and timeline, Analyst dock |
| `/guide/` | Operator guide |
| `/review/` | Review proposed rule changes |
| `/settings/` | Coverage settings and vendor publication horizons |
| `/upload/` | Upload a vendor methodology PDF for screening (sign-in required) |
| `/vendors/` | Vendor reference |
| `/vendors/iso-taxonomy/` | ISO 20022 CAEV taxonomy |
| `/vendors/event-extraction/` | Event extraction reference |
| `/vendors/review-calendars/` | Per-index review calendars |
| `/vendors/glossary/` | Vendor glossary |
| `/api/test/` | Health check — returns `{"ok":true,"source":"serverless"}` |
| `/api/symbols` | Symbol search / typeahead |
| `/api/rules/proposals` | Rule proposals read/write |
| `/api/ca-analyst/turn` | Analyst relay (Access JWT required) |
| `/api/ingest` | Methodology ingest (HTTP Basic auth) |
| `/api/news` | News-derived confirmation |

---

## Data

Curated, committed JSON under `src/data/`. Nothing is fetched from a remote rule
source at runtime.

| Path | Contents |
|---|---|
| `rules.json` | The rule table (`schema_version: 2`): vendor × event type × index type, each row carrying `source_ref` and `confidence` |
| `rules.schema.json` | Schema for `rules.json` |
| `screening-rules.json` | Upload screening thresholds |
| `glossary.json` | Vendor terminology |
| `fund-master/` | Franklin fund catalogs and the targeted-fund snapshot |
| `fund-master.schema.json` | Schema for the fund master |
| `methodologies/sources/` | Tracked vendor methodology PDFs |

**Currently tracked methodology PDFs — two:**

- `solactive-equity-index-methodology-v1.20-2026-06-16.pdf`
- `vettafi-index-maintenance-policy-v1.1.8-2026-05.pdf`

Other vendors' rules cite `SOURCES/` filenames that are **not** present in this
repository. Those paths are left explicit rather than guessed; `npm test`
(`check-citations.mjs`) enforces that a citation never names a document that is
neither tracked nor deliberately unset.

`SOURCES/index-vendor-methodology.md` is a 2026-04 narrative cross-reference. It
describes an earlier eight-PDF set and an earlier page layout. It is background,
not authority — `rules.json` plus the tracked PDFs win on any conflict.

---

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npm test         # every scripts/check-*.mjs guard
```

Those five scripts are the complete set — `package.json` defines no others.

`npm test` runs each `scripts/check-*.mjs` in its own process. `check-responsive.mjs`
is excluded because it needs a dev server on `:3100`; run it yourself when you
touch layout:

```bash
npm run dev -- --port 3100
node --experimental-transform-types scripts/check-responsive.mjs
```

CI (`.github/workflows/deploy.yml`) runs on Node 22: `npm ci`, `npm run lint`,
`npx tsc --noEmit`, `npm test`, `npm run build` — on push to `main` and on pull
requests to `main`.

---

## Contributing

Work on a branch named `task/<task-id>`, and open a pull request against `main`.

- Do not push to `main`. Do not merge your own PR — Alex merges.
- Do not force-push, delete branches, or deploy.
- Run `npm run lint`, `npx tsc --noEmit`, and `npm test` before opening the PR,
  and paste the real output.
- A rule change without a citable `source_ref` is not a rule change. Leaving
  something explicitly unsourced is the correct outcome; do not backfill a
  guess. See `AGENTS.md`.

---

## Layout

```
src/
  app/          routes (App Router)
  components/   shared UI
  data/         curated JSON datasets
  lib/          domain logic: rules, deferral, coverage, vendor entailment, analyst client
  middleware.ts Access JWT verification, ingest auth, origin boundary
scripts/        check-*.mjs guards, run-checks.mjs
docs/plans/     current plan and design notes
SOURCES/        2026-04 narrative cross-reference (background, not authority)
SPECS/          historical spec records; the inbox/outbox folder protocol is retired
```

`SPECS/inbox/` and `SPECS/outbox/` hold templates from the Cursor-era spec
handoff process. That process is retired and new work does not arrive there;
current design lives in `docs/plans/corporate-action-hub/`.

---

## Deployment

Vercel builds the Next.js app on merge to `main`. `next.config.ts` must not set
`output: "export"` or a `basePath` — the app depends on Route Handlers and Node
runtime middleware, so a static export breaks it. See `SPECS/VERCEL-MIGRATION.md`.

The production hostname is `hub.vpszeimhahnu.uk`, behind Cloudflare Access.
The legacy `corporate-action.vercel.app` origin still exists in
`src/lib/ca-analyst/origin-boundary.ts` as the pre-activation certificate
boundary; it is not the customer-facing URL.
