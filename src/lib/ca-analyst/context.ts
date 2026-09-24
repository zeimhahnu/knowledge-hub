import type { NewsValidationResult } from "../news-validation.ts";
import type { LookupVerdict, MatrixRow } from "../lookup-verdict.ts";
import { VENDOR_IDS, type VendorId } from "../vendors.ts";
import type { VendorEntailment } from "../vendor-entailment.ts";
import type { LookupFilters } from "../lookup-verdict.ts";
import { classifyDividend } from "../dividend-check.ts";
import type {
  AnalystEntailment,
  AnalystLookupContext,
  AnalystMatrixRow,
  AnalystNewsContext,
  AnalystQualifiers,
  AnalystRuleEvidence,
} from "./types.ts";

const MAX_VENDORS = 7;
const MAX_ROWS = 7;
const MAX_RULE_REFS = 8;
const MAX_SOURCES = 8;
const MAX_ENTAILMENT = 7;
const MAX_REASON = 600;
const MAX_CONDITIONS = 8;

function cleanText(value: string, max: number): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function isVendor(value: string): value is VendorId {
  return (VENDOR_IDS as readonly string[]).includes(value);
}

function sourceRefs(row: MatrixRow): string[] {
  const refs = row.treatments
    .map((treatment) => treatment.sourceRef)
    .filter((ref): ref is string => typeof ref === "string")
    .map((ref) => cleanText(ref, 100))
    .filter(Boolean);
  return [...new Set(refs)].slice(0, MAX_RULE_REFS);
}

function ruleEvidence(row: MatrixRow): AnalystRuleEvidence[] {
  return row.treatments.slice(0, MAX_RULE_REFS).map((treatment) => ({
    indexType: cleanText(treatment.indexType, 64),
    conditions: treatment.conditions,
    treatment: treatment.treatment === null ? null : cleanText(treatment.treatment, 2_000),
    sourceRef: treatment.sourceRef ? cleanText(treatment.sourceRef, 500) : null,
    confidence: ["stated", "inferred", "absent", "user-set"].includes(treatment.confidence)
      ? treatment.confidence as AnalystRuleEvidence["confidence"]
      : "absent",
  }));
}

function rowState(row: MatrixRow): AnalystMatrixRow["state"] {
  // P0's "not-checked" has no separate P1a wire value. It remains visible in
  // the matrix and is represented as unassessed, never discarded.
  return row.state === "not-checked" ? "not-assessed" : row.state;
}

function provenance(row: MatrixRow, news: NewsValidationResult): AnalystMatrixRow["provenance"] {
  if (!row.rulePresent) return "no-rule";
  if (row.confirmation) return "measured";
  if (news.validationRan && news.verdict === "confirmed") return "news-confirmed";
  return "inferred";
}

function newsContext(news: NewsValidationResult): AnalystNewsContext {
  return {
    validationRan: news.validationRan,
    verdict: news.verdict,
    confidence: news.confidence,
    ...(news.warning ? { warning: cleanText(news.warning, 300) } : {}),
    sources: news.sources
      .filter((source) => {
        try {
          return new URL(source.url).protocol === "https:";
        } catch {
          return false;
        }
      })
      .slice(0, MAX_SOURCES)
      .map((source) => ({
        url: source.url.slice(0, 500),
        title: cleanText(source.title, 200),
        publishedAt: cleanText(source.publishedAt, 80),
      })),
  };
}

/**
 * The UI already renders this; the Analyst never saw it. Only the fields the
 * model reasons from travel: `peers` is the derivation detail behind `reason`,
 * and `ruleRefs` already ride on matrixRows, so neither is duplicated onto the
 * wire.
 */
function entailmentContext(results: readonly VendorEntailment[], selected: ReadonlySet<string>): AnalystEntailment[] {
  return results
    .filter((result) => selected.has(result.vendor))
    .slice(0, MAX_ENTAILMENT)
    .map((result) => ({
      vendor: result.vendor,
      verdict: result.verdict,
      reason: cleanText(result.reason, MAX_REASON),
      drivers: [...new Set(result.drivers)].filter(isVendor).slice(0, MAX_VENDORS),
      scope: result.scope,
    }));
}

/** Only answered qualifiers travel; an empty object would claim "asked, answered nothing". */
function qualifiersContext(filters: LookupFilters | undefined): AnalystQualifiers | null {
  const conditions = Object.entries(filters?.conditions ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
    .slice(0, MAX_CONDITIONS)
    .map(([key, value]) => [cleanText(key, 64), cleanText(value, 64)]);
  const yieldPct = filters?.dividendYieldPct;
  const hasYield = typeof yieldPct === "number" && Number.isFinite(yieldPct) && yieldPct >= 0 && yieldPct <= 100;
  if (!conditions.length && !hasYield) return null;
  return {
    ...(hasYield ? { dividendYieldPct: yieldPct } : {}),
    ...(conditions.length ? { conditions: Object.fromEntries(conditions) } : {}),
  };
}

/** Build the bounded P1a wire context from the lookup already on screen. */
export function buildAnalystLookupContext({
  ticker,
  eventType,
  exDate,
  selectedVendors,
  verdict,
  news,
  entailment,
  company,
  filters,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  selectedVendors: readonly VendorId[];
  verdict: LookupVerdict;
  news: NewsValidationResult;
  entailment?: readonly VendorEntailment[];
  company?: string | null;
  filters?: LookupFilters;
}): AnalystLookupContext {
  const selected = [...new Set(selectedVendors.filter(isVendor))].slice(0, MAX_VENDORS);
  const selectedSet = new Set(selected);
  const qualifiers = qualifiersContext(filters);
  const dividendChecks = qualifiers?.dividendYieldPct === undefined
    ? []
    : classifyDividend(eventType, qualifiers.dividendYieldPct).filter((check) => selectedSet.has(check.vendor));
  const companyName = company ? cleanText(company, 120) : "";
  return {
    ticker: cleanText(ticker, 15).toUpperCase(),
    eventType: cleanText(eventType, 64),
    exDate: cleanText(exDate, 10),
    selectedVendors: selected,
    matrixRows: verdict.rows
      .filter((row) => selectedSet.has(row.vendor))
      .slice(0, MAX_ROWS)
      .map((row) => ({
        vendor: row.vendor,
        state: rowState(row),
        provenance: provenance(row, news),
        ruleRefs: sourceRefs(row),
        rules: ruleEvidence(row),
        ...(row.deferral ? { deferral: {
          timing: row.deferral.timing,
          reviewDate: row.deferral.reviewDate,
          finding: cleanText(row.deferral.finding, 400),
        } } : {}),
        ...(row.uncoveredPolicy ? { uncoveredPolicy: {
          treatment: cleanText(row.uncoveredPolicy.treatment, MAX_REASON),
          sourceRef: cleanText(row.uncoveredPolicy.sourceRef, 500),
        } } : {}),
      })),
    news: newsContext(news),
    // Omitted entirely when absent: the wire contract makes entailment optional,
    // and an empty array would claim "computed, found nothing".
    ...(entailment && entailment.length
      ? { entailment: entailmentContext(entailment, selectedSet) }
      : {}),
    ...(companyName ? { company: companyName } : {}),
    ...(qualifiers ? { qualifiers } : {}),
    ...(dividendChecks.length ? { dividendChecks } : {}),
  };
}
