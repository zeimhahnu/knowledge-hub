import snapshotData from "../data/fund-master/franklin-etf-snapshot-2026-09-04.json" with { type: "json" };
import catalogData from "../data/fund-master/franklin-us-etf-catalog-2026-09-05.json" with { type: "json" };

export type IndexType = "market-cap-weighted" | "float-adjusted-cap-weighted" | "price-weighted" | "equal-weighted" | "fundamental-weighted" | "capped-factor" | "thematic-custom" | "fixed-income" | "active" | "unknown";
export type EvidenceConfidence = "high" | "medium" | "low" | "absent";
export type FieldConfidence = "stated" | "inferred" | "user-set" | "absent";
export type CoverageQuality = "complete" | "partial" | "product-specific";
export type SourceEvidence = { url: string; publisher: string; retrieved_at: string; source_as_of?: string; fields: string[]; note?: string };
export type FundMasterRecord = { ticker: string; name: string; isin: string | null; underlying_index: string | null; index_provider: string | null; index_type: IndexType | null; universe: string | null; weighting: string | null; reconstitution_frequency: string | null; inception_date: string | null; source_urls: string[]; source_as_of: string | null; confidence: EvidenceConfidence; field_confidence: Partial<Record<string, FieldConfidence>>; missing_fields: string[]; coverage_quality: CoverageQuality; notes?: string[] };
export type FranklinEtfSnapshot = { schema_version: "1.0"; snapshot_id: string; provider: "Franklin Templeton"; acquired_at: string; source_as_of: string; records: FundMasterRecord[]; acquisition: { requested_sources: string[]; successful_sources: string[]; failed_sources: Array<{url:string;reason:string}>; excluded_sources: Array<{name:string;reason:string}>; record_count:number; count_note:string } };
export type FranklinCatalogRecord = { url: string; ticker: string; name: string; source_as_of: string | null; retrieved_at: string };
export type FranklinEtfCatalog = { schema_version: "1.0"; snapshot_id: string; source_url: string; retrieved_at: string; source_as_of: string | null; scope: string; records: FranklinCatalogRecord[] };
export type VendorRule = { vendor: string; event_type: string; index_type?: string; treatment: string | null; coverage?: CoverageQuality | "not-applicable"; provenance?: string; source_refs?: string[]; source_urls?: string[]; source_ref?: string; confidence?: string; [key: string]: unknown };
export type FundResolution = { mode: "fund-resolved"; ticker: string; fund: FundMasterRecord; indexType: IndexType; ruleScope: "3-d"; warnings: string[] } | { mode: "cataloged-unreviewed"; ticker: string; catalog: FranklinCatalogRecord; ruleScope: "2-d"; warnings: string[] } | { mode: "fund-unresolved"; ticker: string; reason: "unknown-ticker" | "missing-index-fields"; ruleScope: "2-d"; warnings: string[] } | { mode: "p0-compat"; ruleScope: "2-d"; warnings: [] };
export const franklinSnapshot = snapshotData as FranklinEtfSnapshot;
export const franklinCatalog = catalogData as FranklinEtfCatalog;
export function activeFranklinCatalog(catalog: FranklinEtfCatalog = franklinCatalog): FranklinCatalogRecord[] { return catalog.records; }
export function findFranklinFund(ticker: string, snapshot: FranklinEtfSnapshot = franklinSnapshot): FundMasterRecord | null { const normalized = ticker.trim().toUpperCase(); return snapshot.records.find((record) => record.ticker === normalized) ?? null; }
export function resolveFundRules(selectedFundTicker: string | undefined, snapshot: FranklinEtfSnapshot, rules: VendorRule[], catalog: FranklinEtfCatalog = franklinCatalog): { resolution: FundResolution; rows: VendorRule[] } {
  if (!selectedFundTicker?.trim()) return { resolution: { mode: "p0-compat", ruleScope: "2-d", warnings: [] }, rows: rules };
  const ticker = selectedFundTicker.trim().toUpperCase(); const fund = findFranklinFund(ticker, snapshot);
  if (!fund) {
    const catalogFund = activeFranklinCatalog(catalog).find((record) => record.ticker === ticker);
    if (catalogFund) return { resolution: { mode: "cataloged-unreviewed", ticker, catalog: catalogFund, ruleScope: "2-d", warnings: [`${ticker} is cataloged by Franklin, but its index metadata has not been reviewed; using the existing P0 2-D rules.`] }, rows: rules };
    return { resolution: { mode: "fund-unresolved", ticker, reason: "unknown-ticker", ruleScope: "2-d", warnings: [`${ticker} is not in the reviewed Franklin snapshot; using the existing P0 2-D rules.`] }, rows: rules };
  }
  if (!fund.underlying_index || !fund.index_provider || !fund.index_type) return { resolution: { mode: "fund-unresolved", ticker, reason: "missing-index-fields", ruleScope: "2-d", warnings: [`${ticker} is missing an index resolver field: ${fund.missing_fields.join(", ") || "index metadata"}.` ] }, rows: rules };
  return { resolution: { mode: "fund-resolved", ticker, fund, indexType: fund.index_type, ruleScope: "3-d", warnings: [] }, rows: rules.filter((rule) => rule.index_type === fund.index_type) };
}
