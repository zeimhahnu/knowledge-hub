# Feature: Investor Intelligence Browser

> Status: SPEC INBOX
> Created: 2026-04-18
> Requested by: Alex (via Lil Claw)
> Feature ID: `investor-intelligence-browser-v1`
> GitHub Issue: TO BE CREATED

> **Hosting (2026-04-19):** Production is **Vercel** (`https://corporate-action.vercel.app/`). Next.js **Route Handlers** (`src/app/api/...`) are supported. GitHub Actions on `main` runs CI only; merge to `main` triggers **Vercel** deploy. See `SPECS/VERCEL-MIGRATION.md`.

---

## Context

**The idea:** A search-based tool where users type a ticker symbol and instantly see dividend history, stock splits, and upcoming corporate actions — decision-ready intelligence, not raw data.

**Why it matters:** Before buying a stock, an investor needs to know: "Has this company consistently returned cash? What's the split history? When is the next event?"

---

## Data Source

**`yfinance` — FREE, no API key required.**

| Data | Method |
|------|--------|
| Dividend history | `ticker.dividends` |
| Stock splits | `ticker.splits` |
| Combined view | `ticker.actions` |
| Next ex-dividend | `ticker.calendar['Ex-Dividend Date']` |
| Next earnings | `ticker.calendar['Earnings Date']` |
| Dividend rate | `ticker.info['dividendRate']` |
| Dividend yield | `ticker.info['dividendYield']` |
| Last split factor | `ticker.info['lastSplitFactor']` |

**Gaps:** No buyback history, no merger/spin-off records, no special dividend flags.

---

## Layout & Visual Design

**Top-down structure:**

```
┌─────────────────────────────────────────────────────┐
│  [🔍 Search: AAPL]  [Search]                        │
└─────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────┐
│  AAPL  ·  Apple Inc.  ·  $187.42  ·  +1.2%         │
│  Tech  ·  NASDAQ                                       │
└─────────────────────────────────────────────────────┘
              ↓
┌───────────────────┬─────────────────────────────────┐
│  AAPL             │  DIVIDEND HISTORY               │
│  Apple Inc.       │  ● ● ● ● ●  (5-year pattern)   │
│  $187.42          │  $0.24 → $0.26  (↑8% since 2024)│
│  +1.2%            │  Rate: $1.04/yr  Yield: 0.55%  │
├───────────────────┴─────────────────────────────────┤
│  STOCK SPLITS                                        │
│  Aug 31, 2020 — 4:1    Jun 9, 2014 — 7:1           │
│  Feb 28, 2005 — 2:1    Jun 21, 2000 — 2:1          │
├─────────────────────────────────────────────────────┤
│  UPCOMING                                            │
│  📅 Ex-Div: Feb 9, 2026  (in 23 days)              │
│  📅 Earnings: Apr 30, 2026                          │
└─────────────────────────────────────────────────────┘
```

**Styling:**
- Card-based, dark mode default, glassmorphism
- Primary `#007bff`, dark bg `#0f1117`
- Framer Motion fade-in on results
- Lucide icons for calendar/event markers

---

## Interactive Glossary (HOVER TOOLTIPS)

**NOT a separate glossary box.** Jargon terms show a dotted underline → hover reveals tooltip.

**Implementation:** Tippy.js (React tooltip library)

**Terms to tag:**
- `Ex-Dividend` — the date you must own shares BY to get the dividend
- `Dividend Rate` — annualized dividend per share ($/year)
- `Dividend Yield` — dividend as % of current stock price
- `Stock Split` — ratio at which shares are divided (3:1 = you get 3x shares at 1/3 price)
- `Earnings Date` — when the company reports quarterly results

**Tooltip format:**
```
┌─────────────────────────────────┐
│ Ex-Dividend Date                │  ← term (bold)
│ The cutoff date to own shares   │  ← plain English definition
│ and receive the upcoming dividend│
└─────────────────────────────────┘
```

**Design:** Dark tooltip, white text, max-width 220px, 200ms delay, fade animation.

---

## Output Rules: Concise, Direct, No Fluff

**Do:**
- Short, declarative sentences
- Numbers front-loaded ($1.04/yr, not "annualized dividend rate is $1.04")
- Binary conclusions (↑ / ↓ / — for trend)
- One fact per line

**Don't:**
- Paragraphs of explanation
- Qualifiers ("It is worth noting that...")
- Raw data dumps (show ALL dividends? No — show last 5 + trend)
- Educational content (that's what tooltips are for)

**Good example:**
> $0.24 → $0.26 → $0.26 → $0.26 → $0.26 (2020-2025)
> Yield: 0.55%  |  Rate: $1.04/yr  |  ↑ 8% from 2024

**Bad example:**
> "Apple has consistently paid dividends over the past five years, with the most recent dividend being $0.26 per share, representing a yield of approximately 0.55% based on the current stock price..."

---

## Technical Implementation

### API Route
```
src/app/api/corporate-actions/[ticker]/route.ts
```

**Flow:**
1. User types ticker → hits API route
2. Server runs yfinance script via `exec`
3. Returns JSON with dividends, splits, calendar, info
4. Client renders with Framer Motion

**Cache:** In-memory Map with 5-minute TTL per ticker.

### Tooltip Setup
```bash
npm install @tippyjs/react
```

```tsx
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'

// Wrap jargon terms:
<Tippy content="The cutoff date to own shares and receive the upcoming dividend">
  <span className="dotted-underline cursor-help">Ex-Dividend</span>
</Tippy>
```

**Styling:** Override tippy CSS with dark theme:
```css
.tippy-box { background: #1a1a2e; color: #fff; }
.tippy-content { padding: 8px 12px; font-size: 13px; }
```

---

## GitHub Issue Workflow

| Step | Action |
|------|--------|
| 1 | Lil Claw creates GitHub Issue in `knowledge-hub` |
| 2 | Cursor reads SPECS/inbox + Issue → drafts PRD |
| 3 | PRD pushed to SPECS/outbox, Issue updated |
| 4 | Lil Claw reviews → approves in Telegram |
| 5 | Issue moved to "In Progress" |
| 6 | Cursor implements → git push |
| 7 | GitHub Actions CI runs lint + tsc |
| 8 | On merge to `main` → **Vercel** production deploy |
| 9 | Issue closed, PRD archived |

---

## Acceptance Criteria

- [ ] User searches ticker → sees dividend history (last 5 + trend)
- [ ] Stock splits shown: date + ratio (e.g., "Aug 31, 2020 — 4:1")
- [ ] Upcoming events with days countdown
- [ ] Jargon terms have dotted underline → hover shows tooltip
- [ ] Output is concise: numbers, trends, no paragraphs
- [ ] Error state for invalid ticker
- [ ] 5-minute cache prevents rate limiting
- [ ] Dark mode, responsive, Framer Motion animations
- [ ] TypeScript compiles, ESLint passes, CI passes
- [ ] GitHub Issue tracks this from spec → deploy

---

## Related

- Design system: [[market-intel/wiki/goop/design-system.md]]
- Glossary wiki: [[market-intel/wiki/goop/glossary.md]] (source definitions for tooltips)
- yfinance MCP: already configured in OpenClaw