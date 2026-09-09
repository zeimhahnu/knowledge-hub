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
};

export type AnalystRuleEvidence = {
  indexType: string;
  conditions: Record<string, string | number | boolean> | null;
  treatment: string | null;
  sourceRef: string | null;
  confidence: "stated" | "inferred" | "absent" | "user-set";
};

export type AnalystLookupContext = {
  ticker: string;
  eventType: string;
  exDate: string;
  selectedVendors: string[];
  matrixRows: AnalystMatrixRow[];
  news: AnalystNewsContext;
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
