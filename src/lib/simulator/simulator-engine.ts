import type { VendorId } from "@/lib/vendors";
import { vendorLabel } from "@/lib/vendors";
import type {
  EventFamily,
  Hypothesis,
  Relevance,
  SimulatorInput,
  SimulatorResult,
} from "@/lib/simulator/types";

const RULES_VERSION = "1.0.0";

const DISCLAIMER =
  "This simulator produces possible explanations only. It does not replace official vendor methodology, notices, or your internal policy. Always confirm with vendor documentation and primary sources.";

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

/**
 * Business days strictly after `fromIso` through `toIso` inclusive (Mon–Fri only; ignores holidays).
 * Wed → next Wed = 5.
 */
function businessDaysAfterThrough(fromIso: string, toIso: string): number | null {
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
  return uniqueVendors(ids).map(vendorLabel).join(", ");
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

function buildSummary(input: SimulatorInput): string {
  const eventLabel = `${input.eventClass === "mandatory" ? "Mandatory" : "Voluntary"} / ${humanFamily(input.eventFamily)}`;
  const eff = formatIsoDate(input.effectiveDate);
  const asOf = formatIsoDate(input.dataAsOf);
  const miss = listVendors(input.missingVendors);
  const pres = listVendors(input.presentVendors);
  const note = input.notes.trim()
    ? ` Context: ${input.notes.trim().slice(0, 200)}${input.notes.trim().length > 200 ? "…" : ""}`
    : "";
  return `You described a ${eventLabel} with effective date ${eff}. Projection files as of ${asOf} appear missing for: ${miss || "—"}. Present from: ${pres || "—"}.${note}`;
}

function humanFamily(f: EventFamily): string {
  const map: Record<EventFamily, string> = {
    dividend: "Dividend",
    split: "Stock split / consolidation",
    merger: "M&A",
    spinoff: "Spin-off",
    rights: "Rights issue",
    tender: "Tender / buyback",
    return_of_capital: "Return of capital",
    delisting: "Delisting",
    other: "Other corporate action",
  };
  return map[f];
}

export function runSimulator(input: SimulatorInput): SimulatorResult {
  const hypotheses: Hypothesis[] = [];
  const { onlyMissing, onlyPresent } = onlyMissingPresent(
    input.missingVendors,
    input.presentVendors,
  );

  const dup = overlap(input.missingVendors, input.presentVendors);
  if (dup.length > 0) {
    hypotheses.push({
      id: "input-overlap",
      title: "Overlapping vendor selection",
      explanation: `The same vendor cannot be both "missing" and "sent projection" for this exercise: ${listVendors(dup)}. Adjust the selections so each vendor is in at most one list; other hypotheses below assume non-overlapping lists.`,
      relevance: "high",
      appliesToVendors: dup,
    });
  }

  if (onlyMissing.length === 0 && onlyPresent.length === 0) {
    hypotheses.push({
      id: "no-gap",
      title: "No vendor gap selected",
      explanation:
        "Select at least one vendor that appears missing and one that sent a projection file so the simulator can contrast behaviour. If everyone is aligned, divergence may be timing-only or already resolved.",
      relevance: "medium",
      appliesToVendors: [],
    });
  }

  const bdDataToEffective = businessDaysAfterThrough(input.dataAsOf, input.effectiveDate);
  if (bdDataToEffective !== null && bdDataToEffective > 5) {
    hypotheses.push({
      id: "t5-window",
      title: "T-5 style coverage window",
      explanation: `Your "as of" data date (${formatIsoDate(input.dataAsOf)}) is more than five business days before the effective date (${formatIsoDate(input.effectiveDate)}). Vendors commonly publish open-constituent projections for events that fall within a forward coverage window from the data date. Events far outside that window may not appear in projection feeds yet for some vendors, even if others publish earlier placeholders or notices.`,
      relevance: "high",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.exDate && input.dataAsOf) {
    const bdToEx = businessDaysAfterThrough(input.dataAsOf, input.exDate);
    if (bdToEx !== null && bdToEx > 5) {
      hypotheses.push({
        id: "ex-before-coverage",
        title: "Ex-date vs projection snapshot",
        explanation: `Ex-date is ${formatIsoDate(input.exDate)} relative to data as of ${formatIsoDate(input.dataAsOf)}. Some vendors emphasise ex-date adjustments and grace-period logic; others may delay spin-off child lines until first trade. A large gap between snapshot and ex-date can produce "missing now, appears later" patterns.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventClass === "voluntary") {
    hypotheses.push({
      id: "voluntary-uncertainty",
      title: "Voluntary event — participation unknown",
      explanation:
        "Rights issues, tenders, and similar voluntary actions often require confirmed subscription or acceptance levels before all vendors adjust floats or share counts. It is common for one vendor to reflect partial information (or an early line) while another waits for final results — especially where free-float or materiality thresholds differ.",
      relevance: "high",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.eventFamily === "merger") {
    if (input.mnaIndexParties === "both") {
      hypotheses.push({
        id: "mna-both-deletion-triggers",
        title: "Target deletion triggers differ when both names are in the index",
        explanation:
          "When target and acquirer are both index constituents, deletion and float rules diverge materially across vendors (e.g. different combinations of acceptance % and free-float conditions). The same deal can therefore show different effective removal dates or interim placeholder treatment in projections.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    }
    if (input.mnaIndexParties === "acquirer_only") {
      hypotheses.push({
        id: "mna-acquirer-only",
        title: "Acquirer-only index — adjustment type varies by deal consideration",
        explanation:
          "If only the acquirer is in the index, vendors still disagree on how and when to reflect share count and float changes for stock vs cash consideration, and on confirmation gates. One feed may show an early divisor-related adjustment while another waits for settlement or exchange confirmation.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
    if (input.mnaDealType === "cash") {
      hypotheses.push({
        id: "mna-cash",
        title: "Cash deal — different adjustment mechanics vs stock",
        explanation:
          "Cash mergers are often treated differently from stock mergers for divisor and continuity. A vendor that already published a projection line may be using a different confirmation or price basis than one that is still silent.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventFamily === "spinoff") {
    if (input.spinoffChildEligible === "no") {
      hypotheses.push({
        id: "spinoff-ineligible",
        title: "Ineligible spin-off child — not all vendors will add a line",
        explanation:
          "If the distributed security is not index-eligible (sector, liquidity, domicile), many methodologies never add a child line in projections. Missing vendors may simply not publish a placeholder for a security outside index rules.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (input.spinoffChildEligible === "yes") {
      hypotheses.push({
        id: "spinoff-placeholder-vs-trade",
        title: "Placeholder vs first-trade price",
        explanation:
          "For an eligible spin-off child, vendors disagree on zero vs estimated vs when-issued pricing, and on how long to wait for real trading. Vendors that use immediate placeholders often appear in feeds earlier than those that require a live market price.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
      if (input.spinoffPhase === "placeholder") {
        hypotheses.push({
          id: "spinoff-phase-placeholder",
          title: "You are still in the placeholder phase",
          explanation:
            "If the child has not yet traded regularly, vendors that require a market price may omit the line from projections until first trade, while others already show a floor or estimated price.",
          relevance: "high",
          appliesToVendors: onlyMissing,
        });
      }
    }
  }

  if (input.eventFamily === "rights") {
    if (input.rightsItm === "otm") {
      hypotheses.push({
        id: "rights-otm",
        title: "Out-of-the-money rights — many vendors ignore",
        explanation:
          "OTM rights are often economically irrelevant for index replication; several methodologies do not adjust until or unless terms change or the issue becomes in-the-money. A vendor showing nothing may be consistent with that policy.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (input.rightsItm === "itm") {
      hypotheses.push({
        id: "rights-itm",
        title: "In-the-money rights — timing and float still diverge",
        explanation:
          "ITM rights usually require attention, but vendors still differ on nil-paid lines, subscription results, and free-float effects from non-participation. One vendor may publish a provisional line while another waits for final take-up.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
    if (!input.rightsSubscriptionKnown) {
      hypotheses.push({
        id: "rights-unknown-terms",
        title: "Incomplete terms — vendor gating",
        explanation:
          "If subscription price or ratio is not yet final, some vendors suppress projection updates until terms are confirmed, while others publish provisional lines subject to revision.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventFamily === "dividend") {
    if (input.dividendFlavor === "special") {
      hypotheses.push({
        id: "div-special",
        title: "Special dividend — different treatment vs ordinary",
        explanation:
          "Special dividends can be classified and adjusted differently across vendors (price return vs total return series, timing vs ex-date, and materiality). A vendor missing the line may be applying a different event classification or waiting for confirmed gross/net amounts.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
    if (input.indexReturnVariant !== "unknown") {
      hypotheses.push({
        id: "div-pr-tr-ntr",
        title: "PR vs TR vs NTR series",
        explanation:
          "Dividend impact is most visible on total-return variants. If you are comparing price-return screens to TR/NTR feeds, apparent mismatches can be series selection rather than missing corporate action data.",
        relevance: "low",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventFamily === "other" || input.eventFamily === "delisting" || input.eventFamily === "tender") {
    hypotheses.push({
      id: "generic-methodology",
      title: "Methodology or feed lag",
      explanation:
        "For less common or boundary cases, divergence often comes down to confirmation gates, exchange notices, or feed publication lag rather than disagreement on the economic event. Compare vendor timing tables and check whether the missing feed has published any notice without yet updating open constituents.",
      relevance: "low",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.eventFamily === "split") {
    hypotheses.push({
      id: "split-timing",
      title: "Split ratio confirmation",
      explanation:
        "Stock splits are usually straightforward once confirmed, but vendors can still differ on the snapshot date used for divisor adjustment vs when the split first appears in projection files.",
      relevance: "low",
      appliesToVendors: onlyMissing,
    });
  }

  const pilotFamilies: EventFamily[] = [
    "dividend",
    "split",
    "merger",
    "spinoff",
    "rights",
  ];
  if (!pilotFamilies.includes(input.eventFamily)) {
    hypotheses.push({
      id: "pilot-stub",
      title: "Deeper rules coming in a later release",
      explanation:
        "Pilot coverage in this version focuses on dividends, splits, M&A, spin-offs, and rights. For this event family, use the Vendor reference for thresholds and timing, and treat simulator output as high-level only.",
      relevance: "low",
      appliesToVendors: onlyMissing,
    });
  }

  const dedup = new Map<string, Hypothesis>();
  for (const h of hypotheses) {
    if (!dedup.has(h.id)) dedup.set(h.id, h);
  }
  const sorted = Array.from(dedup.values()).sort(
    (a, b) => relScore(b.relevance) - relScore(a.relevance),
  );

  const nextStepLinks = [
    { label: "Vendor thresholds & timing", href: "/vendors/" },
    { label: "ISO taxonomy cross-reference", href: "/vendors/iso-taxonomy/" },
    { label: "Event extraction notes", href: "/vendors/event-extraction/" },
  ];

  return {
    summary: buildSummary(input),
    hypotheses: sorted.slice(0, 8),
    nextStepLinks,
    disclaimer: DISCLAIMER,
    rulesVersion: RULES_VERSION,
  };
}
