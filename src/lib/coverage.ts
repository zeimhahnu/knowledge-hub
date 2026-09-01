/**
 * Coverage window — what a vendor's silence means.
 *
 * Spec: `SPECS/corporate-action-hub-revamp-design-2026-09-01.md` §7a-i.
 *
 * Vendors publish a pending corporate action only once it enters their own
 * publication lead time. An event's absence from a vendor is therefore only a
 * discrepancy if that vendor should already have had it. Collapsing
 * "not-yet-due" into "missing" produces a wall of false discrepancies for
 * every event more than a few days out — the one failure mode this module
 * exists to prevent.
 *
 * `leadDays` is per-vendor AND per-event-type, sourced from the vendor
 * methodology docs (the Tier-0 corpus that will feed `rules.json`). T-5 is
 * only a placeholder DEFAULT at the call site until those per-vendor numbers
 * are extracted — that extraction is the next slice, not this task. Nothing
 * in this module assumes a lead time; it is always an argument.
 */

export type CoverageState = "covered" | "not-yet-due" | "missing"

export type CoverageInput = {
  exDate: Date
  today: Date
  /**
   * Vendor publication lead time in days — per-vendor AND per-event-type.
   * Passed in, never assumed. Negative/NaN is a rules-source bug and throws.
   */
  leadDays: number
  /** Whether the vendor's feed already carries this event. */
  presentAtVendor: boolean
}

const MS_PER_DAY = 86_400_000

/** Whole UTC days since the Unix epoch, floored to the date's UTC day. */
const utcDay = (d: Date): number => Math.floor(d.getTime() / MS_PER_DAY)

/**
 * Four-state coverage decision per §7a-i:
 *
 * | condition                                    | state         |
 * |----------------------------------------------|---------------|
 * | present at vendor                            | covered       |
 * | absent, daysOut > leadDays                   | not-yet-due   |
 * | absent, 0 <= daysOut <= leadDays             | missing       |
 * | absent, daysOut < 0 (ex-date already passed) | missing       |
 *
 * `daysOut` is whole UTC days (`exDate - today`); a same-day ex-date is
 * daysOut 0. The boundary `daysOut === leadDays` is `missing` — the
 * off-by-one that matters most: a vendor whose lead time has elapsed has no
 * excuse left, so silence is a real gap.
 *
 * Pure: no I/O, no data access, no `Date.now()` — `today` is a parameter so
 * this stays testable.
 */
export function coverageState({
  exDate,
  today,
  leadDays,
  presentAtVendor,
}: CoverageInput): CoverageState {
  if (presentAtVendor) return "covered"

  if (!Number.isFinite(leadDays) || leadDays < 0) {
    // ponytail: trust-boundary guard — a broken `leadDays` from the rules
    // source must fail loudly, not silently mislabel every future event.
    throw new RangeError(`leadDays must be a finite number >= 0, got ${leadDays}`)
  }

  const daysOut = utcDay(exDate) - utcDay(today)

  if (daysOut < 0) return "missing"
  return daysOut > leadDays ? "not-yet-due" : "missing"
}