# CLAUDE.md — Cursor Agent Instructions

## Read This First

Before making any changes, read:
```
SOURCES/index-vendor-methodology.md
```

This is the **canonical source of truth** for all vendor corporate action methodology. It is cross-referenced against all 8 source PDFs. Any claim about vendor behavior must be traceable to this document.

## What This Project Is

A reference tool for system analysts and data engineers working with corporate action projection data from MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, and VettaFi.

**Core problem:** Same event, same security, different projection data across vendors. This tool explains why.

## Architecture

```
knowledge-hub/
├── SOURCES/
│   └── index-vendor-methodology.md   ← READ THIS FIRST
├── src/app/
│   ├── page.tsx                     ← Homepage: decision tree + scenarios
│   └── vendors/
│       ├── page.tsx                ← Main vendor comparison reference
│       ├── iso-taxonomy/page.tsx   ← ISO 20022 CAEV codes
│       └── event-extraction/page.tsx
└── SPECS/                           ← Feature specs
```

## Key Rules

1. **All vendor methodology comes from** `SOURCES/index-vendor-methodology.md` — not from memory, not from guessing
2. **T-5 coverage period** — data received on day T reflects T-1 close, covers T+4 (5 business days)
3. **Solactive GPR Global 100 is semi-annual** — Jan/Jun reviews only, events can miss a cycle
4. **STOXX is the unique outlier** on multiple events:
   - Special cash dividend: always adjusts PR (no threshold)
   - Stock dividend: 4 subtypes, 4 different PAF formulas
   - M&A: requires BOTH ≥85% acquired AND Float <10%
   - Tender offers: uses same M&A methodology (not a separate threshold)
5. **FTSE is the only vendor requiring advance notice** (2 trading days) before deleting for tender offers
6. **S&P is most aggressive** for M&A deletion: Float <15% alone can trigger (before 90% acceptance)

## Common Errors to Avoid

- Do NOT say "STOXX treats special dividends the same as ordinary" — they don't. STOXX adjusts PR for all special dividends.
- Do NOT say "Solactive applies events on the same day as other vendors" — GPR Global 100 is semi-annual.
- Do NOT say "MSCI has a fixed percentage threshold for M&A deletion" — MSCI uses deal-unconditional, no fixed %.
- Do NOT add a new vendor event without checking if it's already covered in `index-vendor-methodology.md`.

## Design Guidelines

- Dark theme, Tailwind CSS, shadcn/ui components
- Mobile-first responsive design
- Framer Motion for animations
- Lucide React for icons
- No `any` types in TypeScript

## Deployment

Push to `main` → GitHub Pages auto-deploys to:
**https://zeimhahnu.github.io/knowledge-hub/**

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript check
```

## Source PDFs (for reference)

```
market-intel/wiki/goop/SOURCES/
├── msci-corporate-events-methodology-2026.pdf
├── sp-equity-indices-policies-practices.pdf
├── ftse-russell-corporate-actions-guide.pdf
├── stoxx-calculation-guide-apr-2026.pdf
├── solactive-gpr-global-100-2026.pdf
├── morningstar-corporate-action-methodology-2026.pdf
├── vettafi-corporate-action-initiators.pdf
└── vettafi-index-maintenance-policy.pdf
```
