import type { VendorId } from "@/lib/vendors";
import { vendorAbbr } from "@/lib/vendors";
import { getEventClassFromFamily, humanFamily } from "@/lib/simulator/taxonomy";
import type {
  EventFamily,
  Hypothesis,
  Relevance,
  SimulatorInput,
  SimulatorResult,
} from "@/lib/simulator/types";

const RULES_VERSION = "1.2.0";

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

function buildSummary(input: SimulatorInput): string {
  const cls = getEventClassFromFamily(input.eventFamily);
  const eventUpper = `${cls.toUpperCase()} · ${humanFamily(input.eventFamily).toUpperCase()}`;
  const eff = formatIsoDate(input.effectiveDate);
  const miss = input.missingVendors.map(vendorAbbr).join(" + ") || "—";
  const pres = input.presentVendors.map(vendorAbbr).join(" + ") || "—";
  const note = input.notes.trim()
    ? ` | ${input.notes.trim().slice(0, 120)}${input.notes.trim().length > 120 ? "…" : ""}`
    : "";
  return `${eventUpper} | ${eff} eff | ${miss}: ABSENT ←→ ${pres}: PRESENT${note}`;
}

export function runSimulator(input: SimulatorInput): SimulatorResult {
  const hypotheses: Hypothesis[] = [];
  const { onlyMissing, onlyPresent } = onlyMissingPresent(
    input.missingVendors,
    input.presentVendors,
  );
  const eventClass = getEventClassFromFamily(input.eventFamily);
  const divYield = parseOptionalPct(input.metrics.dividendYieldPct);
  const ffDelta = parseOptionalPct(input.metrics.freeFloatChangePp);
  const tenderPct = parseOptionalPct(input.metrics.tenderAcceptancePct);
  const rightsDisc = parseOptionalPct(input.metrics.rightsDiscountPct);
  const offeringSizePct = parseOptionalPct(input.metrics.offeringSizePctOfMc);

  const dup = overlap(input.missingVendors, input.presentVendors);
  if (dup.length > 0) {
    hypotheses.push({
      id: "input-overlap",
      title: "OVERLAPPING VENDOR SELECTION",
      explanation: `The same vendor cannot be both "missing" and "sent projection" for this exercise: ${listVendors(dup)}. Adjust the selections so each vendor is in at most one list; other hypotheses below assume non-overlapping lists.`,
      relevance: "high",
      appliesToVendors: dup,
    });
  }

  if (onlyMissing.length === 0 && onlyPresent.length === 0) {
    hypotheses.push({
      id: "no-gap",
      title: "NO GAP SELECTED",
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
      title: "T-5 WINDOW EXCEEDED",
      explanation: `Your "as of" data date (${formatIsoDate(input.dataAsOf)}) is more than five business days before the effective date (${formatIsoDate(input.effectiveDate)}). Vendors often publish open-constituent projections for events within a forward window from the data date. Events far outside that window may not appear in some feeds yet, even if others publish earlier placeholders or notices.`,
      relevance: "high",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.exDate && input.dataAsOf) {
    const bdToEx = businessDaysAfterThrough(input.dataAsOf, input.exDate);
    if (bdToEx !== null && bdToEx > 5) {
      hypotheses.push({
        id: "ex-before-coverage",
        title: "EX-DATE FAR FROM SNAPSHOT",
        explanation: `Ex-date is ${formatIsoDate(input.exDate)} relative to data as of ${formatIsoDate(input.dataAsOf)}. Some vendors emphasise ex-date adjustments and grace-period logic; others may delay spin-off child lines until first trade. A large gap between snapshot and ex-date can produce "missing now, appears later" patterns.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (eventClass === "voluntary") {
    hypotheses.push({
      id: "voluntary-uncertainty",
      title: "VOLUNTARY EVENT — PARTICIPATION OPEN",
      explanation:
        "Rights issues, tenders, secondary offerings, private placements, and similar voluntary actions often need confirmed subscription, acceptance, or allocation before every vendor adjusts floats or share counts. One feed may show an early or provisional line while another waits for final results — especially where free-float or materiality thresholds differ.",
      relevance: "high",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.eventFamily === "dividend" && divYield !== null) {
    if (input.dividendFlavor === "special" && divYield >= 5) {
      hypotheses.push({
        id: "div-yield-special-large",
        title: "LARGE SPECIAL DIVIDEND",
        explanation: `You indicated a dividend yield of about ${divYield}% of price. A large special distribution can change how vendors classify the event (e.g. return of capital vs dividend) and whether it is deferred or treated across PR vs TR series. Some feeds wait for confirmed gross or net amounts before publishing a projection line.`,
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (divYield >= 3 && input.dividendFlavor !== "ordinary") {
      hypotheses.push({
        id: "div-yield-material",
        title: "MATERIAL DIVIDEND — THRESHOLD RISK",
        explanation: `A dividend of roughly ${divYield}% of price may cross materiality thresholds for some vendors but not others, or may be handled differently on PR vs TR. Below-threshold amounts can be deferred to the next review cycle on some indices.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (ffDelta !== null && Math.abs(ffDelta) >= 5) {
    hypotheses.push({
      id: "float-delta",
      title: "FREE-FLOAT CHANGE DETECTED",
      explanation: `You entered about ${ffDelta >= 0 ? "+" : ""}${ffDelta} percentage points of free-float change. Several vendors apply extraordinary float adjustments or different timing when float moves by roughly five points or more. That alone can explain why one feed already reflects a line and another does not.`,
      relevance: "high",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.eventFamily === "tender" && tenderPct !== null) {
    if (tenderPct < 50) {
      hypotheses.push({
        id: "tender-low",
        title: "LOW TENDER ACCEPTANCE",
        explanation: `With acceptance around ${tenderPct}%, some methodologies will not treat the offer as sufficiently progressed to adjust or delete lines, while others may publish provisional scenarios. Divergence often appears around the acceptance thresholds each vendor publishes.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    } else if (tenderPct >= 85) {
      hypotheses.push({
        id: "tender-high",
        title: "HIGH ACCEPTANCE — TIMING DIVERGES",
        explanation: `Around ${tenderPct}% acceptance often crosses key thresholds, but vendors still disagree on when a target line is removed or when float is updated — especially if conditions combine acceptance % with free-float tests.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventFamily === "rights" && rightsDisc !== null && rightsDisc > 0) {
    hypotheses.push({
      id: "rights-discount",
      title: "RIGHTS BELOW THEORETICAL",
      explanation: `You noted the rights trade roughly ${rightsDisc}% below theoretical value. Deep discounts can correlate with low exercise expectations; some vendors delay or omit adjustments until the outcome is clearer, while others publish nil-paid lines earlier.`,
      relevance: "low",
      appliesToVendors: onlyMissing,
    });
  }

  if (input.eventFamily === "secondary_offering") {
    if (offeringSizePct !== null && offeringSizePct >= 5) {
      hypotheses.push({
        id: "secondary-offering-large",
        title: "LARGE SECONDARY OFFERING",
        explanation: `You indicated the new issue is on the order of ${offeringSizePct}% of market cap (roughly the “~5%” stress band many desks use). At that scale, float and share-count narratives skew toward immediate or near-term adjustment in several methodologies, while others may still wait for settlement, exchange notice, or confirmed allocation — producing the gap you are seeing.`,
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (offeringSizePct !== null && offeringSizePct < 5) {
      hypotheses.push({
        id: "secondary-offering-below-threshold",
        title: "SECONDARY OFFERING BELOW SIZE STRESS BAND",
        explanation: `Around ${offeringSizePct}% of market cap sits below the common ~5% “large deal” heuristic. Smaller issues are more often treated as below immediate materiality: some vendors defer to the next quarterly index review (QIR) language while another feed already carries a placeholder or early line.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    } else {
      hypotheses.push({
        id: "secondary-offering-materiality",
        title: "SECONDARY OFFERING — SIZE AND FLOAT",
        explanation:
          "Secondary offerings are materiality- and free-float sensitive. Vendors disagree on when share count updates versus when lines first appear in open-constituent files. Add a rough % of market cap under optional numbers if you can — the simulator uses ~5% as a simple split between “more immediate adjustment” vs “more QIR / deferred” framing.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventFamily === "private_placement") {
    if (offeringSizePct !== null && offeringSizePct >= 5) {
      hypotheses.push({
        id: "private-placement-material",
        title: "MATERIAL PRIVATE PLACEMENT",
        explanation: `You indicated roughly ${offeringSizePct}% of market cap. Above the common ~5% materiality heuristic, several vendors lean toward immediate adjustment or urgent divisor-related updates once terms are confirmed; others may still lag on feed publication — not because they disagree on economics, but because of confirmation gates.`,
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (offeringSizePct !== null && offeringSizePct < 5) {
      hypotheses.push({
        id: "private-placement-below-material",
        title: "PRIVATE PLACEMENT — BELOW MATERIALITY HEURISTIC",
        explanation: `Around ${offeringSizePct}% of market cap is below the ~5% band used here as a simple materiality split. Below-threshold placements are often aligned with deferred-to-QIR narratives on some indices while another vendor already reflects a provisional line — match this to Step 4 style materiality questions in your own process.`,
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    } else {
      hypotheses.push({
        id: "private-placement-materiality-unknown",
        title: "PRIVATE PLACEMENT — MATERIALITY GATE",
        explanation:
          "Private placements usually turn on whether the issue crosses each vendor’s materiality threshold relative to float and index rules. Without a rough issue size, treat divergence as timing and confirmation: one feed may wait for regulatory or exchange finality while another publishes earlier. Add % of market cap under optional numbers for a sharper split.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
  }

  if (input.eventFamily === "merger") {
    if (input.mnaIndexParties === "both") {
      hypotheses.push({
        id: "mna-both-deletion-triggers",
        title: "M&A: TARGET + ACQUIRER IN INDEX",
        explanation:
          "When target and acquirer are both index constituents, deletion and float rules diverge materially across vendors (e.g. different combinations of acceptance % and free-float conditions). The same deal can therefore show different effective removal dates or interim placeholder treatment in projections.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    }
    if (input.mnaIndexParties === "acquirer_only") {
      hypotheses.push({
        id: "mna-acquirer-only",
        title: "M&A: ACQUIRER-ONLY INDEX",
        explanation:
          "If only the acquirer is in the index, vendors still disagree on how and when to reflect share count and float changes for stock vs cash consideration, and on confirmation gates. One feed may show an early divisor-related adjustment while another waits for settlement or exchange confirmation.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
    if (input.mnaDealType === "cash") {
      hypotheses.push({
        id: "mna-cash",
        title: "CASH DEAL — DIFFERENT ADJUSTMENT",
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
        title: "SPIN-OFF CHILD INELIGIBLE",
        explanation:
          "If the distributed security is not index-eligible (sector, liquidity, domicile), many methodologies never add a child line in projections. Missing vendors may simply not publish a placeholder for a security outside index rules.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (input.spinoffChildEligible === "yes") {
      hypotheses.push({
        id: "spinoff-placeholder-vs-trade",
        title: "SPIN-OFF: PLACEHOLDER VS LIVE TRADE",
        explanation:
          "For an eligible spin-off child, vendors disagree on zero vs estimated vs when-issued pricing, and on how long to wait for real trading. Vendors that use immediate placeholders often appear in feeds earlier than those that require a live market price.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
      if (input.spinoffPhase === "placeholder") {
        hypotheses.push({
          id: "spinoff-phase-placeholder",
          title: "SPIN-OFF: STILL IN PLACEHOLDER PHASE",
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
        title: "OTM RIGHTS — VENDORS IGNORE",
        explanation:
          "OTM rights are often economically irrelevant for index replication; several methodologies do not adjust until or unless terms change or the issue becomes in-the-money. A vendor showing nothing may be consistent with that policy.",
        relevance: "high",
        appliesToVendors: onlyMissing,
      });
    } else if (input.rightsItm === "itm") {
      hypotheses.push({
        id: "rights-itm",
        title: "ITM RIGHTS — TIMING + FLOAT DIVERGE",
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
          "Special dividends can be classified and adjusted differently across vendors (price return vs total return series, timing vs ex-date, and materiality). A vendor missing the line may be applying a different event classification or waiting for confirmed gross or net amounts.",
        relevance: "medium",
        appliesToVendors: onlyMissing,
      });
    }
    if (input.indexReturnVariant !== "unknown") {
      hypotheses.push({
        id: "div-pr-tr-ntr",
        title: "PR vs TR vs NTR series",
        explanation:
          "Dividend impact is most visible on total-return variants. If you are comparing price-return screens to TR or NTR feeds, apparent mismatches can be series selection rather than missing corporate action data.",
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
    "tender",
    "secondary_offering",
    "private_placement",
  ];
  if (!pilotFamilies.includes(input.eventFamily)) {
    hypotheses.push({
      id: "pilot-stub",
      title: "Broader reference may be needed",
      explanation:
        "The richest rule set here focuses on dividends, splits, M&A, spin-offs, rights, tenders, secondary offerings, and private placements. For this event type, lean on the vendor reference for thresholds and timing, and treat simulator output as a starting point.",
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
    { label: "Vendor thresholds and timing", href: "/vendors/" },
    { label: "ISO taxonomy", href: "/vendors/iso-taxonomy/" },
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
