# AGENTS.md — CA-Hub (Corporate-Action Hub)

Rules for any agent or developer working in this repository. Written against the
current source, not an earlier design.

---

## What this is

**Corporate-Action Hub (CoAc)** tells an index-fund operator how each of seven
index vendors — MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar,
VettaFi — treats a corporate action, for a given fund, with the answer cited to
the vendor's own methodology.

The embedded **Analyst** (chat) answers only from those cited rules. It is a
relay to a separate service; this repository holds the hub, not the model.

**Production:** https://hub.vpszeimhahnu.uk (Vercel, behind Cloudflare Access).
**Analyst service:** https://analyst.vpszeimhahnu.uk (separate repo).

---

## Stack

Next.js 16 App Router (Node runtime) · React 19 · TypeScript strict · Tailwind
CSS v4 · shadcn/ui on `@base-ui/react`. No animation library — motion here is
CSS and `tw-animate-css`, not Framer Motion.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Layout

```
src/
  app/                    routes (see README for the full route table)
  components/             shared UI: home, lookup, ui primitives, vendors
  data/                   curated, committed datasets — see "Data lives here"
  lib/                    domain logic (rules, deferral, coverage, analyst client)
  middleware.ts           Access JWT verification, ingest auth, origin boundary
scripts/                  check-*.mjs guards + run-checks.mjs
docs/plans/corporate-action-hub/   current plan, status, P1 design notes
SOURCES/                  narrative cross-reference document
SPECS/                    historical spec records — see "SPECS is history"
```

---

## Data lives here

Every curated dataset is committed JSON under `src/data/`, with a schema beside
it where one applies. Code imports these files; it does not fetch rules from a
remote source at runtime.

| Path | What it holds |
|---|---|
| `src/data/rules.json` | The rule table. `schema_version: 2`. Vendor × event type × index type, each with `source_ref` and `confidence`. |
| `src/data/screening-rules.json` | Upload screening thresholds. |
| `src/data/glossary.json` | Vendor terminology, surfaced by `glossary-linked-text.tsx`. |
| `src/data/fund-master/` | Franklin fund catalogs and the targeted-fund snapshot. |
| `src/data/methodologies/sources/` | The vendor PDFs that are actually tracked in git. **Currently two**: Solactive Equity Index Methodology v1.20 and VettaFi Index Maintenance Policy v1.1.8. |

### Citation and source integrity

This is the project's core discipline; do not erode it.

- **A claim without a `source_ref` is not a claim.** If no methodology supports
  a rule, leave it absent or mark it `no-rule` / `absent`. Never infer a
  treatment, a lead time, or a calendar from plausibility.
- **Do not invent a citation path.** `source_ref` values that point at PDFs are
  checked against tracked files by `scripts/check-citations.mjs`. A path that
  names a document not in the repo is a defect, not a formatting preference —
  either add the document or leave the field explicitly unset.
- **Unsourceable is a valid terminal state.** Two documented attempts that fail
  leave an entry explicitly unsourceable with the routes tried recorded. That is
  the correct outcome; do not backfill a guess to make a list look complete.
- `SOURCES/index-vendor-methodology.md` is a narrative cross-reference written
  in 2026-04. It predates several changes (it names eight source PDFs that are
  not all present, and describes an older page set). Treat it as background, not
  as authority: `rules.json` plus the tracked PDFs win on any conflict.

### Review calendars are per-index

`src/lib/deferral.ts` models a vendor that does not apply a change
intra-quarter: it carries the change to its next scheduled review, and the
practitioner needs that date.

- **A calendar belongs to one vendor index, not to a vendor.** Indexes under the
  same vendor family differ — the VettaFi New Frontier International and U.S.
  Dividend Select indexes have different cycles; Solactive's differ by index
  too. Never generalize a calendar from a sibling index.
- Calendar entries carry their own `source_ref`. A calendar with no citable
  methodology is left unset.
- Deferral is a **finding, not a gap**. A vendor silent on the event date
  because its review has not come is behaving correctly.

### Unsourced and unknown states are distinct

`provenance` and `confidence` are separate vocabularies and both are enforced at
the relay boundary:

- `provenance`: `measured` · `news-confirmed` · `inferred` · `no-rule`
- `confidence`: `stated` · `inferred` · `absent` · `user-set`

Do not collapse them. `inferred` provenance with `stated` confidence is a
contradiction the review gates will catch.

---

## Analyst request contract

The browser never talks to the Analyst service directly. `src/middleware.ts`
verifies a Cloudflare Access JWT on `/api/ca-analyst/*`; the route handler then
validates the payload with `src/lib/ca-analyst/validate-request.ts` before
relaying to `CA_ANALYST_SERVICE_URL`.

- **Validate before relay, always.** The validator in `validate-request.ts` is
  deliberately outside `route.ts` so `check-*.mjs` can import it under bare
  node. Do not move logic back into the route where no check can reach it —
  that is how the previous `conditions` bug survived.
- **The M4–M6 fields mirror `ca-analyst-service/src/contracts.ts`.** They are
  optional, and both sides must change together. Do not add a field to one repo
  alone.
- **Unknown keys are rejected.** The validator requires every object's keys to
  be a subset of its allowed set, and bounds strings, counts, and enums. Widen
  deliberately, never incidentally.
- **Never bypass or weaken the Access boundary** to make a local flow work.
  Mint a JWT and use the real route. `origin-boundary.ts` exists so the
  pre-activation ACME/certificate-validation window works without opening
  anything else — `pre-activation` is not a general bypass.
- Ingest (`/api/ingest`) uses HTTP Basic auth and is deliberately separate from
  the Access path. Do not unify them.

---

## Checks are the contract

`npm test` runs **every** `scripts/check-*.mjs` guard, not a sample. These are
behavioural assertions, not lint. `check-responsive.mjs` is skipped because it
needs a dev server on `:3100`; run it yourself before claiming a responsive pass.

Consequences that have already bitten this repo:

- **A gate nobody runs is decoration.** An earlier suite ran one check of forty-
  five and reported green while a stale assertion contradicted deliberate
  behaviour.
- **Do not delete or soften a check to get a green build.** If a check encodes
  behaviour that is genuinely obsolete, change the behaviour and the check in
  the same commit, and say why in the commit message.
- **Checks must exercise the real code path.** A check that reimplements the
  rule it is testing proves nothing. Import the module the component uses.

---

## Git and review

- Branch per task: `task/<task-id>`. Open a PR against `main`.
- **Never push to `main`. Never merge your own PR.** Alex merges; Iris and
  `pr_lane` gate dashboard-web, but knowledge-hub is Alex's merge.
- **Never force-push, delete a branch, or deploy.**
- A merge or push to `main` is what triggers Vercel's production deploy. That is
  why `main` is not yours to write to.
- Do not add commit statuses or reviews through the GitHub API; those are
  written by Iris's own code only.
- Commits: `docs(…)`, `feat(…)`, `fix(…)`, `refactor(…)`, `chore(…)`. One
  logical unit per commit.

### Before you call anything done

```bash
npm run lint
npx tsc --noEmit
npm test
```

`npm run build` if you touched anything that compiles into the app. Report the
actual output. Documentation-only changes still get `npm test` — it is cheap and
it catches links and imports that the docs depend on.

---

## Frontend conventions

These are current and enforced; the earlier blanket design mandates were removed.

- **Tailwind only.** Use the semantic tokens (`bg-background`, `text-muted-
  foreground`, `border-border`) rather than raw hex. Inline `style={{}}` is
  acceptable only where a value is genuinely computed at runtime (a chart
  width, a CSS custom property); not as general styling.
- **shadcn/ui primitives first.** Do not hand-roll a select, dialog, or accordion
  when a primitive exists. `components.json` is configured for `@base-ui/react`.
- **TypeScript strict, no `any`.** Model the domain in `src/lib/`; components
  consume those types rather than re-deriving them.
- **Accessibility is not optional.** WCAG 2.1 AA, full keyboard reachability,
  visible focus, `aria-label` or `sr-only` text on icon-only controls, `<th>`
  scopes on data tables.
- No blanket glassmorphism, bento, or 8pt-grid mandate. These pages are dense
  reference material; legibility and scannability win over decoration.

---

## SPECS is history

`SPECS/` holds the Cursor-era spec-inbox/outbox process: templates in
`inbox/` and `outbox/`, delivered PRDs in `approved/`, and shipped work in
`archive/`. The inbox/outbox handoff loop is **no longer the workflow** — it
described a Telegram-driven Cursor handoff that does not exist. Nothing is
waiting in `SPECS/inbox/`, and new work does not arrive there.

Current design and status live in `docs/plans/corporate-action-hub/`. Treat
`SPECS/` as the record of what was already built, and do not revive the folder
protocol.
