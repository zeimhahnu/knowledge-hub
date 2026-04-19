# Index Vendor Intelligence — Knowledge Hub

A reference tool for system analysts and data engineers who work with corporate action projection data from multiple index vendors (MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, VettaFi).

## Purpose

Corporate action projection data never matches across all vendors. Same event, same security — one vendor shows it today, another shows it next week, a third ignores it entirely. This tool explains why.

## Architecture

```
knowledge-hub/
├── SOURCES/
│   └── index-vendor-methodology.md   ← CANONICAL SOURCE OF TRUTH
│                                       All vendor methodology cross-referenced
│                                       against source PDFs. Cursor reads this.
├── src/
│   └── app/
│       ├── page.tsx                   ← Homepage (decision tree + scenarios)
│       └── vendors/
│           ├── page.tsx               ← Vendor comparison (main reference)
│           ├── iso-taxonomy/
│           │   └── page.tsx           ← ISO 20022 CAEV taxonomy
│           └── event-extraction/
│               └── page.tsx           ← Raw parameter extraction from PDFs
└── SPECS/                             ← Feature specs for Cursor
```

## For Cursor Agent

**Read this first:** `SOURCES/index-vendor-methodology.md`

This is the single source of truth. It is cross-referenced against all 8 source PDFs. When implementing features, answering questions, or resolving any ambiguity about vendor behavior — this document is authoritative.

### Source PDFs (in `market-intel/wiki/goop/SOURCES/`)
- `msci-corporate-events-methodology-2026.pdf` → MSCI
- `sp-equity-indices-policies-practices.pdf` → S&P DJI
- `ftse-russell-corporate-actions-guide.pdf` → FTSE Russell
- `stoxx-calculation-guide-apr-2026.pdf` → STOXX
- `solactive-gpr-global-100-2026.pdf` → Solactive
- `morningstar-corporate-action-methodology-2026.pdf` → Morningstar
- `vettafi-corporate-action-initiators.pdf` → VettaFi
- `vettafi-index-maintenance-policy.pdf` → VettaFi

### Key Coverage Data
- **T-5 coverage period** for all vendors
- Data as of close covers next 5 business days
- **Solactive GPR Global 100: Semi-annual review** (Jan/Jun) — events can miss an entire cycle

## Development

```bash
npm install
npm run dev      # localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # TypeScript check
```

## Deployment

Pushed to `main` → **Vercel** builds and deploys the app (Next.js serverless, no static export).

**Production:** https://corporate-action.vercel.app/

GitHub Actions on `main` runs lint, typecheck, and `npm run build` (see `.github/workflows/deploy.yml`).

**Agent handoff (Goop / OpenClaw):** `SPECS/HANDOFF-OPENCLAW-GOOP-VERCEL.md`

### Investor snapshot data

The `/investors/` page and `GET /api/investors/quote?ticker=SYMBOL` load delayed market data from **Yahoo Finance** over HTTPS (chart `v8/finance/chart` for dividends, splits, and meta price; `v10/finance/quoteSummary` for sector, dividend rate/yield, and calendar hints). There is no Python or subprocess on Vercel. See `SPECS/approved/prd-investor-snapshot-data-source.md` for the API contract (`InvestorTickerResponse` in `src/lib/investors/types.ts`).

## Live Pages

| Page | URL (on production host) |
|------|-----|
| Homepage (Decision Tree) | `/` |
| Vendor Reference | `/vendors/` |
| ISO CAEV Taxonomy | `/vendors/iso-taxonomy/` |
| Event Extraction | `/vendors/event-extraction/` |
| API health check | `/api/test/` |
| Investor snapshot (by ticker) | `/investors/` |

## Event Types Covered

1. Cash Dividend (Regular)
2. Special Cash Dividend
3. Stock Dividend
4. Bonus Issue
5. Stock Split / Consolidation
6. Spin-off / Demerger
7. Rights Issue
8. Secondary Offering
9. Private Placement
10. Return of Capital
11. Mergers & Acquisitions (Target Deletion)
12. Tender Offers
13. Bankruptcy / Delisting