# Feature: Investor Snapshot — Data Source (Vercel-Compatible)

> Status: SPEC INBOX
> Created: 2026-04-19
> Assigned to: Cursor
> Feature ID: `investor-snapshot-data`
> Related: SPECS/outbox/investor-intelligence-browser-prd.md

---

## Context

The Investor Snapshot page exists at `/investors/`. It shows:
- Dividend history (last 5 + trend)
- Stock splits (date + ratio)
- Upcoming events (ex-div date, earnings)

**The problem:** Cursor doesn't know where the data comes from. The PRD suggests yfinance (Python), but Python subprocess won't work inside Vercel's Node.js serverless functions.

Alex's instruction: **Figure it out yourself. Use Vercel to host the data.**

---

## Your Task

Research and implement a data source for the Investor Snapshot that works on Vercel serverless. The data must include:
1. Dividend history for a ticker (dates + amounts)
2. Stock split history (dates + ratios)
3. Next ex-dividend date
4. Current stock price

### Option A: Yahoo Finance JSON API (Recommended — No API Key Required)

Yahoo Finance has a public JSON endpoint accessible from Vercel serverless:

```
https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}
```

Returns:
- `chart.result[0].events.dividends` — dividend history
- `chart.result[0].events.splits` — stock split history
- `chart.result[0].meta.regularMarketPrice` — current price
- `chart.result[0].meta.previousClose` — previous close

**Free, no API key, works from Vercel server-side.**

Test it:
```bash
curl "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=5y"
```

### Option B: Alpha Vantage (Free Tier)

- 25 requests/day free, 5 requests/minute
- Requires API key (free at alphavantage.co)
- Endpoints: `TIME_SERIES_MONTHLY_ADJUSTED` (dividends), `OVERVIEW` (splits)

### Option C: Twelve Data

- 800 API credits/day free
- Requires API key (free at twelvedata.com)
- Better documentation than Alpha Vantage

### Option D: Finnhub

- 60 calls/minute free
- Requires API key (free at finnhub.io)

---

## What to Do

1. **First, test Option A** — the Yahoo Finance public JSON API. Confirm it works from a serverless context (not blocked by CORS when called server-side in Next.js Route Handler).

2. **Update the existing API route** at `src/app/api/investors/quote/route.ts` to use the chosen data source.

3. **Update the Investor Snapshot components** to match the data shape returned.

4. **Document the data source** in the SPEC.

---

## Data Shape Expected

The Investor Snapshot components expect:

```ts
interface InvestorTickerResponse {
  ticker: string;
  companyName: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dividends: Array<{ date: string; amount: number }>; // last 5
  splits: Array<{ date: string; ratio: string }>;   // e.g. "4:1"
  nextExDivDate: string | null;
  nextEarningsDate: string | null;
  dividendRate: number;       // annualized
  dividendYield: number;       // as decimal
  lastSplitDate: string;
  lastSplitRatio: string;
}
```

---

## Constraints

- **No Python subprocess** — must work in Vercel Node.js serverless
- **No API key required for basic Yahoo Finance approach** (Option A)
- **Graceful fallback** — if data source fails, show a clear error, not a crash
- **Cache responses** — use `router.setRequestHeader('Cache-Control', 's-maxage=300')` or Next.js cache

---

## Acceptance Criteria

- [ ] Investor Snapshot at `/investors/` returns real dividend + split data for tickers like AAPL, MSFT, JPM
- [ ] Data sourced from Yahoo Finance JSON API (Option A) or equivalent free API
- [ ] No Python, no local script — works on Vercel serverless
- [ ] Error handling: invalid ticker → clear error message
- [ ] Cached (5-minute TTL minimum)
- [ ] TypeScript + ESLint clean
- [ ] Deployed to Vercel
