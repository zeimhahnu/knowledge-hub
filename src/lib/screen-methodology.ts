import screeningRules from "../data/screening-rules.json" with { type: "json" };

export interface ScreeningVerdict {
  accepted: boolean;
  reasons: string[];
}

const { domainTerms, injectionPatterns, limits } = screeningRules;

function domainHits(text: string): string[] {
  const normalized = text.toLowerCase();
  return domainTerms.filter((term) => normalized.includes(term));
}

function mentionsVendor(text: string, vendor: string): boolean {
  const stem = vendor.replaceAll("-", " ").trim().toLowerCase();
  if (!stem) return false;

  const normalized = text.toLowerCase();
  return normalized.includes(stem) || normalized.replaceAll(" ", "").includes(stem.replaceAll(" ", ""));
}

function injectionMatches(text: string): string[] {
  return injectionPatterns.filter((pattern) => new RegExp(pattern, "i").test(text));
}

/**
 * Deterministically screens a PDF's extracted text before it can enter ingest.
 * Rules are imported from the shared JSON so this stays aligned with the CLI.
 */
export function judge(text: string, vendor: string): ScreeningVerdict {
  const reasons: string[] = [];

  if (text.length < limits.minChars) {
    reasons.push(
      `only ${text.length} chars of extractable text (need ${limits.minChars}) — scanned or image-only PDFs cannot be cited by section and page`,
    );
  }

  const hits = domainHits(text);
  if (hits.length < limits.minDomainHits) {
    reasons.push(
      `reads ${hits.length}/${limits.minDomainHits} required corporate-action terms (${hits.join(", ") || "none"}) — this does not look like an index methodology document`,
    );
  }

  if (!mentionsVendor(text, vendor)) {
    reasons.push(
      `the document never mentions ${JSON.stringify(vendor)} — either the vendor is wrong or the file is mis-filed (Risk R1)`,
    );
  }

  const injections = injectionMatches(text);
  if (injections.length > 0) {
    reasons.push(
      `contains ${injections.length} instruction-injection pattern(s) a methodology document has no reason to carry — refusing to hand this to an agent with tools`,
    );
  }

  return { accepted: reasons.length === 0, reasons };
}
