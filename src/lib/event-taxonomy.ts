/**
 * Canonical corporate-action event taxonomy for the knowledge hub.
 *
 * Aligned with `SOURCES/index-vendor-methodology.md` (§1–§13) and README
 * “Event Types Covered”. Vendor Comparison (`src/app/vendors/page.tsx`) must
 * stay in sync — `assertVendorEventsMatchCanonical` runs in development.
 */

export type EventBadge = "mandatory" | "voluntary";

export type EventCategory =
  | "Equity Income"
  | "Corporate Structure"
  | "Equity Offerings"
  | "M&A";

export type CanonicalEventMeta = {
  id: string;
  /** Must match `EVENTS[].name` on the Vendor Comparison page */
  name: string;
  badge: EventBadge;
  category: EventCategory;
};

/** Section order per `SOURCES/index-vendor-methodology.md` §1–§13 */
export const CANONICAL_EVENTS: readonly CanonicalEventMeta[] = [
  { id: "cash-dividend", name: "Cash Dividend", badge: "mandatory", category: "Equity Income" },
  { id: "special-dividend", name: "Special Cash Dividend", badge: "voluntary", category: "Equity Income" },
  { id: "stock-dividend", name: "Stock Dividend", badge: "mandatory", category: "Corporate Structure" },
  { id: "bonus-issue", name: "Bonus Issue", badge: "mandatory", category: "Corporate Structure" },
  { id: "stock-split", name: "Stock Split / Consolidation", badge: "mandatory", category: "Corporate Structure" },
  { id: "spin-off", name: "Spin-Off / Demerger", badge: "mandatory", category: "Corporate Structure" },
  { id: "rights-issue", name: "Rights Issue", badge: "voluntary", category: "Equity Offerings" },
  { id: "secondary-offering", name: "Secondary Offering", badge: "voluntary", category: "Equity Offerings" },
  { id: "private-placement", name: "Private Placement", badge: "voluntary", category: "Equity Offerings" },
  { id: "return-of-capital", name: "Return of Capital", badge: "mandatory", category: "Equity Income" },
  { id: "merger", name: "Mergers & Acquisitions", badge: "mandatory", category: "M&A" },
  { id: "tender-offer", name: "Tender Offers", badge: "voluntary", category: "M&A" },
  { id: "bankruptcy", name: "Bankruptcy / Delisting", badge: "mandatory", category: "M&A" },
] as const;

export type CanonicalEventId = (typeof CANONICAL_EVENTS)[number]["id"];

const byId = Object.fromEntries(
  CANONICAL_EVENTS.map((e) => [e.id, e]),
) as Record<CanonicalEventId, CanonicalEventMeta>;

export function canonicalEventById(id: string): CanonicalEventMeta | undefined {
  return byId[id as CanonicalEventId];
}

export function eventsByBadge(badge: EventBadge): readonly CanonicalEventMeta[] {
  return CANONICAL_EVENTS.filter((e) => e.badge === badge);
}

/** Comma-separated names for compact copy (decision tree, glossary, simulator). */
export function eventNamesSentence(badge: EventBadge): string {
  return eventsByBadge(badge)
    .map((e) => e.name)
    .join(", ");
}

export function mandatoryEventCount(): number {
  return eventsByBadge("mandatory").length;
}

export function voluntaryEventCount(): number {
  return eventsByBadge("voluntary").length;
}

/** Verbatim sense of vendor coverage from `SOURCES/index-vendor-methodology.md` §Vendor Coverage Overview */
export const METHODOLOGY_T5_COVERAGE =
  "Data received on calendar day T reflects the index state at close of day T-1, covering corporate actions through T+4 (five business days). Open constituent projections are available at T-5 for all vendors.";

type DecisionTreeOption = { label: string; sub: string; color: string };

export type DecisionTreeStepBlock = {
  step: number;
  question: string;
  hint: string;
  options: DecisionTreeOption[];
};

export function buildDecisionTreeStep2(): DecisionTreeStepBlock {
  return {
    step: 2,
    question: "What type of event is it?",
    hint: "Mandatory = confirmed by the company without shareholder opt-in. Voluntary = participation or classification rules decide treatment. Regular cash dividends are mandatory; special cash dividends are voluntary — same taxonomy as the Vendor Reference.",
    options: [
      {
        label: "Mandatory",
        sub: `${mandatoryEventCount()} types — ${eventNamesSentence("mandatory")}`,
        color: "bg-green-500/10 border-green-500/30 text-green-400",
      },
      {
        label: "Voluntary",
        sub: `${voluntaryEventCount()} types — ${eventNamesSentence("voluntary")}`,
        color: "bg-orange-500/10 border-orange-500/30 text-orange-400",
      },
    ],
  };
}

export function assertVendorEventsMatchCanonical(
  events: readonly { id: string; name: string; badge: EventBadge }[],
): void {
  if (process.env.NODE_ENV !== "development") return;

  if (events.length !== CANONICAL_EVENTS.length) {
    throw new Error(
      `EVENTS length ${events.length} !== canonical ${CANONICAL_EVENTS.length}`,
    );
  }

  for (const e of events) {
    const c = canonicalEventById(e.id);
    if (!c) throw new Error(`Unknown event id in EVENTS: ${e.id}`);
    if (c.badge !== e.badge) {
      throw new Error(`Badge mismatch for ${e.id}: EVENTS has ${e.badge}, canonical has ${c.badge}`);
    }
    if (c.name !== e.name) {
      throw new Error(`Name mismatch for ${e.id}: EVENTS "${e.name}" vs canonical "${c.name}"`);
    }
  }

  for (const c of CANONICAL_EVENTS) {
    if (!events.some((e) => e.id === c.id)) {
      throw new Error(`Canonical event ${c.id} missing from EVENTS`);
    }
  }
}
