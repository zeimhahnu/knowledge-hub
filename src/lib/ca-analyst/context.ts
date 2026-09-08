import type { NewsValidationResult } from "../news-validation.ts";
import type { LookupVerdict, MatrixRow } from "../lookup-verdict.ts";
import { VENDOR_IDS, type VendorId } from "../vendors.ts";
import type {
  AnalystLookupContext,
  AnalystMatrixRow,
  AnalystNewsContext,
} from "./types.ts";

const MAX_VENDORS = 7;
const MAX_ROWS = 7;
const MAX_RULE_REFS = 8;
const MAX_SOURCES = 8;

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

/** Build the bounded P1a wire context from the lookup already on screen. */
export function buildAnalystLookupContext({
  ticker,
  eventType,
  exDate,
  selectedVendors,
  verdict,
  news,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  selectedVendors: readonly VendorId[];
  verdict: LookupVerdict;
  news: NewsValidationResult;
}): AnalystLookupContext {
  const selected = [...new Set(selectedVendors.filter(isVendor))].slice(0, MAX_VENDORS);
  const selectedSet = new Set(selected);
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
      })),
    news: newsContext(news),
  };
}
