import rules from "../data/rules.json" with { type: "json" };
import type { VendorId } from "./vendors.ts";

export type ComparisonDimension = "treatment" | "lead-time";
export type DivergenceField = "treatment" | "threshold" | "lead-time" | null;

interface Rule {
  vendor: VendorId;
  event_type: string;
  treatment: string | null;
  confidence: "stated" | "absent";
  lead_days: number | null;
  lead_days_confidence: "stated" | "practitioner" | "absent";
  conditions?: {
    dividend_size_threshold_pct?: number;
    threshold_side?: string;
  };
}

export interface DivergenceGroup {
  value: string;
  vendors: VendorId[];
}

export interface DivergenceResult {
  agree: VendorId[];
  disagree: VendorId[];
  silent: VendorId[];
  notCovered: VendorId[];
  divergenceField: DivergenceField;
  groups: DivergenceGroup[];
}

const ruleRows = rules.rules as Rule[];

function ruleFor(vendor: VendorId, eventType: string): Rule | undefined {
  return ruleRows.find((rule) => rule.vendor === vendor && rule.event_type === eventType);
}

function thresholdSignature(rule: Rule): string | null {
  const threshold = rule.conditions?.dividend_size_threshold_pct;
  if (threshold === undefined) return null;
  const side = rule.conditions?.threshold_side === "below" ? "below" : "at or above";
  return `${threshold}% ${side}`;
}

/** Small semantic normalisation prevents copy-edit differences from becoming a
 * fabricated disagreement. Anything not safely classified stays exact. */
function treatmentSignature(treatment: string): string {
  const normalized = treatment.toLowerCase();
  if (/no price(?: or share)? adjustment|price return index is unchanged|not affected/.test(normalized)) {
    return "no price adjustment";
  }
  if (/in-the-money rights/.test(normalized)) return "in-the-money rights adjusted";
  if (/shares.*increase.*price.*decrease|price.*decrease.*shares.*increase/.test(normalized)) {
    return "shares increase and price decreases";
  }
  return treatment.replace(/\s+/g, " ").trim();
}

function groupsFor(
  speakers: Rule[],
  field: Exclude<DivergenceField, null>,
): DivergenceGroup[] {
  const grouped = new Map<string, VendorId[]>();
  for (const rule of speakers) {
    const value =
      field === "threshold"
        ? thresholdSignature(rule) ?? "no numeric threshold stated"
        : field === "lead-time"
          ? `${rule.lead_days ?? 0} days`
          : treatmentSignature(rule.treatment!);
    grouped.set(value, [...(grouped.get(value) ?? []), rule.vendor]);
  }
  return [...grouped.entries()].map(([value, vendors]) => ({ value, vendors }));
}

/**
 * Compare selected vendors for one event without interpreting silence as an
 * opinion. `lead-time` mode deliberately has its own silence rule: a vendor
 * may state a treatment while publishing no lead time.
 */
export function computeDivergence(
  selectedVendors: readonly VendorId[],
  eventType: string,
  dimension: ComparisonDimension = "treatment",
): DivergenceResult {
  const silent: VendorId[] = [];
  const notCovered: VendorId[] = [];
  const speakers: Rule[] = [];

  for (const vendor of selectedVendors) {
    const rule = ruleFor(vendor, eventType);
    if (!rule) {
      notCovered.push(vendor);
      continue;
    }
    const isSilent =
      dimension === "lead-time"
        ? rule.lead_days === null || rule.lead_days_confidence === "absent"
        : rule.treatment === null || rule.confidence === "absent";
    if (isSilent) silent.push(vendor);
    else speakers.push(rule);
  }

  let divergenceField: DivergenceField = null;
  if (dimension === "lead-time") {
    if (new Set(speakers.map((rule) => rule.lead_days)).size > 1) divergenceField = "lead-time";
  } else {
    const thresholds = speakers.map(thresholdSignature);
    if (thresholds.some((value) => value !== null) && new Set(thresholds).size > 1) {
      divergenceField = "threshold";
    } else if (new Set(speakers.map((rule) => treatmentSignature(rule.treatment!))).size > 1) {
      divergenceField = "treatment";
    }
  }

  const groups = divergenceField ? groupsFor(speakers, divergenceField) : [];
  const majority = groups.reduce<DivergenceGroup | null>(
    (largest, group) => (!largest || group.vendors.length > largest.vendors.length ? group : largest),
    null,
  );
  const agree = divergenceField === null ? speakers.map((rule) => rule.vendor) : (majority?.vendors ?? []);
  const disagree = divergenceField === null
    ? []
    : speakers.map((rule) => rule.vendor).filter((vendor) => !agree.includes(vendor));

  return { agree, disagree, silent, notCovered, divergenceField, groups };
}
