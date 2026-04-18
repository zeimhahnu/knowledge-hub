# Feature: Investor Intelligence Browser

> Status: SPEC INBOX — Pending PRD from Cursor
> Created: 2026-04-18
> Requested by: Alex (via Lil Claw)
> Feature ID: `investor-intelligence-browser-v1`

---

## Context

**The idea:** A search-based tool where users type a ticker symbol and instantly see:
1. **Dividend history** — pattern, frequency, yield
2. **Stock split history** — all splits, dates, ratios
3. **Upcoming corporate actions** — ex-dividend dates, earnings, scheduled events

**Why it matters:** Before buying a stock, an investor needs to know: "Has this company consistently returned cash? What's the split history? When is the next event?"

This transforms raw financial data into **decision-ready intelligence**.

---

## Data Source: yfinance (FREE, No API Key Required)

**The verdict:** `yfinance` Python package is the best free source for this.

| What | yfinance gives | Notes |
|------|----------------|-------|
| Dividend history | `ticker.dividends` | Back to 1987+ for major stocks |
| Stock splits | `ticker.splits` | Full history with ratios |
| Combined view | `ticker.actions` | Dividends + splits in one table |
| Ex-dividend date | `ticker.calendar['Ex-Dividend Date']` | Next upcoming |
| Earnings date | `ticker.calendar['Earnings Date']` | Next quarter |
| Dividend rate | `ticker.info['dividendRate']` | Annualized |
| Dividend yield | `ticker.info['dividendYield']` | Percentage |
| Last split factor | `ticker.info['lastSplitFactor']` | e.g., "3:1" |

**Coverage:** US stocks, UK stocks (`.L`), Malaysian stocks (`.KL`), Hong Kong (`.HK`), and 40+ other exchanges.

**Import:** `uvx --with yfinance python3 -c "import yfinance as yf; ..."`

### What yfinance does NOT have (gaps to acknowledge)
- Share buyback programs
- Merger/spin-off history
- Special one-time dividends (flagged separately)
- Options assignment/settlement dates

---

## Design Direction

**Reference:** Use existing `CorporateActionCard.tsx` pattern from design-system.md.

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [🔍 Search bar: Enter ticker...]           │
└─────────────────────────────────────────────┘
        ↓ (after search)
┌─────────────────────────────────────────────┐
│  AAPL — Apple Inc.          $187.42  +1.2%  │
│  Tech · NASDAQ                    Sector    │
├─────────────────────────────────────────────┤
│  DIVIDEND HISTORY          [chart: timeline] │
│  ● ● ● ● ● ● pattern                        │
│  $0.24 → $0.25 → $0.26 (2024-2025)          │
│  Yield: 0.55%  |  Rate: $1.04/yr            │
├─────────────────────────────────────────────┤
│  STOCK SPLITS                    [timeline]  │
│  2020: 4:1  ·  2014: 7:1  ·  2005: 2:1      │
├─────────────────────────────────────────────┤
│  UPCOMING EVENTS                            │
│  📅 Ex-Div: Feb 9, 2026  (in 23 days)       │
│  📅 Earnings: Apr 30, 2026                  │
└─────────────────────────────────────────────┘
```

**User flow:**
1. User types ticker (e.g., "AAPL") and presses Enter
2. Frontend calls Next.js API route `/api/corporate-actions/[ticker]`
3. API route runs yfinance script → returns JSON
4. Frontend renders the three sections with animation

---

## Technical Notes

**Next.js API route pattern:**
```
src/app/api/corporate-actions/[ticker]/route.ts
```
- Calls: `uvx --with yfinance python3 <script>` via `exec`
- Returns: structured JSON (dividends, splits, calendar, info)
- Rate limit: Yahoo Finance is rate-limited; cache results for 5 minutes

**Cache strategy:**
- Server-side: next-runtime cache or in-memory Map for 5 min
- Ticker symbol validation: reject empty/invalid before calling yfinance

**Error handling:**
- Unknown ticker → "Ticker not found. Check symbol and try again."
- Rate limited → "Data temporarily unavailable. Try again in a moment."
- No dividend history → "No dividend data available for this ticker."

---

## Acceptance Criteria

- [ ] User can search any valid US ticker and see dividend history
- [ ] Stock splits shown with date + ratio (e.g., "Aug 31, 2020 — 4:1")
- [ ] Upcoming ex-dividend date displayed with days-countdown
- [ ] Data refreshes on each new search (no stale data)
- [ ] Error state for invalid tickers
- [ ] Responsive at mobile / tablet / desktop
- [ ] Dark mode compatible with design system tokens
- [ ] TypeScript compiles, ESLint passes

---

## Related

- Design system: [[market-intel/wiki/goop/design-system.md]]
- Corporate Actions wiki: [[market-intel/wiki/goop/corporate-actions.md]]
- yfinance MCP (already configured in OpenClaw for cron sessions)