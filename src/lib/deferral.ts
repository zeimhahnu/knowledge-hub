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
  effective: "third-friday" | "last-business-day" | "first-business-day";
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

type TimingFields = { timing?: string; deferral_condition?: string };

export type UncoveredEventPolicy = { treatment: string; source_ref: string; confidence: "stated" | "inferred" };

const profiles = (rules as {
  vendor_profiles?: Array<{ vendor: string; review_calendar: ReviewCalendar | null; uncovered_event_policy: UncoveredEventPolicy | null }>;
}).vendor_profiles ?? [];

export function reviewCalendarFor(vendor: string): ReviewCalendar | null {
  return profiles.find((profile) => profile.vendor === vendor)?.review_calendar ?? null;
}

/** What the vendor does for an event its methodology does not name (e.g. a forward sale agreement). */
export function uncoveredPolicyFor(vendor: string): UncoveredEventPolicy | null {
  return profiles.find((profile) => profile.vendor === vendor)?.uncovered_event_policy ?? null;
}

const isWeekend = (date: Date): boolean => date.getUTCDay() === 0 || date.getUTCDay() === 6;

function effectiveDay(year: number, month: number, rule: ReviewCalendar["effective"]): Date {
  if (rule === "third-friday") {
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    return new Date(Date.UTC(year, month - 1, 1 + ((5 - firstWeekday + 7) % 7) + 14));
  }
  const step = rule === "first-business-day" ? 1 : -1;
  const date = rule === "first-business-day" ? new Date(Date.UTC(year, month - 1, 1)) : new Date(Date.UTC(year, month, 0));
  while (isWeekend(date)) date.setUTCDate(date.getUTCDate() + step);
  return date;
}

/**
 * First review effective strictly after `from`.
 * ponytail: weekends only - an exchange holiday moves a real review by a day; add a holiday table if that matters.
 */
export function nextReviewDate(calendar: ReviewCalendar, from: Date): Date {
  const months = [...calendar.months].sort((a, b) => a - b);
  for (let year = from.getUTCFullYear(); year <= from.getUTCFullYear() + 1; year += 1) {
    for (const month of months) {
      const date = effectiveDay(year, month, calendar.effective);
      if (date > from) return date;
    }
  }
  throw new RangeError("review calendar has no month"); // unreachable: the schema requires >= 1 month
}

/** The deferral a vendor's selected rule rows describe, or null when they apply on the event. */
export function deferralFor(vendor: string, rows: readonly TimingFields[], eventDate: Date): Deferral | null {
  const row = rows.find((candidate) => candidate.timing === "at-review" || candidate.timing === "threshold-gated");
  if (!row) return null;
  const calendar = reviewCalendarFor(vendor);
  const reviewDate = calendar ? nextReviewDate(calendar, eventDate).toISOString().slice(0, 10) : null;
  const lands = reviewDate ? `the review effective ${reviewDate}` : "the next scheduled review (date not sourced yet)";
  if (row.timing === "at-review") {
    return { timing: "at-review", condition: null, reviewDate, reviewSource: calendar?.source_ref ?? null,
      finding: `Deferred: not applied on the event date, but at ${lands}.` };
  }
  const condition = row.deferral_condition ?? null;
  return { timing: "threshold-gated", condition, reviewDate, reviewSource: calendar?.source_ref ?? null,
    finding: `Applied intra-quarter only above the size test; deferred to ${lands}${condition ? ` when: ${condition}` : ""}.` };
}
