/**
 * Dividend yield cross-check (plan-coac-1.0 M4).
 *
 * Vendors with a numeric ordinary/special boundary (MSCI, Morningstar: 5% of the
 * share price) classify a cash dividend by its size, whatever the company calls
 * it. The comparison is one line of code on purpose - no model is asked to do it.
 */
import rules from "../data/rules.json" with { type: "json" };
import { canonicalEventById } from "./event-taxonomy.ts";
import { VENDOR_LABELS, type VendorId } from "./vendors.ts";

export type DividendClassification = {
  vendor: VendorId;
  thresholdPct: number;
  classifiedAs: "special" | "ordinary";
  /** The vendor's classification contradicts the event type the user picked. */
  conflicts: boolean;
};

const DIVIDEND_EVENTS = new Set(["cash-dividend", "special-dividend"]);

export const isDividendEvent = (eventType: string): boolean => DIVIDEND_EVENTS.has(eventType);

export function classifyDividend(eventType: string, yieldPct: number): DividendClassification[] {
  if (!isDividendEvent(eventType) || !Number.isFinite(yieldPct) || yieldPct < 0) return [];
  const thresholds = new Map<VendorId, number>();
  for (const rule of rules.rules) {
    const threshold = (rule.conditions as { dividend_size_threshold_pct?: unknown } | null)?.dividend_size_threshold_pct;
    if (isDividendEvent(rule.event_type) && typeof threshold === "number") thresholds.set(rule.vendor as VendorId, threshold);
  }
  return [...thresholds].map(([vendor, thresholdPct]) => {
    const classifiedAs = yieldPct >= thresholdPct ? "special" : "ordinary";
    return { vendor, thresholdPct, classifiedAs, conflicts: (eventType === "special-dividend") !== (classifiedAs === "special") };
  });
}

/** One sentence per vendor for the lookup and the Analyst. */
export function describeClassification(check: DividendClassification, eventType: string, yieldPct: number): string {
  const vendor = VENDOR_LABELS[check.vendor];
  const side = check.classifiedAs === "special" ? "at or above" : "below";
  const as = check.classifiedAs === "special" ? "a special dividend" : "an ordinary dividend";
  if (!check.conflicts) return `${vendor}: ${yieldPct}% is ${side} its ${check.thresholdPct}% threshold, so it is ${as}, as selected.`;
  const other = canonicalEventById(eventType === "special-dividend" ? "cash-dividend" : "special-dividend")?.name;
  return `${vendor} treats a ${yieldPct}% dividend as ${as} (${side} its ${check.thresholdPct}% threshold), not as the ${canonicalEventById(eventType)?.name} selected. Its rule is under ${other}.`;
}
