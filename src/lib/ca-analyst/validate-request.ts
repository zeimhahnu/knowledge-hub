/**
 * The relay's payload validator, kept OUT of route.ts on purpose.
 *
 * route.ts imports next/server and uses extensionless relative imports, so bare
 * node cannot load it and no scripts/check-*.mjs could ever reach this function.
 * That is why the `conditions` bug below survived: the single gate standing
 * between the browser and the Analyst had no test at all.
 */
import { VENDOR_IDS } from "../vendors.ts";

const VENDORS = new Set<string>(VENDOR_IDS);
const STATES = new Set(["covered", "not-yet-due", "missing", "not-assessed", "not-applicable"]);
const PROVENANCE = new Set(["measured", "news-confirmed", "inferred", "no-rule"]);
const RULE_CONFIDENCE = new Set(["stated", "inferred", "absent", "user-set"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ownKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const boundedString = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function validDate(value: unknown) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validRequest(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (!ownKeys(request, ["lookup", "question", "requestDeepReasoning"]) || !boundedString(request.question, 1200)) return false;
  if (request.requestDeepReasoning !== undefined && typeof request.requestDeepReasoning !== "boolean") return false;
  const lookup = request.lookup;
  if (!lookup || typeof lookup !== "object" || Array.isArray(lookup)) return false;
  const l = lookup as Record<string, unknown>;
  if (!ownKeys(l, ["ticker", "eventType", "exDate", "selectedVendors", "matrixRows", "news", "entailment"]) ||
      !boundedString(l.ticker, 15) || !boundedString(l.eventType, 64) || !validDate(l.exDate)) return false;
  if (!Array.isArray(l.selectedVendors) || l.selectedVendors.length > 7 || l.selectedVendors.some((v) => typeof v !== "string" || !VENDORS.has(v))) return false;
  if (!Array.isArray(l.matrixRows) || l.matrixRows.length > 7 || l.matrixRows.some((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return true;
    const r = row as Record<string, unknown>;
    return !ownKeys(r, ["vendor", "state", "provenance", "ruleRefs", "rules"]) || typeof r.vendor !== "string" || !VENDORS.has(r.vendor) ||
      typeof r.state !== "string" || !STATES.has(r.state) || typeof r.provenance !== "string" || !PROVENANCE.has(r.provenance) ||
      !Array.isArray(r.ruleRefs) || r.ruleRefs.length > 8 || r.ruleRefs.some((ref) => !boundedString(ref, 500)) ||
      !Array.isArray(r.rules) || r.rules.length > 8 || r.rules.some((rule) => {
        if (!rule || typeof rule !== "object" || Array.isArray(rule)) return true;
        const evidence = rule as Record<string, unknown>;
        return !ownKeys(evidence, ["indexType", "conditions", "treatment", "sourceRef", "confidence"]) ||
          !boundedString(evidence.indexType, 64) ||
          // `undefined` means "this rule has no conditions" and must be treated
          // exactly like null. A stock-split rule fires unconditionally, so it
          // carries none -- and JSON.stringify DROPS an undefined key, so the
          // field arrives absent. Requiring it rejected the whole request, which
          // is why every Analyst lookup on an unconditional rule returned
          // "Invalid request" while the service sat idle: the relay never sent it.
          (evidence.conditions !== null && evidence.conditions !== undefined &&
            (typeof evidence.conditions !== "object" || Array.isArray(evidence.conditions))) ||
          (evidence.treatment !== null && !boundedString(evidence.treatment, 2_000)) ||
          (evidence.sourceRef !== null && !boundedString(evidence.sourceRef, 500)) ||
          typeof evidence.confidence !== "string" || !RULE_CONFIDENCE.has(evidence.confidence);
      });
  })) return false;
  const selectedVendors = l.selectedVendors as string[];
  const rows = l.matrixRows as Array<Record<string, unknown>>;
  if (new Set(selectedVendors).size !== selectedVendors.length || new Set(rows.map((row) => row.vendor)).size !== rows.length ||
      rows.some((row) => !selectedVendors.includes(row.vendor as string))) return false;
  // Mirrors parseEntailment in ca-analyst-service/src/contracts.ts. Both sides
  // reject unknown keys, so a field added to one and not the other is rejected
  // wholesale -- which is how `rules` sat unreadable on the wire since 09-09.
  const VERDICTS = ["contradicted", "consistent", "indeterminate"];
  const SCOPES = ["3-d", "2-d"];
  if (l.entailment !== undefined) {
    if (!Array.isArray(l.entailment) || l.entailment.length > 7) return false;
    if (l.entailment.some((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return true;
      const e = entry as Record<string, unknown>;
      return !ownKeys(e, ["vendor", "verdict", "reason", "drivers", "scope"]) ||
        typeof e.vendor !== "string" || !VENDORS.has(e.vendor) ||
        !VERDICTS.includes(String(e.verdict)) || !SCOPES.includes(String(e.scope)) ||
        !boundedString(e.reason, 600) ||
        !Array.isArray(e.drivers) || e.drivers.length > 7 ||
        e.drivers.some((d) => typeof d !== "string" || !VENDORS.has(d));
    })) return false;
  }
  const news = l.news;
  if (!news || typeof news !== "object" || Array.isArray(news)) return false;
  const n = news as Record<string, unknown>;
  if (!ownKeys(n, ["validationRan", "verdict", "confidence", "warning", "sources"]) || typeof n.validationRan !== "boolean" ||
      !["confirmed", "contradicted", "unverified"].includes(String(n.verdict)) || !["high", "medium", "low"].includes(String(n.confidence)) ||
      (n.warning !== undefined && !boundedString(n.warning, 300)) || !Array.isArray(n.sources) || n.sources.length > 8 ||
      n.sources.some((source) => !source || typeof source !== "object" || Array.isArray(source) || !ownKeys(source as Record<string, unknown>, ["url", "title", "publishedAt"]) ||
        !boundedString((source as Record<string, unknown>).url, 500) || !/^https:\/\//.test((source as Record<string, unknown>).url as string) ||
        !boundedString((source as Record<string, unknown>).title, 200) || !boundedString((source as Record<string, unknown>).publishedAt, 80))) return false;
  return n.validationRan || n.sources.length === 0;
}

export { validRequest };
