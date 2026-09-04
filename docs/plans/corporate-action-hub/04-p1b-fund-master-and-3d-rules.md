# P1b — Franklin fund master and 3-D rules program design

**Task:** `[task-2026-09-04-ca-hub-p1b-fund-master-design]`
**Status:** implementation-ready; no fund-master, rules, or UI code is included
**Design contract:** `../../../../../market-intel/wiki/goop/design-system.md`
**Source specification:** `../../../SPECS/corporate-action-hub-revamp-design-2026-09-01.md` §§5b, 5c, 12 (P1b), 14 risk 3
**Evidence audit:** `../../../../memory/audit/task-2026-09-04-ca-hub-p1b-fund-master-design-raw.json`

## 1. Slice boundary and decisions

P1b adds an immutable, committed Franklin Templeton ETF fund-master snapshot and
uses it to resolve the applicable index type before applying corporate-action
rules. It extends the existing P1a/P0 deterministic 2-D rule key
`vendor × event_type` to `vendor × event_type × index_type`.

The first slice is deliberately small: a catalog-backed resolver for three
representative Franklin products (one FTSE, one LibertyQ, and one Solactive
product) plus a 3-D rule fixture for those resolved index types. The resolver
must also support a lookup with no selected fund by returning the existing P0
2-D path unchanged. The remaining Franklin catalog is a follow-on snapshot
expansion, not a reason to block this first vertical slice.

**Explicit exclusions:** VettaFi is outside initial P1b by Alex direction; do
not fetch it, add it to the catalog count, or report it as a missing source.
Alerts, unattended monitoring, event discovery, live vendor fetches, fund
holdings, databases, scheduled jobs, secrets, Cloudflare, and new dependencies
are out of scope. Solactive rows are allowed only when their evidence names the
specific product/methodology and are labelled `partial` or
`product-specific`; they must never imply universal Solactive coverage.

The spec's conflicting `75+` / `68` catalog figures are not resolved by guesswork.
The snapshot records the exact acquisition result and date; a count is derived
only from records that pass validation. The fetched evidence currently confirms
catalog entries such as FLQL, FLJP, FLJH, UDIV, DIVI, DIEM, FLMI, FTCA, FTNY,
FTMS, FTSD, FTOH, FTNJ, FTMH, FLHY, FLSP, PVAL, PEMX, and INCM in a Morningstar
catalog excerpt, and confirms XDAT's ticker, Russell 3000 benchmark, inception
 date, and ISIN on Franklin's product page. It does **not** establish a total
catalog count. See the audit artifact and §8.

## 2. Exact implementation file map

| File | Change | Responsibility |
| --- | --- | --- |
| `src/data/fund-master/franklin-etf-snapshot-2026-09-04.json` | New, committed | Dated Franklin ETF records plus acquisition metadata; no runtime fetch. |
| `src/data/fund-master.schema.json` | New | JSON Schema for snapshot envelope and records. |
| `src/lib/fund-master.ts` | New | Strict types, snapshot validation, ticker lookup, and pure fund → index resolver. |
| `src/data/rules.json` | Modify | Add 3-D rows while preserving every existing 2-D row. |
| `src/data/rules.schema.json` | Modify | Permit optional `index_type` and explicit coverage/provenance fields. |
| `src/lib/coverage.ts` or the current rules adapter | Modify | Accept resolved `index_type`; select 3-D row first, then preserve the no-fund 2-D path. |
| `scripts/acquire-ft-etf-snapshot.mjs` | New, operator-run only | Fetches allowlisted sources, writes raw responses before parsing, and emits a dated candidate snapshot; never imported by build. |
| `scripts/check-fund-master.mjs` | New | Plain-Node assertions for schema, dates, required fields, source URLs, missingness, and resolver determinism. |
| `scripts/check-3d-rules.mjs` | New | Assertions for precedence, P0 compatibility, Solactive partial labels, and no VettaFi rows. |
| `docs/plans/corporate-action-hub/04-p1b-fund-master-and-3d-rules.md` | New | This contract and release gate. |
| `memory/audit/task-2026-09-04-ca-hub-p1b-fund-master-design-raw.json` | New outside app repo | Raw fetched evidence retained before synthesis. |

No build, page, API route, or UI should call a Franklin, Morningstar, justETF,
index-vendor, or other external URL. The application imports the committed JSON
only.

## 3. Snapshot contract

The snapshot is an envelope so acquisition provenance is versioned with the
records. Dates are ISO `YYYY-MM-DD`; timestamps are ISO UTC. Tickers are
uppercase. Empty values are represented in `missing_fields`, never as a
silently invented string.

```ts
export type IndexType =
  | "market-cap-weighted"
  | "float-adjusted-cap-weighted"
  | "price-weighted"
  | "equal-weighted"
  | "fundamental-weighted"
  | "capped-factor"
  | "thematic-custom"
  | "fixed-income"
  | "active"
  | "unknown";

export type EvidenceConfidence = "high" | "medium" | "low" | "absent";
export type FieldConfidence = "stated" | "inferred" | "user-set" | "absent";
export type CoverageQuality = "complete" | "partial" | "product-specific";

export type SourceEvidence = {
  url: string;
  publisher: string;
  retrieved_at: string;
  source_as_of?: string;
  fields: string[];
  note?: string;
};

export type FundMasterRecord = {
  ticker: string;
  name: string;
  isin: string | null;
  underlying_index: string | null;
  index_provider: string | null;
  index_type: IndexType | null;
  universe: string | null;
  weighting: string | null;
  reconstitution_frequency: string | null;
  inception_date: string | null;
  source_urls: string[];
  source_as_of: string | null;
  confidence: EvidenceConfidence;
  field_confidence: Partial<Record<
    | "ticker" | "name" | "isin" | "underlying_index" | "index_provider"
    | "index_type" | "universe" | "weighting"
    | "reconstitution_frequency" | "inception_date", FieldConfidence>>;
  missing_fields: string[];
  coverage_quality: CoverageQuality;
  notes?: string[];
};

export type FranklinEtfSnapshot = {
  schema_version: "1.0";
  snapshot_id: "franklin-etf-2026-09-04";
  provider: "Franklin Templeton";
  acquired_at: string;
  source_as_of: string;
  records: FundMasterRecord[];
  acquisition: {
    requested_sources: string[];
    successful_sources: string[];
    failed_sources: Array<{ url: string; reason: string }>;
    excluded_sources: Array<{ name: string; reason: string }>;
    record_count: number;
    count_note: string;
  };
};
```

`source_urls` must contain only URLs that were actually fetched and saved in the
raw audit output. `source_as_of` is the publisher's effective date when stated;
otherwise it is `null` at record level and the envelope's acquisition date is
not substituted. `confidence` describes the record as a whole; `field_confidence`
and `missing_fields` prevent a complete-looking row when only ticker/name was
verified. A record with a missing resolver-critical field (`underlying_index`,
`index_provider`, or `index_type`) is retained for audit but cannot resolve to a
3-D rule.

The JSON Schema must enforce: unique uppercase tickers; valid HTTPS `source_urls`;
non-empty source URLs for every `complete` record; `missing_fields` matching
null/absent fields; `confidence: absent` when no field is evidenced; and
`coverage_quality: product-specific` for Solactive evidence that is limited to
one named product guideline.

## 4. Deterministic resolution algorithm

The resolver is a pure function. It receives the existing lookup context and an
optional selected fund ticker; it performs no I/O and reads only the committed
snapshot and rules data.

```ts
export type FundResolution =
  | { mode: "fund-resolved"; ticker: string; fund: FundMasterRecord; indexType: IndexType; ruleScope: "3-d"; warnings: string[] }
  | { mode: "fund-unresolved"; ticker: string; reason: "unknown-ticker" | "missing-index-fields"; ruleScope: "2-d"; warnings: string[] }
  | { mode: "p0-compat"; ruleScope: "2-d"; warnings: [] };

export function resolveFundRules(
  selectedFundTicker: string | undefined,
  snapshot: FranklinEtfSnapshot,
  rules: VendorRule[],
): { resolution: FundResolution; rows: VendorRule[] };
```

1. No fund is selected: return `p0-compat`, and run the existing
   `vendor × event_type` selection exactly as before. No default fund or
   inferred index type is introduced.
2. Normalize a selected ticker to uppercase and exact-match it in the snapshot.
   Unknown ticker returns `fund-unresolved`, a visible warning, and the 2-D path;
   it does not fetch a product page at runtime.
3. If the record lacks any of `underlying_index`, `index_provider`, or
   `index_type`, return `fund-unresolved` and the 2-D path. Preserve the row's
   missingness for UI/agent explanation.
4. For a resolved record, filter rules by selected vendors and event type, then
   choose the exact `(vendor, event_type, index_type)` row. Stable vendor order
   remains the current order from `src/lib/vendors.ts`.
5. If no exact 3-D row exists, return an explicit `not-assessed`/`no-rule` outcome;
   do **not** silently fall back to a different index type. A separately marked
   `fallback_2d` field may be added only when the rule author explicitly opts in
   and supplies a source-backed reason; the first slice does not opt in.
6. A Solactive row is eligible only when its rule has
   `coverage: "product-specific"` or `"partial"` and a product/source reference.
   It cannot satisfy a universal Solactive query.
7. VettaFi is excluded at validation time. Any VettaFi row in the snapshot or
   first-slice 3-D fixture fails the release check rather than becoming a
   missingness warning.

Conceptually:

```text
selected fund?
  no  ──► existing 2-D resolver (P0 behavior unchanged)
  yes ─► exact snapshot ticker?
          no / incomplete ─► visible unresolved state + 2-D behavior
          yes ─► index_type ─► exact 3-D rule
                                missing ─► not-assessed/no-rule (no silent guess)
```

## 5. 3-D rule shape

The existing rule statement remains authoritative. P1b adds dimensions; it does
not rewrite the treatment claims or repair the methodology corpus in this task.

```ts
export type VendorRule = {
  vendor: string;
  event_type: string;
  index_type?: IndexType; // omitted means legacy 2-D rule
  treatment: string;
  coverage: "complete" | "partial" | "product-specific" | "not-applicable";
  provenance: "measured" | "inferred" | "stated" | "no-rule";
  source_refs: string[];
  source_urls: string[];
  conditions?: Record<string, string | number | boolean>;
};
```

Every new 3-D row must have non-empty `source_refs` or `source_urls`, a stable
rule ID if the current schema supports one, and a statement of coverage. The
first fixture should exercise the selected event type against the three
representative index types, not claim full 7-vendor × 13-event parity. A
product-specific Solactive rule must say which product it covers. No new rule
may describe ordinary cash dividends, rights variants, offerings, block sales,
or M&A conditions beyond what the source actually supports; those are explicit
risk areas in §7a-iii and belong to later sourced rule work.

## 6. Source-acquisition process

Acquisition is a human-reviewed, repeatable data operation that produces a new
committed snapshot. It is never part of `next build`, a route handler, or a
browser request.

1. Start from the Franklin Templeton ETF listing as the catalog authority and
   collect candidate tickers. Use Morningstar and justETF only as corroborating
   acquisition sources; do not merge their counts blindly.
2. For each candidate, fetch the Franklin product page/factsheet when available
   and capture ticker, name, ISIN, benchmark/index, universe, weighting,
   reconstitution frequency, and inception date. Fetch an index-provider
   methodology/product document when needed to establish `index_provider` and
   `index_type`.
3. Save raw responses before parsing to a task-specific
   `memory/audit/<task-id>-raw.json` file. The raw record must contain the URL,
   retrieval timestamp, source-as-of date if present, HTTP/fetch outcome, and
   the exact extracted evidence. A 404 or blocked page is a failed source, not
   evidence and not a reason to invent a value.
4. Normalize fields, calculate `missing_fields`, assign field-level confidence,
   and create a dated snapshot. Keep failed and excluded sources in the
   envelope acquisition metadata.
5. Review the diff against the prior snapshot: additions, removals, ticker
   changes, index changes, and confidence downgrades require an explicit note.
   Never overwrite a hand-corrected fact with an unreviewed extraction.
6. Run schema, provenance, resolver, and compatibility checks. Only then commit
   the JSON and its audit artifact together with a dated commit.
7. The application consumes that commit. If acquisition fails, the prior valid
   snapshot remains deployable and the new snapshot is not merged.

The current audit demonstrates the required failure handling: the requested
justETF URL returned `404 page not found`, so it is recorded as a failed source;
its result is not used to support a catalog claim. The Franklin XDAT page and
Morningstar catalog page were fetched and their URLs are included in the audit
`result.sources` equivalent (`sources`).

## 7. Smallest shippable vertical slice

**Slice:** `FLJP`, `FLQL`, and `XDAT` are committed as three validated snapshot
records, with their source-backed fields and missingness visible to the
resolver. A lookup may select one of them and receive the exact 3-D rule path;
a lookup without a fund receives the unchanged 2-D result. Include one
product-specific/partial Solactive fixture only if its product guideline is
fetched and saved during implementation; otherwise leave Solactive absent and
show `not-assessed`, never universal coverage.

The slice is complete when:

- the snapshot is dated and committed under the exact path in §2;
- no runtime code has an HTTP client or external URL for fund acquisition;
- all seven required identity/construction fields are present or explicitly
  missing: ticker, name, ISIN, underlying index, index provider, index type,
  universe, weighting, reconstitution frequency, inception date;
- each populated field links to a fetched source URL and each missing field is
  listed with `absent` confidence;
- the resolver output is deterministic and stable across repeated calls;
- no-fund P0 behavior has a regression test;
- an unknown/incomplete fund is visible but does not break the lookup; and
- the slice has no VettaFi records and no unsupported universal Solactive claim.

## 8. Refresh cadence and failure states

Refresh the fund master **quarterly**, and additionally after a Franklin ETF
launch, closure, ticker change, benchmark change, or material index methodology
revision. Refresh `rules.json` when the reviewed methodology corpus changes or
at least quarterly alongside the fund snapshot. Acquisition runs are manual or
operator-triggered repository work; there is no scheduled job in this slice.

| State | Stored result | Resolver behavior |
| --- | --- | --- |
| Source success with all required fields | `confidence: high/medium`, `missing_fields: []` | 3-D eligible after validation. |
| Source success with partial fields | field-level confidence + `missing_fields` | Retain record; 2-D fallback is explicit `fund-unresolved`, not a guess. |
| Source 404/blocked/rate-limited | `failed_sources[]` | Keep prior snapshot; do not publish new record. |
| Conflicting sources | `confidence: low`, conflict note | Do not resolve until human review chooses a source-backed value. |
| Unknown selected ticker | no record match | Visible `unknown-ticker`; preserve P0 2-D path. |
| Missing index fields | `fund-unresolved` | Visible missingness; preserve P0 2-D path. |
| Missing exact 3-D rule | `not-assessed` / `no-rule` | No silent 2-D or other-index substitution. |
| Solactive product-only evidence | `coverage: product-specific` | Apply only to named product; never universalize. |
| VettaFi requested | excluded by scope | Not a data-quality blocker; it is outside P1b. |

Snapshot selection is explicit: production imports the file named in the
commit, not “latest available” by filesystem order. A refresh PR must update
both the snapshot ID and acquisition metadata. A stale snapshot is not silently
reported as current; consumers can display its `source_as_of` date.

## 9. Tests and release gate

### Required tests

1. JSON Schema accepts the dated envelope and rejects missing identity fields,
   invalid dates, non-HTTPS URLs, duplicate tickers, and inconsistent
   `missing_fields`.
2. Every populated record field has a source URL; every source URL appears in
   the saved audit artifact; failed URLs never support a positive field.
3. `FLJP`, `FLQL`, and `XDAT` normalize case and resolve the expected index type
   only when the committed record is complete enough.
4. No selected fund returns the byte-for-byte equivalent P0 2-D rule selection.
5. Unknown and incomplete fund selections return visible unresolved states and
   do not throw.
6. Exact 3-D precedence beats a legacy 2-D row; no exact 3-D row returns
   `not-assessed` rather than a silent guess.
7. Vendor selection and stable ordering remain unchanged from P0/P1a.
8. A Solactive product-specific row cannot match a different Solactive product
   or a universal Solactive query.
9. Any VettaFi record or rule fails validation.
10. Build/static inspection confirms no build-time or route-time fetch to
    Franklin, Morningstar, justETF, Solactive, FTSE, or other acquisition URL.

### Release gate

```text
npx tsc --noEmit
npm run lint
npm run build
node scripts/check-fund-master.mjs
node scripts/check-3d-rules.mjs
```

Release only when all commands pass, the dated snapshot and audit artifact are
committed, the no-fund regression proves P0 compatibility, the three-fund
journey resolves deterministically, incomplete data is honest and non-fatal,
VettaFi is absent by scope, and Solactive is visibly partial/product-specific
where used. A failed source acquisition blocks snapshot publication, not the
existing production build.

## 10. Evidence used for this design

The following are the fetched URLs saved before this document was synthesized:

- Franklin Templeton XDAT product page — benchmark, inception date, ticker, ISIN:
  <https://www.franklintempleton.com/investments/options/exchange-traded-funds/products/30780/SINGLCLASS/franklin-exponential-data-etf/XDAT>
- Morningstar Franklin Templeton ETF catalog excerpt — catalog entries/tickers,
  not an exact total count:
  <https://www.morningstar.com/asset-management-companies/franklin-templeton-BN000008U9/etfs>
- Morningstar FLJP reference page:
  <https://www.morningstar.com/etfs/arcx/fljp/quote>
- Morningstar FLQL reference page:
  <https://www.morningstar.com/etfs/bats/flql/quote>
- Failed acquisition recorded for transparency (not evidence):
  <https://www.justetf.com/en/etf-provider/franklin-templeton.html>

The external evidence supports acquisition shape and the cited individual
fields/catalog entries only. Taxonomy, resolver behavior, phase boundary,
refresh cadence, and the VettaFi/Solactive scope decisions are design decisions
from the cited corporate-action-hub specification, not claims that this audit
pretends were established by the web fetches.
