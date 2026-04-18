import type { VendorId } from "@/lib/vendors";

export type EventClass = "mandatory" | "voluntary";

export type EventFamily =
  | "dividend"
  | "split"
  | "merger"
  | "spinoff"
  | "rights"
  | "tender"
  | "return_of_capital"
  | "delisting"
  | "other";

/** Rights issue sub-options */
export type RightsItm = "itm" | "otm" | "unknown";

/** M&A sub-options */
export type MnaDealType = "stock" | "cash" | "mixed";
export type MnaIndexParties = "target_only" | "acquirer_only" | "both";

/** Spin-off sub-options */
export type SpinoffChildEligible = "yes" | "no" | "unknown";
export type SpinoffPhase = "placeholder" | "live_trade" | "unknown";

/** Dividend sub-options */
export type DividendFlavor = "ordinary" | "special" | "unknown";
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
  dividendFlavor: DividendFlavor;
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
};

export type SimulatorResult = {
  summary: string;
  hypotheses: Hypothesis[];
  nextStepLinks: { label: string; href: string }[];
  disclaimer: string;
  rulesVersion: string;
};
