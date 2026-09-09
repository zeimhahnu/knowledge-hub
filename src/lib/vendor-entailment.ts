/**
 * Cross-vendor entailment - "is this vendor's silence actually wrong?"
 *
 * divergence.ts compares what the methodologies SAY. This module compares a
 * methodology against what the operator OBSERVED, and uses one vendor's
 * publication as evidence about another's.
 *
 * The move that makes it useful: thresholds are comparable. If Morningstar
 * published a special-dividend projection and its rule fires at ">= 5% of
 * market price", the event demonstrably cleared 5%. MSCI's rule fires at the
 * same 5%, so MSCI's silence is a REAL discrepancy, not a scope or timing
 * artifact. Had MSCI's bar been 10%, the same observation would EXPLAIN the
 * silence instead of condemning it.
 *
 * Three honesty rules, in precedence order:
 *   1. Timing wins. A vendor that is not yet due cannot be "contradicted" -
 *      it is early, not wrong.
 *   2. Index type gates comparison. A rule written for market-cap-weighted
 *      indices says nothing about an equal-weighted fund. When the fund does
 *      not resolve we are in 2-d scope: only index-agnostic rules may be
 *      compared, and the verdict says so.
 *   3. No comparable rule means indeterminate. Never guess; an unknown is
 *      reported as unknown, the same way the matrix separates not-assessed
 *      from not-applicable.
 *
 * Pure + Node-importable (same rule as coverage.ts / lookup-verdict.ts):
 * relative imports, no alias, no DOM at import time.
 */

import curatedRules from "../data/rules.json" with { type: "json" };
import type { VendorId } from "./vendors.ts";
import { ruleIndexTypeMatchesFund, type IndexType } from "./fund-master.ts";

export type EntailmentVerdict = "contradicted" | "consistent" | "indeterminate";
export type RuleScope = "3-d" | "2-d";

export type PeerRelation =
  | "shares-bar"
  | "peer-bar-higher"
  | "peer-bar-lower"
  | "unconditional"
  | "incomparable";

export interface EntailmentPeer {
  vendor: VendorId;
  relation: PeerRelation;
  entails: boolean;
  peerThreshold: number | null;
}

export interface VendorEntailment {
  vendor: VendorId;
  verdict: EntailmentVerdict;
  reason: string;
  drivers: VendorId[];
  peers: EntailmentPeer[];
  ruleRefs: string[];
  scope: RuleScope;
}

export interface EntailmentRule {
  vendor: string;
  event_type: string;
  index_type?: string;
  treatment?: string | null;
  source_ref?: string;
  source_refs?: string[];
  confidence?: string;
  conditions?: { dividend_size_threshold_pct?: number; threshold_side?: string };
}

export interface EntailmentInput {
  eventType: string;
  absent: readonly VendorId[];
  confirmed: readonly VendorId[];
  notYetDue?: readonly VendorId[];
  rules: readonly EntailmentRule[];
  /** Per-vendor resolved index types; null is the honest 2-D scope. */
  indexTypes?: Readonly<Record<string, IndexType | null | undefined>>;
  /** Backwards-compatible page-level value for callers that have one fund. */
  indexType?: IndexType | null;
}

/** A rule row that states no treatment publishes nothing to reason from. */
const states = (rule: EntailmentRule): boolean =>
  rule.confidence !== "absent" && rule.treatment !== null && rule.treatment !== undefined;

const AT_OR_ABOVE = "at_or_above";
const BELOW = "below";

const refsOf = (rule: EntailmentRule): string[] => {
  const refs = [...(rule.source_refs ?? []), ...(rule.source_ref ? [rule.source_ref] : [])];
  return [...new Set(refs.filter((r) => typeof r === "string" && r.trim()))];
};

const thresholdOf = (rule: EntailmentRule): { pct: number; side: string } | null => {
  const pct = rule.conditions?.dividend_size_threshold_pct;
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
  const side = rule.conditions?.threshold_side === BELOW ? BELOW : AT_OR_ABOVE;
  return { pct, side };
};

/**
 * Rules that may be compared for this fund. An index_type of "*" (or absent)
 * is index-agnostic and always applies; anything else must match the resolved
 * fund. With no resolved fund only the agnostic rules are admissible.
 */
function admissibleRules(
  rules: readonly EntailmentRule[],
  eventType: string,
  indexType: IndexType | null | undefined,
): EntailmentRule[] {
  return rules.filter((rule) => {
    if (rule.event_type !== eventType) return false;
    const scope = rule.index_type;
    if (!scope || scope === "*") return true;
    return indexType != null && ruleIndexTypeMatchesFund(scope, indexType);
  });
}

/** Does peer publishing imply subject should have published too? */
function relate(subject: EntailmentRule, peer: EntailmentRule): PeerRelation {
  const s = thresholdOf(subject);
  const p = thresholdOf(peer);
  if (!s) return "unconditional";
  if (!p) return "incomparable";
  if (s.side !== p.side) return "incomparable";
  if (s.pct === p.pct) return "shares-bar";
  // at_or_above: peer fired means value >= p.pct; subject fires at value >= s.pct.
  // Entailed when the subject bar is no higher than the peer bar.
  if (s.side === AT_OR_ABOVE) return s.pct < p.pct ? "peer-bar-higher" : "peer-bar-lower";
  // below: peer fired means value < p.pct; subject fires at value < s.pct.
  return s.pct > p.pct ? "peer-bar-higher" : "peer-bar-lower";
}

const ENTAILING: ReadonlySet<PeerRelation> = new Set<PeerRelation>([
  "shares-bar",
  "peer-bar-higher",
  "unconditional",
]);

const label = (v: string) => v.toUpperCase();

export function computeEntailment(input: EntailmentInput): VendorEntailment[] {
  const { eventType, absent, confirmed, rules } = input;
  const notYetDue = new Set(input.notYetDue ?? []);
  const indexTypeFor = (vendor: string): IndexType | null => {
    if (input.indexTypes && Object.prototype.hasOwnProperty.call(input.indexTypes, vendor)) {
      return input.indexTypes[vendor] ?? null;
    }
    return input.indexType ?? null;
  };
  const ruleFor = (vendor: string) =>
    admissibleRules(rules, eventType, indexTypeFor(vendor)).find((r) => r.vendor === vendor);
  const comparable = (subjectVendor: string, peerVendor: string): boolean => {
    // Cross-vendor inference is valid only inside the same resolved scope.
    // An unresolved 2-D row must not borrow a resolved 3-D rule either.
    return indexTypeFor(subjectVendor) === indexTypeFor(peerVendor);
  };

  return absent.map((vendor): VendorEntailment => {
    const indexType = indexTypeFor(vendor);
    const scope: RuleScope = indexType != null ? "3-d" : "2-d";
    const caveat = scope === "2-d" ? " (index-agnostic rules only, no fund resolved)" : "";
    const base = { vendor, drivers: [] as VendorId[], peers: [] as EntailmentPeer[], scope };

    if (notYetDue.has(vendor)) {
      return { ...base, verdict: "indeterminate", ruleRefs: [],
        reason: label(vendor) + " is not yet due to publish, so its silence cannot be judged - early, not wrong." };
    }

    const subject = ruleFor(vendor);
    if (subject && !states(subject)) {
      return { ...base, verdict: "indeterminate", ruleRefs: refsOf(subject),
        reason: label(vendor) + " publishes no stated treatment for " + eventType + " (methodology silent), so its absence cannot be called wrong" + caveat + "." };
    }
    if (!subject) {
      const why = scope === "2-d"
        ? "no index-agnostic " + eventType + " rule is curated for " + label(vendor) + ", and no fund is resolved to narrow it"
        : "no " + eventType + " rule is curated for " + label(vendor) + " at this index type";
      return { ...base, verdict: "indeterminate", ruleRefs: [], reason: "Cannot judge " + label(vendor) + ": " + why + "." };
    }

    const peers: EntailmentPeer[] = [];
    for (const peerVendor of confirmed) {
      if (!comparable(vendor, peerVendor)) continue;
      const peerRule = ruleFor(peerVendor);
      if (!peerRule || !states(peerRule)) continue;
      const relation = relate(subject, peerRule);
      peers.push({ vendor: peerVendor, relation, entails: ENTAILING.has(relation),
        peerThreshold: thresholdOf(peerRule)?.pct ?? null });
    }

    const drivers = peers.filter((p) => p.entails).map((p) => p.vendor);
    const subjectThreshold = thresholdOf(subject);

    if (drivers.length) {
      const driven = drivers.map(label).join(", ");
      const bar = subjectThreshold
        ? "both fire " + (subjectThreshold.side === BELOW ? "below " : "at or above ") + subjectThreshold.pct + "% of market price"
        : label(vendor) + " covers this event with no threshold to clear";
      const ruleRefs = [...new Set([...refsOf(subject), ...drivers.flatMap((d) => refsOf(ruleFor(d)!))])];
      return { ...base, verdict: "contradicted", peers, drivers, ruleRefs,
        reason: driven + " published and " + bar + ", so " + label(vendor) + " should have published too - its absence is a genuine discrepancy" + caveat + "." };
    }

    if (peers.length) {
      const looser = peers.find((p) => p.relation === "peer-bar-lower");
      const reason = looser && subjectThreshold && looser.peerThreshold != null
        ? label(vendor) + " has a stricter bar (" + subjectThreshold.pct + "%) than " + label(looser.vendor) + " (" + looser.peerThreshold + "%), so " + label(looser.vendor) + " publishing does not imply " + label(vendor) + " should - the absence is explained" + caveat + "."
        : "No confirmed vendor shares a comparable trigger with " + label(vendor) + ", so its absence is consistent with the curated rules" + caveat + ".";
      return { ...base, verdict: "consistent", peers, ruleRefs: refsOf(subject), reason };
    }

    return { ...base, verdict: "indeterminate", peers, ruleRefs: refsOf(subject),
      reason: "No vendor has been confirmed as having provided this event, so there is nothing to test " + label(vendor) + " silence against" + caveat + "." };
  });
}

/** One-line summary for the panel header. */
export function entailmentSummary(results: readonly VendorEntailment[]): string {
  const contradicted = results.filter((r) => r.verdict === "contradicted");
  if (contradicted.length) {
    return contradicted.length + " vendor" + (contradicted.length === 1 ? "" : "s") +
      " should have published but did not: " + contradicted.map((r) => label(r.vendor)).join(", ") + ".";
  }
  if (results.some((r) => r.verdict === "consistent")) return "Every absence is explained by the curated methodology rules.";
  return "Not enough confirmed observations to judge any absence.";
}

/** Entailment against the bundled curated rules (mirrors divergence.ts). */
export function computeCuratedEntailment(
  input: Omit<EntailmentInput, "rules">,
): VendorEntailment[] {
  return computeEntailment({ ...input, rules: curatedRules.rules as EntailmentRule[] });
}
