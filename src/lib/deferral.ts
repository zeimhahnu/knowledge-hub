/**
 * Deferral as a finding (plan-coac-1.0 M6).
 *
 * A vendor that does not apply a change intra-quarter carries it to its next
 * scheduled review. Its silence on the event date is then expected, not a gap,
 * and the practitioner needs the date it will land.
 */
import rules from "../data/rules.json" with { type: "json" };

export type ReviewCalendar = {
  frequency: string;
  months: number[];
  /** "<first|second|third|fourth|last>-<weekday|business-day>", e.g. third-friday, last-business-day. */
  effective?: string;
  /** Optional mixed-month form; when present it replaces `effective` for every listed month. */
  effective_by_month?: Record<string, string>;
  source_ref: string;
  note?: string;
};

export type Deferral = {
  timing: "threshold-gated" | "at-review";
  /** The vendor's own wording of when it defers (threshold-gated only). */
  condition: string | null;
  /** YYYY-MM-DD of the next review after the event date; null when the calendar is not sourced. */
  reviewDate: string | null;
  reviewSource: string | null;
  finding: string;
};

/** An index whose own rulebook sets its review dates; `indexes` are fund-master underlying_index names. */
export type IndexCalendar = ReviewCalendar & { indexes: string[] };

type TimingFields = { timing?: string; deferral_condition?: string };

export type UncoveredEventPolicy = { treatment: string; source_ref: string; confidence: "stated" | "inferred" };

export type VendorProfile = {
  vendor: string;
  review_calendar: ReviewCalendar | null;
  index_calendars?: IndexCalendar[];
  uncovered_event_policy: UncoveredEventPolicy | null;
};

export const vendorProfiles = (rules as { vendor_profiles?: VendorProfile[] }).vendor_profiles ?? [];

/** The index's own calendar when sourced, else the vendor-wide one. */
export function reviewCalendarFor(vendor: string, indexName?: string | null): { calendar: ReviewCalendar; scope: "index" | "vendor" } | null {
  const profile = vendorProfiles.find((candidate) => candidate.vendor === vendor);
  const own = indexName ? profile?.index_calendars?.find((entry) => entry.indexes.includes(indexName)) : undefined;
  if (own) return { calendar: own, scope: "index" };
  return profile?.review_calendar ? { calendar: profile.review_calendar, scope: "vendor" } : null;
}

/** What the vendor does for an event its methodology does not name (e.g. a forward sale agreement). */
export function uncoveredPolicyFor(vendor: string): UncoveredEventPolicy | null {
  return vendorProfiles.find((profile) => profile.vendor === vendor)?.uncovered_event_policy ?? null;
}

const isWeekend = (date: Date): boolean => date.getUTCDay() === 0 || date.getUTCDay() === 6;

const ORDINALS = ["first", "second", "third", "fourth"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const EFFECTIVE_DAY = /^(first|second|third|fourth|last)-(monday|tuesday|wednesday|thursday|friday|business-day)$/;

/** Validate the cross-property calendar rules the JSON Schema cannot express. */
export function validateReviewCalendar(calendar: ReviewCalendar): void {
  if (!calendar || !Array.isArray(calendar.months) || calendar.months.length === 0
    || calendar.months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)
    || new Set(calendar.months).size !== calendar.months.length) {
    throw new RangeError("review calendar months must be unique integers from 1 to 12");
  }

  const hasEffective = Object.prototype.hasOwnProperty.call(calendar, "effective");
  const hasEffectiveByMonth = Object.prototype.hasOwnProperty.call(calendar, "effective_by_month");
  if (hasEffective === hasEffectiveByMonth) {
    throw new RangeError("review calendar must define exactly one of effective or effective_by_month");
  }
  if (hasEffective && (typeof calendar.effective !== "string" || !EFFECTIVE_DAY.test(calendar.effective))) {
    throw new RangeError(`unknown review day "${calendar.effective}"`);
  }
  if (!hasEffectiveByMonth) return;

  const rules = calendar.effective_by_month;
  if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
    throw new RangeError("effective_by_month must be an object");
  }
  const expected = new Set(calendar.months.map(String));
  const actual = new Set(Object.keys(rules));
  if (actual.size !== expected.size || [...actual].some((month) => !expected.has(month))) {
    throw new RangeError("effective_by_month must cover precisely the calendar months");
  }
  for (const [month, rule] of Object.entries(rules)) {
    if (!/^(?:[1-9]|1[0-2])$/.test(month) || !EFFECTIVE_DAY.test(rule)) {
      throw new RangeError(`unknown review day "${rule}" for month ${month}`);
    }
  }
}

/** The day `rule` names in a month: the nth (or last) weekday or business day. */
function effectiveDay(year: number, month: number, rule: string): Date {
  const cut = rule.indexOf("-");
  const [nth, day] = [rule.slice(0, cut), rule.slice(cut + 1)];
  const last = nth === "last";
  let count = last ? 1 : ORDINALS.indexOf(nth) + 1;
  const weekday = WEEKDAYS.indexOf(day);
  // Checked first: an unknown day would never match and loop forever.
  if (count === 0 || (weekday === -1 && day !== "business-day")) throw new RangeError(`unknown review day "${rule}"`);
  const date = last ? new Date(Date.UTC(year, month, 0)) : new Date(Date.UTC(year, month - 1, 1));
  for (;;) {
    if ((weekday === -1 ? !isWeekend(date) : date.getUTCDay() === weekday) && --count === 0) return date;
    date.setUTCDate(date.getUTCDate() + (last ? -1 : 1));
  }
}

/**
 * First review effective strictly after `from`.
 * ponytail: weekends only - an exchange holiday moves a real review by a day; add a holiday table if that matters.
 */
export function nextReviewDate(calendar: ReviewCalendar, from: Date): Date {
  validateReviewCalendar(calendar);
  const months = [...calendar.months].sort((a, b) => a - b);
  for (let year = from.getUTCFullYear(); year <= from.getUTCFullYear() + 1; year += 1) {
    for (const month of months) {
      const rule = calendar.effective_by_month?.[String(month)] ?? calendar.effective;
      if (!rule) throw new RangeError(`review calendar has no rule for month ${month}`);
      const date = effectiveDay(year, month, rule);
      if (date > from) return date;
    }
  }
  throw new RangeError("review calendar has no month"); // unreachable: the schema requires >= 1 month
}

/** The deferral a vendor's selected rule rows describe, or null when they apply on the event. */
export function deferralFor(vendor: string, rows: readonly TimingFields[], eventDate: Date, indexName?: string | null): Deferral | null {
  const row = rows.find((candidate) => candidate.timing === "at-review" || candidate.timing === "threshold-gated");
  if (!row) return null;
  const found = reviewCalendarFor(vendor, indexName);
  const calendar = found?.calendar ?? null;
  const reviewDate = calendar ? nextReviewDate(calendar, eventDate).toISOString().slice(0, 10) : null;
  // A fund's index may run its own cycle; say when the date is the vendor-wide one instead.
  const lands = !reviewDate ? "the next scheduled review (date not sourced yet)"
    : found?.scope === "index" ? `the ${indexName} review effective ${reviewDate}`
    : `the review effective ${reviewDate}${indexName ? " (vendor-wide calendar)" : ""}`;
  if (row.timing === "at-review") {
    return { timing: "at-review", condition: null, reviewDate, reviewSource: calendar?.source_ref ?? null,
      finding: `Deferred: not applied on the event date, but at ${lands}.` };
  }
  // The rules quote the vendor, full stop included; the finding adds its own.
  const condition = row.deferral_condition?.trim().replace(/\.+$/, "") || null;
  return { timing: "threshold-gated", condition, reviewDate, reviewSource: calendar?.source_ref ?? null,
    finding: `Applied intra-quarter only above the size test; deferred to ${lands}${condition ? ` when: ${condition}` : ""}.` };
}
