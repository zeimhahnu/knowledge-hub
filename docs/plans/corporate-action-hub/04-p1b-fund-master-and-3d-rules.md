# P1b — Franklin ETF fund master and 3-D rules

**Task:** `[task-2026-09-04-ca-hub-p1b-fund-master-design]`  
**Status:** implementation-ready; design only  
**As-of:** 2026-09-04  
**Parent:** `../../../SPECS/corporate-action-hub-revamp-design-2026-09-01.md` §§5b, 5c, 7a, 12, 14 risk 3

## 1. Boundary and decisions

P1b adds a committed, dated Franklin Templeton ETF reference snapshot and a deterministic resolver from selected fund to index construction to applicable vendor/event rules. It does not discover events, send alerts, fetch vendors at build time, or implement the service/UI.

Franklin Templeton is the initial spine. VettaFi is explicitly **excluded from the first P1b slice**, not treated as a data-quality blocker. Solactive rows are permitted only when the source identifies the specific product/index and coverage; no universal Solactive coverage claim is valid.

The design source describes the FT universe as approximately 68 US-listed funds by recollection versus FT's stated “75+ ETFs” in June 2026. This document intentionally makes no catalog/count claim: the snapshot's acquisition run must resolve and record the authoritative listing as-of date. Raw source evidence for this design is archived at `agents/goop/memory/audit/task-2026-09-04-ca-hub-p1b-fund-master-design-raw.json`.

## 2. Repository files

| File | Responsibility |
| --- | --- |
| `src/data/fund-master/ft-etf-snapshot-YYYY-MM-DD.json` | Immutable committed records and acquisition metadata; never overwritten. |
| `src/data/fund-master/index.ts` | Loads the selected dated snapshot and exports typed records. |
| `src/lib/fund-master/types.ts` | TypeScript contracts below; no network code. |
| `src/lib/ca-rules/resolve-3d.ts` | Pure fund → index → index type → rule resolution, with P0 fallback. |
| `src/data/rules.json` | Existing P0 2-D rules; unchanged except a later, separately reviewed 3-D extension. |
| `scripts/check-fund-master.mjs` | No-network schema, uniqueness, date, source, and resolver assertions. |
| `scripts/acquire-ft-etf-snapshot.mjs` | Explicit operator-run acquisition only; writes raw response before synthesis and requires source URLs. Not called by build. |

The first snapshot should be the smallest reviewed FT ETF catalog needed by the acceptance journey, while retaining a record for every acquired product and an explicit `status` for unresolved metadata. Do not silently omit a product.

## 3. TypeScript schemas

```ts
export type IndexType =
  | "market-cap-weighted" | "float-adjusted-cap-weighted"
  | "price-weighted" | "equal-weighted" | "fundamental-weighted"
  | "capped-factor" | "thematic-custom" | "fixed-income" | "unknown";

export type Confidence = "high" | "medium" | "low" | "unresolved";

export interface FundMasterSource {
  url: string;                 // https URL, exact fetched page/PDF
  publisher: string;
  sourceType: "official-fund" | "official-index" | "methodology" | "regulatory" | "secondary";
  retrievedAt: string;         // YYYY-MM-DD
}

export interface FundMasterRecord {
  ticker: string;
  name: string;
  isin: string | null;
  underlying_index: string | null;
  index_provider: string | null;
  index_type: IndexType;
  universe: string | null;     // region, country, theme, or fixed-income scope
  weighting: string | null;    // source wording, not an inferred synonym
  reconstitution_frequency: string | null;
  inception_date: string | null;
  sources: FundMasterSource[];
  source_as_of: string;        // YYYY-MM-DD: facts' effective date
  confidence: Confidence;
  missing_fields: Array<keyof Pick<FundMasterRecord,
    "isin" | "underlying_index" | "index_provider" | "universe" | "weighting" |
    "reconstitution_frequency" | "inception_date">>;
  status: "active" | "closed" | "metadata-incomplete";
}

export interface FundMasterSnapshot {
  schemaVersion: 1;
  snapshotDate: string;
  provider: "Franklin Templeton";
  records: FundMasterRecord[];
  acquisitionSources: FundMasterSource[];
  excludedProviders: string[]; // first snapshot includes "VettaFi"
}

export interface Rule3DKey { vendor: string; event_type: string; index_type: IndexType; }
export interface ResolvedRule3D {
  key: Rule3DKey;
  treatment: string;
  coverageLeadDays: number | null;
  ruleRefs: string[];
  sources: FundMasterSource[];
  provenance: "structured-rule" | "p0-2d-fallback" | "no-rule";
}
```

Validation is strict: unique uppercase tickers; ISIN format when present; ISO dates; non-empty HTTPS sources for every resolved field; `missing_fields` exactly equals null metadata fields; `source_as_of` cannot be after `snapshotDate`. A low-confidence or incomplete record remains visible and cannot resolve to a stronger claim.

## 4. Deterministic resolver

```ts
resolve(ticker, eventType, selectedFund?, snapshot, rules): Resolution {
  if (!selectedFund) return resolveP0(ticker, eventType, rules);
  const fund = snapshot.records.find(r => r.ticker === selectedFund);
  if (!fund || fund.status !== "active") return { kind: "fund-unresolved", p0: resolveP0(ticker, eventType, rules) };
  const indexType = fund.index_type;
  const provider = fund.index_provider;
  const candidates = rules.filter(r => r.vendor === provider &&
    r.event_type === eventType && r.index_type === indexType);
  if (candidates.length) return { kind: "resolved-3d", fund, rules: stableSort(candidates) };
  return { kind: "p0-2d-fallback", fund, rules: resolveP0(ticker, eventType, rules), reason: "no-reviewed-3d-rule" };
}
```

The implementation must preserve P0 behavior byte-for-byte when no fund is selected. A selected fund never causes an implicit vendor substitution: provider and index type come from the snapshot, and missing/unknown metadata yields `fund-unresolved` or an explicit `no-rule`. The UI may explain fallback, but may not label a 2-D result as a 3-D result.

## 5. Smallest shippable vertical slice

Ship one lookup journey for a reviewed active Franklin ETF record: select fund, enter an existing P0 event type and ex-date, resolve `fund → underlying_index → index_provider/index_type`, render the selected provider's reviewed 3-D rule if present, and otherwise show the explicit P0 fallback. VettaFi is absent from the selector and snapshot scope. No network request occurs during build or lookup rendering.

### Acquisition and refresh

1. Operator runs the acquisition script on demand against the official Franklin ETF listing and each official fund page/fact sheet; secondary sources may corroborate but cannot silently override official data.
2. Save raw responses to `memory/audit/<task>-raw.json` before parsing. Every output carries non-empty `sources[]` containing URLs present in that raw response.
3. Normalize, validate, and produce a new dated snapshot. Never edit an old snapshot; commit the new file plus a short changelog.
4. Human review checks ticker count, duplicate tickers, changed fields, missingness, and source-as-of dates. Do not resolve the 68-versus-75+ discrepancy by guessing.
5. Refresh monthly and on material FT catalog/methodology change; application deployments consume only the latest committed snapshot selected in code.

The fetched evidence for this design confirms the official Franklin Templeton investment site exposes an Exchange Traded Funds product category (`https://www.franklintempleton.com/index`) and an official ETF press-release domain. It does **not** establish catalog completeness or any count, so those remain acquisition-time facts.

## 6. Failure states and tests

| Failure | Required result |
| --- | --- |
| Snapshot missing/malformed | Fail validation/build; never network-fetch a replacement. |
| Ticker absent or inactive | `fund-unresolved`, retain P0 result where possible. |
| Missing index/provider/type | Visible metadata-incomplete state; no inferred 3-D rule. |
| No matching 3-D rule | Explicit `p0-2d-fallback` or `no-rule`; provenance is mandatory. |
| Source URL absent/not in raw evidence | Reject record/snapshot. |
| Stale snapshot | Warn/fail according to release policy; do not silently refresh. |
| VettaFi requested | Explicit `excluded-from-p1b` state. |
| Solactive product | Resolve only to product-specific sourced rows; never universal coverage. |

No-network checks must assert: schema and ISO dates; unique tickers; exact missingness; every factual record has a source; selected-fund 3-D resolution; absent-fund P0 compatibility; unknown/missing fallback; VettaFi exclusion; Solactive non-universality; and that the resolver/acquisition modules contain no build-time fetch path. Add unit tests for stable ordering and deterministic repeated output.

## 7. Release gate

```text
node scripts/check-fund-master.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Before release, verify the build succeeds with network disabled or mocked and inspect the diff to confirm no dependencies, secrets, databases, jobs, Cloudflare settings, alerts, event discovery, or UI redesign were added. The follow-up implementation task must name the exact snapshot and make the selected-fund, source, fallback, and VettaFi decisions explicit.

## Sources

- `../../../SPECS/corporate-action-hub-revamp-design-2026-09-01.md` §§5b–5c, 7a, 12, 14 (reviewed product/design source).
- `https://www.franklintempleton.com/index` (official Franklin Templeton investment/product site; fetched search evidence archived in the audit artifact).
- `https://www.franklintempleton.com/press-releases/news-room/2025/franklin-templeton-launches-franklin-xrp-etf-xrpz` (official Franklin Templeton press-release domain; fetched search evidence archived in the audit artifact).
- Audit: `agents/goop/memory/audit/task-2026-09-04-ca-hub-p1b-fund-master-design-raw.json`.
