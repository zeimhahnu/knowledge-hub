# Feature: Bloomberg Terminal Output — Projection Gap Simulator

> Status: SPEC INBOX
> Created: 2026-04-19
> Assigned to: Cursor
> Feature ID: `bloomberg-output-v1`

---

## Context

The Projection Gap Simulator currently outputs verbose prose paragraphs. Alex wants sharp, Bloomberg-terminal style output — numbers front-loaded, no filler text.

**Reference:** Spec rule in `SPECS/inbox/feature-investor-intelligence-browser.md`:
> "Output is concise: numbers, trends, no paragraphs. Like a Bloomberg terminal, not a textbook."

---

## What "Bloomberg Terminal Style" Means

### Rules

1. **Numbers first** — lead with the data, not the explanation
2. **Binary conclusions** — use `↑` `↓` `—` for directional signals
3. **One fact per line** — no compound sentences explaining context
4. **No paragraphs** — hypothesis cards should be dense, not prose
5. **Bolding on numbers** — make key values scannable
6. **Verbs over adjectives** — "Deducted on ex-date" not "the value is deducted"

### DO vs DON'T

**DO:**
```
$0.24 → $0.26 → $0.26 → $0.26 (2020–2025)
Yield: 0.55% | Rate: $1.04/yr | ↑ 8% from 2024
T-5 window: Apr 14 → Apr 19 (5 bdays)
MSCI: absent | S&P: present | FTSE: absent
```

**DON'T:**
> "A large special distribution can change how vendors classify the event and whether it is deferred or treated across PR vs TR series."

---

## Implementation

### File to change: `src/components/projection-gap-simulator.tsx`

The results step (step 5, `step === 5`) renders `result.hypotheses` and `result.summary`.

### Changes to `result.summary` (top-line box)

**Before:**
```
You described a Mandatory — M&A with effective date Apr 15. Projection files as of Apr 10 appear missing for: MSCI, FTSE Russell. Present from: S&P DJI, STOXX. Context: SPXX acquisition of Target Co.
```

**After (Bloomberg style):**
```
MANDATORY · M&A · Apr 15 eff
MSI + FTB: ABSENT ←→ SPX + STX: PRESENT
T-5: Apr 10 → Apr 15 (5 bdays) | Notes: SPXX / Target Co
```

Format: `CATEGORY · EVENT · EFF DATE | MISSING ←→ PRESENT | T-5 WINDOW | CONTEXT`

### Changes to hypothesis cards

Each card currently shows:
- `h.relevance` (badge: high/medium/low likelihood)
- `h.title` (bold heading)
- `h.explanation` (verbose paragraph)
- `h.appliesToVendors` (vendor list)

**New card layout:**

```
┌──────────────────────────────────────────────────┐
│ HIGH likelihood                                   │
│ T-5 WINDOW EXCEEDED                              │
│                                                  │
│ As-of Apr 10 > 5 bdays before eff Apr 19.        │
│ Gap: 7 bdays beyond T-5 coverage.                │
│                                                  │
│ Vendors likely missing: MSI, FTB                  │
└──────────────────────────────────────────────────┘
```

**Rules per card:**
1. Title in ALL CAPS — no sentence case
2. Explanation: max 2 lines, each line is ONE fact
3. Vendor list: comma-separated abbreviations (MSI, SPX, FTB, STX, SOL, MRN, VTF)
4. Use abbreviations — not full vendor names
5. Add a signal icon: `⚠` for high, `→` for medium, `○` for low

### Vendor abbreviation map

| Vendor | Abbrev |
|--------|--------|
| MSCI | MSI |
| S&P DJI | SPX |
| FTSE Russell | FTB |
| STOXX | STX |
| Solactive | SOL |
| Morningstar | MRN |
| VettaFi | VTF |

### Add signal indicators to summary

In the summary box, add colored signal dots:
- `🔴` = high relevance (red)
- `🟡` = medium relevance (amber)
- `⚪` = low relevance (muted)

Display count: `🔴 ×2  🟡 ×1`

### Typography tweaks

- Card title: `text-base font-bold tracking-wide uppercase`
- Explanation lines: `text-sm font-mono` (monospace for numbers/sigils)
- Vendor badges: compact pill style, no full names

---

## Acceptance Criteria

- [ ] Summary box uses `CATEGORY · EVENT · DATE | MISSING ←→ PRESENT | T-5` format
- [ ] All hypothesis titles in ALL CAPS
- [ ] No paragraph longer than 2 lines
- [ ] Vendor abbreviations used (MSI, SPX, FTB, STX, SOL, MRN, VTF)
- [ ] Signal icons (🔴🟡⚪) appear in summary
- [ ] No new explanatory paragraphs added — only tightened existing content
- [ ] TypeScript compiles, ESLint passes
- [ ] Git push → GitHub Pages deploys
