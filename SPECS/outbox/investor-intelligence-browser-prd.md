# PRD: Investor Intelligence Browser

> Status: **DRAFT** — Pending Alex approval  
> Created: 2026-04-19  
> Created by: Cursor Agent  
> GitHub Issue: [#3 — Investor Intelligence Browser — Dividend/Split/Event Lookup](https://github.com/zeimhahnu/knowledge-hub/issues/3)  
> Source spec: `SPECS/inbox/feature-investor-intelligence-browser.md`  
> Feature ID: `investor-intelligence-browser-v1`

---

## Executive Summary

The **Investor Intelligence Browser** is a ticker-first experience: the user enters a symbol and receives **decision-oriented** readouts of **recent dividend cadence**, **split history**, and **near-term calendar hooks** (ex-dividend, earnings), using **free market data** (per inbox spec: `yfinance` / equivalent). Copy is **tight and numeric**—no essay blocks—while **inline glossary** explains jargon on demand.

This extends the knowledge hub from **index-vendor methodology** toward **single-name investor context**, without pretending to replace official vendor notices or broker data.

---

## User Story

**As an** investor or analyst doing quick pre-trade checks  
**I want to** type a ticker and see dividends, splits, and upcoming dates in one glance  
**So that** I can judge cash return behaviour and corporate-action noise **before** deep-diving filings or vendor feeds.

---

## Design Specification

### Layout & Structure

1. **Route:** New page under the app, e.g. `/investors/` (exact path TBD with Goop). Production is served from the **site root** on Vercel (no `basePath`; use normal `next/link` and `/` paths).
2. **Top:** Search field (ticker) + submit; optional exchange suffix handling documented in tech notes.
3. **Header strip:** Symbol, company name (if available), last price / day change (if available), sector / exchange chips — **one row**, truncates gracefully on mobile.
4. **Body (card stack):**
   - **Dividend block:** Last N payments (inbox: **5**), compact trend (↑/↓/—), annualized rate and yield if available, **no full historical dump**.
   - **Splits block:** Most recent splits as **date — ratio** list (inbox shows 4:1 style).
   - **Upcoming block:** Ex-dividend and earnings (if calendar provides), with **countdown** in days where a reliable calendar date exists.
5. **Footer:** Disclaimer that data is third-party / delayed; link to Vendor Reference for **index** methodology (out of scope for this page).

**Responsive:** Mobile-first; cards stack; search full-width on small screens.

### Visual Design

**Must follow** `.cursorrules` and the existing hub: **semantic Tailwind tokens** (`bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `text-primary`) — **do not** introduce hardcoded hex palettes from the inbox sketch (`#007bff`, `#0f1117`). Glass/bento feel should match `SurfaceSection` and current homepage patterns.

- **Typography:** Headline `text-2xl` / section titles `text-sm font-semibold`; body numeric lines `text-sm` / `tabular-nums` where helpful.
- **Spacing:** 8pt grid (`gap-4`, `p-6`).
- **Motion:** Framer Motion **subtle** entrance on results (stagger optional); respect reduced-motion preference where feasible.

### Components

1. **`InvestorSearchBar`** — input, submit, loading, disabled while in-flight; keyboard submit.
2. **`InvestorQuoteStrip`** — symbol meta row; skeleton while loading.
3. **`DividendSummaryCard`** — last-5 + trend + rate/yield line; empty state if no dividends.
4. **`SplitHistoryCard`** — dated ratio list; empty state.
5. **`UpcomingEventsCard`** — calendar rows + countdown; partial data state.
6. **`JargonTip`** — **dotted underline** term + accessible tooltip (see Technical: prefer shadcn Tooltip over Tippy to stay aligned with “shadcn primitives first”).

### States

- **Default:** Empty search, short helper copy + example tickers (non-financial-advice wording).
- **Loading:** Skeletons on strip + cards; no layout jump.
- **Success:** Populated cards per rules above.
- **Partial:** Some fields missing from provider → show “—” + one-line reason in muted text.
- **Error:** Invalid ticker / no data / upstream failure → clear message + retry; no stack traces.
- **Rate-limited / cache hit:** Silent benefit (see caching); optional subtle “Updated Xm ago” if product wants it (optional stretch).

---

## Technical Specification

### Hosting & data runtime (updated 2026-04-19)

**Production:** **Vercel** — Next.js **serverless Route Handlers** are supported (no `output: "export"`). Smoke route: `GET /api/test/`. Details: `SPECS/VERCEL-MIGRATION.md`.

The inbox sketch still proposes **`exec` of a local Python `yfinance` script** from a Route Handler. That pattern is **not** a good fit for Vercel’s default Node serverless runtime (no bundled Python, subprocess/child-process constraints, cold starts). **Pick one data path before build** (Alex/Goop sign-off):

| Option | Pros | Cons |
|--------|------|------|
| **A. Separate backend** (Cloudflare Worker, small VPS, etc.) with `GET /quote?ticker=` | Real `yfinance` or any stack, caching, secrets isolated | Second service, CORS, auth/rate limits |
| **B. Next Route Handler + HTTP** to a hosted quotes API (vendor / exchange / paid) | Single Vercel deploy for the app | Keys, cost, licensing, ToS |
| **C. Vercel-native data** (e.g. serverless-friendly HTTP client only; no Python subprocess) | One repo, fits current deploy | May not be `yfinance` as-is |
| **D. Local-only demo** | Fast prototype via `npm run dev` + local API | Not on production |

**Recommendation:** Prefer **A** or **B** for `yfinance`-equivalent data unless we adopt a JS-only market data client; document the chosen path in README and Issue #3 before coding.

### Data layer (once runtime exists)

- **Primary source (per inbox):** Python `yfinance` (or equivalent maintained binding) returning structured JSON: dividends series, splits series, `info` fields, `calendar` where present.
- **Known gaps (must surface in UI copy):** No buyback history, no merger/spin-off catalogue, no guaranteed “special dividend” flag — do not imply completeness.
- **Caching:** **5-minute TTL per ticker** (in-memory on the process that runs the fetch, or KV if on Workers) to reduce upstream hammering; document cold-start behaviour if serverless.

### Tooltip / glossary implementation

- **Preferred:** **shadcn Tooltip** (or Radix Tooltip already in stack) — keyboard focusable, `aria-describedby`, themeable with CSS variables.
- **Terms (minimum):** Ex-Dividend Date, Dividend Rate, Dividend Yield, Stock Split, Earnings Date — definitions short and plain English (can align with `SOURCES` / wiki glossary where overlap exists).

### Dependencies

- **If Tippy is avoided:** no `@tippyjs/react` unless Goop overrides — prefer shadcn tooltip.
- **Python side (if Option A):** version-pinned requirements for `yfinance`; health check endpoint.

### File changes (indicative — final paths after hosting decision)

- `src/app/investors/page.tsx` — page shell + client fetch to chosen API.
- `src/components/investors/*` — cards above.
- `src/lib/investors/*` — types for DTO, formatting helpers (dates, ratios, countdown).
- Navigation: add link from home quick links + optional header nav pattern used elsewhere.

### API / Data schema (DTO sketch)

```ts
// Illustrative — tighten during implementation
type InvestorTickerResponse = {
  ticker: string;
  fetchedAt: string; // ISO
  quote?: { name?: string; price?: number; changePct?: number; sector?: string; exchange?: string };
  dividends: { date: string; amount: number }[]; // last N chronological
  splits: { date: string; ratio: string }[]; // e.g. "4:1"
  calendar?: { exDividendDate?: string; earningsDate?: string };
  metrics?: { dividendRate?: number; dividendYield?: number };
  warnings: string[]; // e.g. "calendar incomplete"
};
```

---

## Implementation Plan

1. **Architecture gate:** Confirm Option A/B/C/D with Alex/Goop; update Issue #3 + README with the chosen **production** data path (Vercel hosts the app; data may still be a separate API).
2. **Scaffold page** `/investors/` with empty states + disclaimer + navigation.
3. **Implement data client** against the chosen API contract; strict TypeScript types + Zod parse if JSON from Python.
4. **Build UI cards** per design spec; Framer Motion polish; responsive pass.
5. **JargonTip** coverage for all bolded jargon in UI.
6. **QA:** invalid ticker, illiquid names, missing calendar; `npm run lint`, `npx tsc --noEmit`.
7. **Post-approval:** merge to `main`, verify on **Vercel** production URL (paths from site root, e.g. `/investors/`).

---

## Acceptance Criteria

- [ ] User can enter a ticker and receive **dividend last-5 + trend**, **splits list**, and **upcoming** ex-div / earnings when data exists.
- [ ] Copy matches **concise output rules** from inbox (numbers first, no paragraphs, binary trend markers).
- [ ] **Jargon** terms use dotted underline + **accessible** tooltip (keyboard + screen reader).
- [ ] **Invalid / unknown ticker** and **upstream errors** show a clear error state with retry.
- [ ] **Caching** behaviour (5-minute TTL per ticker) implemented on the server/runtime that performs fetches.
- [ ] **Visual:** dark semantic tokens, card layout, motion subtle; **no hardcoded hex** colours from inbox sketch.
- [ ] **Responsive** layouts at `sm` / `md` breakpoints.
- [ ] **Accessible:** focus order, tooltips, form labels, live region or polite announcement for errors (exact pattern in implementation).
- [ ] **CI:** `npm run lint` and `npx tsc --noEmit` pass.
- [ ] **Documentation:** README + Issue #3 updated with **how production fetches data** on Vercel (Route Handlers vs external API).

---

## Verification Steps

1. `npm run dev` — page loads, search works against chosen backend.
2. `npx tsc --noEmit` — passes.
3. `npm run lint` — passes.
4. Manual browser matrix: valid ticker, invalid ticker, ticker with no dividends, ticker with sparse calendar.
5. After merge: confirm **production** on Vercel matches the chosen data architecture (Next API vs external backend).

---

## Out of Scope (v1)

- Buybacks, M&A, spin-offs, full ISO CAEV taxonomy (explicitly flagged gaps in inbox).
- Investment advice, price targets, or valuation opinions.
- Replacing vendor methodology pages (`/vendors/`).

---

## References

- Inbox: `SPECS/inbox/feature-investor-intelligence-browser.md`
- Issue: GitHub `#3`
- Design rules: `.cursorrules` (semantic colour, shadcn-first, Tailwind-only components)
- Hub context: `README.md`, `SOURCES/index-vendor-methodology.md` (for glossary tone alignment only)
