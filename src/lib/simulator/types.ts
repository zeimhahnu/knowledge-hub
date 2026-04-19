import type { CanonicalEventId } from "@/lib/event-taxonomy";
import type { VendorId } from "@/lib/vendors";

export type EventClass = "mandatory" | "voluntary";

/**
 * The simulator’s event family is the canonical 13-type ISO CAEV taxonomy
 * defined in `@/lib/event-taxonomy` — same ids the Vendor Reference uses.
 * This guarantees the simulator, the homepage decision tree, and the vendor
 * comparison page stay in lockstep.
 */
export type EventFamily = CanonicalEventId;

/** Rights issue sub-options */
export type RightsItm = "itm" | "otm" | "unknown";

/** M&A sub-options */
export type MnaDealType = "stock" | "cash" | "mixed";
export type MnaIndexParties = "target_only" | "acquirer_only" | "both";

/** Spin-off sub-options */
export type SpinoffChildEligible = "yes" | "no" | "unknown";
export type SpinoffPhase = "placeholder" | "live_trade" | "unknown";

/** Dividend sub-options — applies to cash-dividend & special-dividend */
export type IndexReturnVariant = "pr" | "tr" | "ntr" | "unknown";

export type Relevance = "high" | "medium" | "low";

/** Optional numeric hints — empty string in UI means “not provided”. */
export type SimulatorMetrics = {
  dividendYieldPct: string;
  freeFloatChangePp: string;
  tenderAcceptancePct: string;
  rightsDiscountPct: string;
};

export type SimulatorInput = {
  /** High-level filter for which event types appear — class is implied by `eventFamily`. */
  eventCategory: EventClass;
  eventFamily: EventFamily;
  /** Sub-fields — only relevant subsets used per family */
  rightsItm: RightsItm;
  rightsSubscriptionKnown: boolean;
  mnaDealType: MnaDealType;
  mnaIndexParties: MnaIndexParties;
  spinoffChildEligible: SpinoffChildEligible;
  spinoffPhase: SpinoffPhase;
  indexReturnVariant: IndexReturnVariant;
  metrics: SimulatorMetrics;
  effectiveDate: string; // YYYY-MM-DD
  exDate: string;
  dataAsOf: string; // YYYY-MM-DD
  missingVendors: VendorId[];
  presentVendors: VendorId[];
  notes: string;
};

export type Hypothesis = {
  id: string;
  title: string;
  explanation: string;
  relevance: Relevance;
  appliesToVendors: VendorId[];
  /** Optional pointer to the methodology section that backs the explanation. */
  citation?: string;
};

export type SimulatorResult = {
  summary: string;
  /** One short, definite sentence stating WHY the divergence occurred. */
  verdict: string;
  hypotheses: Hypothesis[];
  nextStepLinks: { label: string; href: string }[];
  disclaimer: string;
  rulesVersion: string;
};
