import { canonicalEventById, type CanonicalEventId } from "@/lib/event-taxonomy";
import { getEventClassFromFamily, humanFamily } from "@/lib/simulator/taxonomy";
import type {
  Hypothesis,
  Relevance,
  SimulatorInput,
  SimulatorResult,
} from "@/lib/simulator/types";
import type { VendorId } from "@/lib/vendors";
import { vendorAbbr, vendorLabel } from "@/lib/vendors";
import { getVendorRule, type VendorRule } from "@/lib/simulator/vendor-rules";

const RULES_VERSION = "2.0.0";

const DISCLAIMER =
  "Simulator output is a deterministic read of the documented vendor rules in SOURCES/index-vendor-methodology.md. It does not replace official vendor notices or your internal policy — always confirm with primary sources.";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatIsoDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function businessDaysBetween(fromIso: string, toIso: string): number | null {
  if (!fromIso || !toIso) return null;
  const from = new Date(fromIso + "T12:00:00");
  const to = new Date(toIso + "T12:00:00");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (to.getTime() < from.getTime()) return 0;
  const cur = new Date(from.getTime());
  let count = 0;
  while (true) {
    cur.setDate(cur.getDate() + 1);
    if (cur.getTime() > to.getTime()) break;
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

function relScore(r: Relevance): number {
  if (r === "high") return 3;
  if (r === "medium") return 2;
  return 1;
}

function uniqueVendors(ids: VendorId[]): VendorId[] {
  return Array.from(new Set(ids));
}

function listVendors(ids: VendorId[]): string {
  return uniqueVendors(ids).map(vendorAbbr).join(", ");
}

function overlap(a: VendorId[], b: VendorId[]): VendorId[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function onlyMissingPresent(
  missing: VendorId[],
  present: VendorId[],
): { onlyMissing: VendorId[]; onlyPresent: VendorId[] } {
  const m = new Set(missing);
  const p = new Set(present);
  const onlyMissing = missing.filter((id) => !p.has(id));
  const onlyPresent = present.filter((id) => !m.has(id));
  return { onlyMissing, onlyPresent };
}

function parseOptionalPct(raw: string): number | null {
  const t = raw.trim().replace(/%/g, "");
  if (t === "") return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

// ─── Per-vendor reasoning ───────────────────────────────────────────────────

type VendorVerdict = {
  vendorId: VendorId;
  rule: VendorRule;
  /** Concise sentence saying whether this vendor would publish, and why. */
  decision: string;
  /** "publish" = vendor would have a line in the projection feed; "suppress" = not yet. */
  status: "publish" | "suppress" | "indeterminate";
};

function judgeVendor(
  event: CanonicalEventId,
  vendorId: VendorId,
  input: SimulatorInput,
): VendorVerdict | null {
  const rule = getVendorRule(event, vendorId);
  if (!rule) return null;

  const yieldPct = parseOptionalPct(input.metrics.dividendYieldPct);
  const ffDelta = parseOptionalPct(input.metrics.freeFloatChangePp);
  const tenderPct = parseOptionalPct(input.metrics.tenderAcceptancePct);
  // Rights discount captured for downstream OTM/ITM heuristics — not yet wired into vendor judgement.
  void parseOptionalPct(input.metrics.rightsDiscountPct);

  let status: VendorVerdict["status"] = "publish";
  let decision = rule.reason;

  switch (rule.trigger) {
    case "always":
      status = "publish";
      break;

    case "no-coverage":
      status = "indeterminate";
      decision = `${vendorLabel(vendorId)} has no documented path for ${humanFamily(event)} in the sourced methodology — absence in this feed is expected, not anomalous.`;
      break;

    case "threshold-size": {
      // Map to whichever metric is meaningful for this event family.
      const metric =
        event === "secondary-offering" || event === "private-placement"
          ? ffDelta
          : event === "special-dividend"
            ? yieldPct
            : null;
      if (metric === null) {
        status = "indeterminate";
        decision = `${vendorLabel(vendorId)}: ${rule.reason} You did not provide a size hint, so the simulator cannot say for certain whether the threshold was crossed.`;
      } else if (
        rule.thresholdPct !== undefined &&
        Math.abs(metric) >= rule.thresholdPct
      ) {
        status = "publish";
        decision = `${vendorLabel(vendorId)}: size ≈ ${metric}% meets the ${rule.thresholdPct}% trigger, so this vendor SHOULD publish a projection line. ${rule.reason}`;
      } else if (rule.thresholdPct !== undefined) {
        status = "suppress";
        decision = `${vendorLabel(vendorId)}: size ≈ ${metric}% is below the ${rule.thresholdPct}% trigger, so the change is deferred to the next quarterly review and will not show in the open-constituents projection feed yet. ${rule.reason}`;
      }
      break;
    }

    case "threshold-recurrence":
      status = "indeterminate";
      decision = `${vendorLabel(vendorId)}: classification depends on the consecutive-occurrence count for this issuer (the simulator does not have that history). ${rule.reason}`;
      break;

    case "threshold-float":
      if (ffDelta === null) {
        status = "indeterminate";
        decision = `${vendorLabel(vendorId)}: ${rule.reason} Add an estimated free-float change to firm up the prediction.`;
      } else if (
        rule.thresholdPct !== undefined &&
        Math.abs(ffDelta) >= rule.thresholdPct
      ) {
        status = "publish";
        decision = `${vendorLabel(vendorId)}: free-float change ≈ ${ffDelta}pp crosses the ${rule.thresholdPct}% threshold, so this vendor should action it — a missing line is unusual. ${rule.reason}`;
      } else if (rule.thresholdPct !== undefined) {
        status = "suppress";
        decision = `${vendorLabel(vendorId)}: free-float change ≈ ${ffDelta}pp is below the ${rule.thresholdPct}% threshold — deferred to the next review and not in the projection feed yet. ${rule.reason}`;
      }
      break;

    case "threshold-acceptance":
      if (tenderPct === null) {
        status = "indeterminate";
        decision = `${vendorLabel(vendorId)}: ${rule.reason} Provide an acceptance % to make the prediction definite.`;
      } else if (
        rule.thresholdPct !== undefined &&
        tenderPct >= rule.thresholdPct
      ) {
        status = "publish";
        decision = `${vendorLabel(vendorId)}: acceptance ≈ ${tenderPct}% meets the ${rule.thresholdPct}% trigger — this vendor would already publish the deletion line. ${rule.reason}`;
      } else if (rule.thresholdPct !== undefined) {
        status = "suppress";
        decision = `${vendorLabel(vendorId)}: acceptance ≈ ${tenderPct}% is below the ${rule.thresholdPct}% trigger — no deletion line in the projection feed yet. ${rule.reason}`;
      }
      break;

    case "itm-only":
      if (input.rightsItm === "otm") {
        status = "suppress";
        decision = `${vendorLabel(vendorId)}: rights are OUT-OF-THE-MONEY, so this vendor does NOT adjust — absence in the feed is expected and correct. ${rule.reason}`;
      } else if (input.rightsItm === "itm") {
        status = "publish";
        decision = `${vendorLabel(vendorId)}: rights are IN-THE-MONEY, so this vendor DOES adjust — a missing line would be a true gap. ${rule.reason}`;
      } else {
        status = "indeterminate";
        decision = `${vendorLabel(vendorId)}: ITM/OTM is unconfirmed in the inputs. ${rule.reason}`;
      }
      break;

    case "completion-gate":
      status = "indeterminate";
      decision = `${vendorLabel(vendorId)}: ${rule.reason} Until the deal/offer is unconditional, missing-from-projection is the documented behaviour, not a gap.`;
      break;

    case "scheduled-review":
      status = "suppress";
      decision = `${vendorLabel(vendorId)}: this event is batched into the next scheduled review — absence in the open-constituents projection is expected. ${rule.reason}`;
      break;

    case "placeholder-immediate":
      status = "publish";
      decision = `${vendorLabel(vendorId)}: this vendor adds the line immediately at a placeholder price — a missing entry is unusual unless the event is outside the T-5 window. ${rule.reason}`;
      break;

    case "wait-real-trade":
      if (input.spinoffPhase === "live_trade") {
        status = "publish";
        decision = `${vendorLabel(vendorId)}: the child is in regular trading, so this vendor should now have a real-price line. ${rule.reason}`;
      } else {
        status = "suppress";
        decision = `${vendorLabel(vendorId)}: the child is still in placeholder/when-issued phase, so this vendor will not add it until first real trade. ${rule.reason}`;
      }
      break;

    case "estimated-price":
      status = "publish";
      decision = `${vendorLabel(vendorId)}: this vendor uses an estimated price until real trading begins — the line should be present. ${rule.reason}`;
      break;

    case "direct-price-adj":
      status = "publish";
      decision = `${vendorLabel(vendorId)}: applies a direct price adjustment rather than a separate line — if you are looking for a dividend line you will not find one here even though the index level is adjusted. ${rule.reason}`;
      break;

    case "notice-required":
      status = "suppress";
      decision = `${vendorLabel(vendorId)}: requires ${rule.noticeDays ?? 2} trading days of advance notice — even when the threshold is met, the deletion line lags peers by that many days. ${rule.reason}`;
      break;
  }

  return { vendorId, rule, decision, status };
}

// ─── Verdict / summary ──────────────────────────────────────────────────────

function buildSummary(input: SimulatorInput): string {
  const cls = getEventClassFromFamily(input.eventFamily);
  const meta = canonicalEventById(input.eventFamily);
  const eventUpper = `${cls.toUpperCase()} · ${(meta?.name ?? humanFamily(input.eventFamily)).toUpperCase()}`;
  const eff = formatIsoDate(input.effectiveDate);
  const miss = input.missingVendors.map(vendorAbbr).join(" + ") || "—";
  const pres = input.presentVendors.map(vendorAbbr).join(" + ") || "—";
  const note = input.notes.trim()
    ? ` | ${input.notes.trim().slice(0, 120)}${input.notes.trim().length > 120 ? "…" : ""}`
    : "";
  return `${eventUpper} | ${eff} eff | ${miss}: ABSENT ←→ ${pres}: PRESENT${note}`;
}

function buildVerdict(
  input: SimulatorInput,
  judgements: Map<VendorId, VendorVerdict>,
): string {
  const meta = canonicalEventById(input.eventFamily);
  const event = meta?.name ?? humanFamily(input.eventFamily);
  const missing = input.missingVendors;
  const present = input.presentVendors;

  const missingExpected = missing
    .map((v) => judgements.get(v))
    .filter(
      (j): j is VendorVerdict =>
        j !== undefined && (j.status === "suppress" || j.status === "indeterminate"),
    );
  const missingUnexpected = missing
    .map((v) => judgements.get(v))
    .filter((j): j is VendorVerdict => j !== undefined && j.status === "publish");
  const presentExpected = present
    .map((v) => judgements.get(v))
    .filter((j): j is VendorVerdict => j !== undefined && j.status === "publish");

  if (missing.length === 0 && present.length === 0) {
    return `Pick at least one vendor in each column so the simulator can compare ${event} treatments side by side.`;
  }

  if (missingUnexpected.length > 0) {
    const names = missingUnexpected.map((j) => vendorLabel(j.vendorId)).join(", ");
    return `Likely a true data gap: ${names} ${missingUnexpected.length === 1 ? "should" : "should each"} have published this ${event} based on its documented rule, so the absence is anomalous and worth escalating.`;
  }

  if (missingExpected.length > 0 && presentExpected.length > 0) {
    const expectedNames = missingExpected.map((j) => vendorLabel(j.vendorId)).join(", ");
    const presentNames = presentExpected.map((j) => vendorLabel(j.vendorId)).join(", ");
    return `Methodology divergence — not a data gap: ${expectedNames} ${missingExpected.length === 1 ? "is" : "are"} CORRECTLY silent under its own ${event} rule, while ${presentNames} ${presentExpected.length === 1 ? "is" : "are"} CORRECTLY publishing under theirs. The same event hits different thresholds.`;
  }

  if (missingExpected.length > 0) {
    const names = missingExpected.map((j) => vendorLabel(j.vendorId)).join(", ");
    return `Expected silence: ${names} ${missingExpected.length === 1 ? "follows a rule" : "each follow a rule"} that defers or suppresses this ${event} in the projection feed — absence here is the documented behaviour.`;
  }

  return `${event}: every selected vendor is acting consistently with its documented rule — the divergence may be timing or feed lag rather than methodology.`;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export function runSimulator(input: SimulatorInput): SimulatorResult {
  const hypotheses: Hypothesis[] = [];
  const event = input.eventFamily as CanonicalEventId;

  const { onlyMissing, onlyPresent } = onlyMissingPresent(
    input.missingVendors,
    input.presentVendors,
  );

  const dup = overlap(input.missingVendors, input.presentVendors);
  if (dup.length > 0) {
    hypotheses.push({
      id: "input-overlap",
      title: "OVERLAPPING VENDOR SELECTION",
      explanation: `The same vendor cannot be both "missing" and "sent projection" for this exercise: ${listVendors(dup)}. Adjust the selections so each vendor is in at most one list; the verdict assumes non-overlapping lists.`,
      relevance: "high",
      appliesToVendors: dup,
    });
  }

  if (onlyMissing.length === 0 && onlyPresent.length === 0) {
    hypotheses.push({
      id: "no-gap",
      title: "NO GAP SELECTED",
      explanation:
        "Select at least one vendor that appears missing and one that already sent a file so the engine can contrast their documented rules.",
      relevance: "medium",
      appliesToVendors: [],
    });
  }

  const judgements = new Map<VendorId, VendorVerdict>();
  for (const v of [...input.missingVendors, ...input.presentVendors]) {
    if (judgements.has(v)) continue;
    const j = judgeVendor(event, v, input);
    if (j) judgements.set(v, j);
  }

  // One hypothesis per missing vendor — high relevance — explaining why it is silent.
  for (const v of onlyMissing) {
    const j = judgements.get(v);
    if (!j) continue;
    hypotheses.push({
      id: `missing-${v}`,
      title: `${vendorLabel(v).toUpperCase()} — ${j.status === "publish" ? "TRUE GAP" : j.status === "suppress" ? "EXPECTED SILENCE" : "AMBIGUOUS"}`,
      explanation: j.decision,
      relevance: j.status === "publish" ? "high" : "medium",
      appliesToVendors: [v],
      citation: j.rule.citation,
    });
  }

  // One hypothesis per present vendor — medium relevance — explaining why it published.
  for (const v of onlyPresent) {
    const j = judgements.get(v);
    if (!j) continue;
    hypotheses.push({
      id: `present-${v}`,
      title: `${vendorLabel(v).toUpperCase()} — PUBLISHED PER RULE`,
      explanation: j.decision,
      relevance: "medium",
      appliesToVendors: [v],
      citation: j.rule.citation,
    });
  }

  // ── Cross-cutting timing checks (unchanged from v1.x) ────────────────────
  const bdDataToEffective = businessDaysBetween(input.dataAsOf, input.effectiveDate);
  if (bdDataToEffective !== null && bdDataToEffective > 5) {
    hypotheses.push({
      id: "t5-window",
      title: "T-5 WINDOW EXCEEDED",
      explanation: `Your "as of" data date (${formatIsoDate(input.dataAsOf)}) is ${bdDataToEffective} business days before the effective date (${formatIsoDate(input.effectiveDate)}) — outside the documented T-5 forward window. Vendors with strict T-5 publication will not yet have this line in the open-constituents projection.`,
      relevance: "high",
      appliesToVendors: onlyMissing,
      citation: "Vendor Coverage Overview (T-5)",
    });
  }

  if (input.exDate && input.dataAsOf) {
    const bdToEx = businessDaysBetween(input.dataAsOf, input.exDate);
    if (bdToEx !== null && bdToEx > 5) {
      hypotheses.push({
        id: "ex-before-coverage",
        title: "EX-DATE OUTSIDE COVERAGE WINDOW",
        explanation: `Ex-date (${formatIsoDate(input.exDate)}) is ${bdToEx} business days from the as-of date (${formatIsoDate(input.dataAsOf)}). Even vendors that would normally publish may not yet show this event because it falls outside their T-5 forward window.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  // ── Event-specific contextual notes ─────────────────────────────────────
  if (event === "rights-issue" && !input.rightsSubscriptionKnown) {
    hypotheses.push({
      id: "rights-unknown-terms",
      title: "RIGHTS — TERMS NOT FINAL",
      explanation:
        "Final subscription price/ratio are not yet confirmed. Vendors that gate on terms (MSCI, Morningstar, Solactive) typically suppress projection updates until terms are final; FTSE may publish a provisional nil-paid line.",
      relevance: "medium",
      appliesToVendors: onlyMissing,
    });
  }

  if (event === "merger" && input.mnaIndexParties === "both") {
    hypotheses.push({
      id: "mna-both-deletion-triggers",
      title: "M&A — TARGET + ACQUIRER BOTH IN INDEX",
      explanation:
        "Because both parties are constituents, the divergence is dominated by the deletion threshold (S&P Float<15% OR ≥90%, FTSE ≥90% OR Float<5%, STOXX BOTH ≥85% AND Float<10%). Same deal — different effective removal dates by design.",
      relevance: "high",
      appliesToVendors: [...onlyMissing, ...onlyPresent],
      citation: "§11",
    });
  }

  if (event === "merger" && input.mnaIndexParties === "acquirer_only") {
    hypotheses.push({
      id: "mna-acquirer-only",
      title: "M&A — ACQUIRER-ONLY INDEX",
      explanation:
        "With only the acquirer in the index, deletion thresholds are irrelevant — what matters is the acquirer share-count change. MSCI uses 5%/10%/25% by cap tier; STOXX/FTSE flag extraordinary float changes ≥5pp.",
      relevance: "medium",
      appliesToVendors: [...onlyMissing, ...onlyPresent],
      citation: "§11 Scenario C",
    });
  }

  if (event === "spin-off" && input.spinoffChildEligible === "no") {
    hypotheses.push({
      id: "spinoff-ineligible",
      title: "SPIN-OFF CHILD INELIGIBLE",
      explanation:
        "If the distributed security is not index-eligible (sector, liquidity, domicile), no vendor adds a child line — the only line you should expect is the parent price adjustment.",
      relevance: "high",
      appliesToVendors: input.missingVendors,
      citation: "§6",
    });
  }

  // ── Sort, dedup, finalise ───────────────────────────────────────────────
  const dedup = new Map<string, Hypothesis>();
  for (const h of hypotheses) {
    if (!dedup.has(h.id)) dedup.set(h.id, h);
  }
  const sorted = Array.from(dedup.values()).sort(
    (a, b) => relScore(b.relevance) - relScore(a.relevance),
  );

  const nextStepLinks = [
    { label: "Vendor thresholds and timing", href: "/vendors/" },
    { label: "ISO taxonomy", href: "/vendors/iso-taxonomy/" },
    { label: "Event extraction notes", href: "/vendors/event-extraction/" },
  ];

  return {
    summary: buildSummary(input),
    verdict: buildVerdict(input, judgements),
    hypotheses: sorted.slice(0, 12),
    nextStepLinks,
    disclaimer: DISCLAIMER,
    rulesVersion: RULES_VERSION,
  };
}
