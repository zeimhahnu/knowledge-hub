import { CANONICAL_EVENTS } from "./event-taxonomy.ts";
import { VENDOR_IDS } from "./vendors.ts";

type JsonRecord = Record<string, unknown>;

export type CuratedRule = {
  vendor: string;
  event_type: string;
  index_type: string;
  treatment: string | null;
  lead_days: number | null;
  lead_days_confidence: string;
  source_ref: string;
  confidence: string;
  caev?: string;
};

export type RulesDocument = {
  schema_version: number;
  generated: string;
  event_types: string[];
  index_types: string[];
  vendors: string[];
  rules: CuratedRule[];
};

export function validateRule(rule: CuratedRule): string[] {
  const errors: string[] = [];
  if (!VENDOR_IDS.includes(rule.vendor as (typeof VENDOR_IDS)[number])) errors.push("vendor is not registered");
  if (!CANONICAL_EVENTS.some((event) => event.id === rule.event_type)) errors.push("event_type is not canonical");
  if (!["*", "price-return", "total-return", "net-total-return", "market-cap-weighted"].includes(rule.index_type)) errors.push("index_type is invalid");
  if (rule.treatment === null) {
    if (rule.confidence !== "absent") errors.push("null treatment requires absent confidence");
  } else if (typeof rule.treatment !== "string" || rule.treatment.trim().length === 0) {
    errors.push("treatment must be non-empty when present");
  }
  if (rule.lead_days !== null && (!Number.isInteger(rule.lead_days) || rule.lead_days < 0)) errors.push("lead_days must be a non-negative integer or null");
  if (!["stated", "inferred", "absent", "practitioner"].includes(rule.lead_days_confidence)) errors.push("lead_days_confidence is invalid");
  if (rule.lead_days === null && rule.lead_days_confidence === "stated") errors.push("null lead_days cannot be stated");
  if (rule.lead_days !== null && rule.lead_days_confidence === "absent") errors.push("present lead_days cannot be absent");
  if (!rule.source_ref.trim()) errors.push("source_ref is required");
  if (!["stated", "inferred", "absent", "user-set"].includes(rule.confidence)) errors.push("confidence is invalid");
  return errors;
}

export function validateRulesDocument(document: RulesDocument): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(document.schema_version) || document.schema_version < 1) errors.push("schema_version is invalid");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(document.generated)) errors.push("generated must be a date");
  if (!Array.isArray(document.event_types) || document.event_types.length === 0) errors.push("event_types must be a non-empty array");
  if (!Array.isArray(document.index_types) || document.index_types.length === 0) errors.push("index_types must be a non-empty array");
  if (!Array.isArray(document.vendors) || document.vendors.length === 0) errors.push("vendors must be a non-empty array");
  if (!Array.isArray(document.rules)) errors.push("rules must be an array");
  for (const rule of document.rules) {
    for (const error of validateRule(rule)) errors.push(`${rule.vendor}/${rule.event_type}: ${error}`);
  }
  return errors;
}

export function asRulesDocument(value: unknown): RulesDocument {
  if (!value || typeof value !== "object" || !Array.isArray((value as JsonRecord).rules)) throw new Error("rules.json has no rules array");
  const record = value as JsonRecord;
  return {
    schema_version: Number(record.schema_version),
    generated: String(record.generated),
    event_types: Array.isArray(record.event_types) ? record.event_types.map(String) : [],
    index_types: Array.isArray(record.index_types) ? record.index_types.map(String) : [],
    vendors: Array.isArray(record.vendors) ? record.vendors.map(String) : [],
    rules: record.rules as CuratedRule[],
  };
}
