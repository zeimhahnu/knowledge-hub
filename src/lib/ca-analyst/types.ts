export const ANALYST_ERROR_CODES = [
  "invalid_request",
  "access_required",
  "rate_limited",
  "budget_exhausted",
  "service_unavailable",
  "citation_validation_failed",
  "cancelled",
] as const;

export type AnalystErrorCode = (typeof ANALYST_ERROR_CODES)[number];

export type AnalystCitation =
  | { kind: "document"; ref: string; label: string }
  | { kind: "url"; url: string; label: string };

export type AnalystNewsContext = {
  validationRan: boolean;
  verdict: "confirmed" | "contradicted" | "unverified";
  confidence: "high" | "medium" | "low";
  warning?: string;
  sources: Array<{ url: string; title: string; publishedAt: string }>;
};

export type AnalystMatrixRow = {
  vendor: string;
  state:
    | "covered"
    | "not-yet-due"
    | "missing"
    | "not-assessed"
    | "not-applicable";
  provenance: "measured" | "news-confirmed" | "inferred" | "no-rule";
  ruleRefs: string[];
  rules: AnalystRuleEvidence[];
  /** Hub-computed: the vendor carries the change to its next review (plan-coac-1.0 M6). */
  deferral?: { timing: "threshold-gated" | "at-review"; reviewDate: string | null; finding: string };
  /** The vendor's stated fallback when no row covers the event. */
  uncoveredPolicy?: { treatment: string; sourceRef: string };
};

export type AnalystRuleEvidence = {
  indexType: string;
  conditions: Record<string, string | number | boolean> | null;
  treatment: string | null;
  sourceRef: string | null;
  confidence: "stated" | "inferred" | "absent" | "user-set";
};

/**
 * Cross-vendor entailment, already computed and rendered in the UI.
 *
 * `divergence` compares what two methodologies SAY. Entailment compares a
 * methodology against what the operator OBSERVED, using one vendor's
 * publication as evidence about another's silence. Until 2026-09-16 it was
 * never sent: the model re-derived the same reasoning from raw rule text and
 * happened to agree, so two engines computed one verdict and nothing would
 * have detected the day they diverged.
 */
export type AnalystEntailment = {
  vendor: string;
  verdict: "contradicted" | "consistent" | "indeterminate";
  reason: string;
  drivers: string[];
  scope: "3-d" | "2-d";
};

export type AnalystLookupContext = {
  ticker: string;
  eventType: string;
  exDate: string;
  selectedVendors: string[];
  matrixRows: AnalystMatrixRow[];
  news: AnalystNewsContext;
  entailment?: AnalystEntailment[];
  company?: string;
  /** The operator's answers on the lookup page; absent when none was given. */
  qualifiers?: AnalystQualifiers;
  /** Hub-computed size classification of the yield per vendor with a numeric boundary (M4). */
  dividendChecks?: AnalystDividendCheck[];
};

export type AnalystQualifiers = {
  dividendYieldPct?: number;
  conditions?: Record<string, string>;
};

export type AnalystDividendCheck = {
  vendor: string;
  thresholdPct: number;
  classifiedAs: "special" | "ordinary";
  conflicts: boolean;
};

export type AnalystTurnRequest = {
  lookup: AnalystLookupContext;
  question: string;
  requestDeepReasoning?: boolean;
};

export type AnalystStreamEvent =
  | { type: "status"; stage: "validating" | "retrieving" | "reasoning" }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: AnalystCitation[] }
  | {
      type: "done";
      answer: string;
      sources: AnalystCitation[];
      modelTier: "flash" | "pro";
    }
  | {
      type: "error";
      code: AnalystErrorCode;
      message: string;
      retryable: boolean;
    };

export type AnalystUiTurn = {
  answer: string;
  sources: AnalystCitation[];
  modelTier?: "flash" | "pro";
  stage?: "validating" | "retrieving" | "reasoning";
  status: "idle" | "streaming" | "complete" | "error" | "cancelled";
  error?: { code: AnalystErrorCode; message: string; retryable: boolean };
};
