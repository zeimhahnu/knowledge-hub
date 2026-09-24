import assert from "node:assert/strict";
import { nextReviewDate, deferralFor, vendorProfiles } from "../src/lib/deferral.ts";
import { franklinSnapshot } from "../src/lib/fund-master.ts";
import { PROVIDER_VENDOR } from "../src/lib/vendors.ts";
import { classifyDividend } from "../src/lib/dividend-check.ts";
import { computeLookupVerdict } from "../src/lib/lookup-verdict.ts";
import { setVendorDefault } from "../src/lib/coverage-settings.ts";

const day = (iso) => new Date(`${iso}T00:00:00Z`);
const ymd = (date) => date.toISOString().slice(0, 10);
const quarterly = (effective) => ({ frequency: "quarterly", months: [3, 6, 9, 12], effective, source_ref: "test" });

// Review calendar arithmetic.
assert.equal(ymd(nextReviewDate(quarterly("third-friday"), day("2026-10-01"))), "2026-12-18");
assert.equal(ymd(nextReviewDate(quarterly("third-friday"), day("2026-12-18"))), "2027-03-19", "strictly after the event date");
assert.equal(ymd(nextReviewDate(quarterly("last-business-day"), day("2026-10-01"))), "2026-12-31");
assert.equal(ymd(nextReviewDate(quarterly("last-business-day"), day("2027-01-15"))), "2027-03-31");
assert.equal(ymd(nextReviewDate(quarterly("first-business-day"), day("2026-10-01"))), "2026-12-01");
assert.equal(ymd(nextReviewDate(quarterly("last-business-day"), day("2026-06-01"))), "2026-06-30");
const inMonth = (effective, month) => ({ frequency: "annual", months: [month], effective, source_ref: "test" });
assert.equal(ymd(nextReviewDate(inMonth("fourth-friday", 6), day("2026-01-01"))), "2026-06-26", "Russell-style fourth Friday of June");
assert.equal(ymd(nextReviewDate(inMonth("first-wednesday", 3), day("2026-01-01"))), "2026-03-04");
assert.equal(ymd(nextReviewDate(inMonth("second-business-day", 3), day("2026-01-01"))), "2026-03-03");
assert.equal(ymd(nextReviewDate(inMonth("last-friday", 7), day("2026-01-01"))), "2026-07-31");
assert.throws(() => nextReviewDate(inMonth("third-fryday", 3), day("2026-01-01")), /unknown review day/);
console.log("  ok  nextReviewDate: third Friday, nth weekday, nth and last business day, year roll");

// Every calendar in rules.json must compute, and a per-index one must name an index
// the fund master carries under that vendor - a typo would silently fall back.

const MONTHS_PER = { quarterly: 4, "semi-annual": 2, annual: 1 };
function calendarProblems(profiles, records) {
  const problems = [];
  const indexVendor = new Map(records.filter((r) => r.underlying_index).map((r) => [r.underlying_index, PROVIDER_VENDOR[r.index_provider]]));
  for (const profile of profiles) {
    const seen = new Set();
    for (const [where, calendar] of [["vendor", profile.review_calendar], ...(profile.index_calendars ?? []).map((c) => [c.indexes.join(" / "), c])]) {
      if (!calendar) continue;
      const at = `${profile.vendor} ${where}`;
      try { nextReviewDate(calendar, day("2026-01-01")); } catch (error) { problems.push(`${at}: ${error.message}`); }
      if (calendar.months.length !== MONTHS_PER[calendar.frequency]) problems.push(`${at}: ${calendar.frequency} with ${calendar.months.length} months`);
      if (!calendar.source_ref?.trim()) problems.push(`${at}: no source_ref`);
      for (const name of calendar.indexes ?? []) {
        if (indexVendor.get(name) !== profile.vendor) problems.push(`${at}: "${name}" is not a ${profile.vendor} index in the fund master`);
        if (seen.has(name)) problems.push(`${at}: "${name}" listed twice`);
        seen.add(name);
      }
    }
  }
  return problems;
}
assert.deepEqual(calendarProblems(vendorProfiles, franklinSnapshot.records), []);
const typo = structuredClone(vendorProfiles);
typo.find((p) => p.vendor === "ftse").index_calendars = [{ indexes: ["FTSE Canada RIC Capped Indx"], frequency: "quarterly", months: [3, 6, 9], effective: "third-friday", source_ref: "x" }];
assert.equal(calendarProblems(typo, franklinSnapshot.records).length, 2, "a misspelt index and a 3-month quarter are both caught");
const perIndex = vendorProfiles.reduce((n, p) => n + (p.index_calendars?.length ?? 0), 0);
console.log(`  ok  review calendars: all compute; ${perIndex} per-index entries name real fund-master indexes`);

// Deferral findings.
assert.equal(deferralFor("msci", [{ timing: "on-event" }], day("2026-10-01")), null);
const unsourced = deferralFor("vettafi", [{ timing: "at-review" }], day("2026-10-01"));
assert.equal(unsourced?.timing, "at-review");
assert.match(unsourced?.finding ?? "", /^Deferred: /);
const gated = deferralFor("msci", [{ timing: "threshold-gated", deferral_condition: "below 1% of shares" }], day("2026-10-01"));
assert.match(gated?.finding ?? "", /when: below 1% of shares\.$/);
const quoted = deferralFor("msci", [{ timing: "threshold-gated", deferral_condition: "below 1% of shares." }], day("2026-10-01"));
assert.match(quoted?.finding ?? "", /when: below 1% of shares\.$/, "a quoted full stop must not double");
// A fund's index calendar wins over the vendor-wide one, and the finding says which it used.
const ftse = vendorProfiles.find((p) => p.vendor === "ftse");
const saved = ftse.index_calendars;
ftse.index_calendars = [{ indexes: ["FTSE Canada RIC Capped Index"], frequency: "semi-annual", months: [3, 9], effective: "third-friday", source_ref: "test" }];
const own = deferralFor("ftse", [{ timing: "at-review" }], day("2026-10-01"), "FTSE Canada RIC Capped Index");
const other = deferralFor("ftse", [{ timing: "at-review" }], day("2026-10-01"), "FTSE UK RIC Capped Index");
ftse.index_calendars = saved;
assert.equal(own?.reviewDate, "2027-03-19");
assert.match(own?.finding ?? "", /the FTSE Canada RIC Capped Index review effective 2027-03-19/);
assert.equal(other?.reviewDate, "2026-12-18");
assert.match(other?.finding ?? "", /\(vendor-wide calendar\)/);
console.log("  ok  deferralFor: on-event, at-review, threshold-gated, per-index calendar");

// Dividend yield cross-check: MSCI's boundary is 5% of the share price.
const msci = (eventType, pct) => classifyDividend(eventType, pct).find((c) => c.vendor === "msci");
assert.deepEqual([msci("cash-dividend", 2)?.classifiedAs, msci("cash-dividend", 2)?.conflicts], ["ordinary", false]);
assert.deepEqual([msci("cash-dividend", 6.5)?.classifiedAs, msci("cash-dividend", 6.5)?.conflicts], ["special", true]);
assert.equal(msci("cash-dividend", 5)?.classifiedAs, "special", "5% is at_or_above");
assert.equal(msci("special-dividend", 3)?.conflicts, true);
assert.deepEqual(classifyDividend("merger", 6.5), []);
assert.deepEqual(classifyDividend("cash-dividend", -1), []);
console.log("  ok  classifyDividend: both sides, the boundary, conflicts, non-dividend events");

const memoryStorage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
};
const verdict = (eventType, filters, scope) => {
  // A recorded finding and a lead time, so each row reaches the date-graded branches.
  const storage = memoryStorage();
  for (const vendor of scope) setVendorDefault(vendor, 5, storage);
  return computeLookupVerdict({
    ticker: "TSCO.L", eventType, exDate: day("2026-10-01"), today: day("2026-09-24"),
    scope, filters, storage, isPresentAtVendor: () => false,
    getConfirmation: () => ({ state: "absent", checkedAt: "2026-09-24T00:00:00Z" }),
  });
};

// The yield picks the size branch and a contradiction becomes the finding.
const high = verdict("cash-dividend", { dividendYieldPct: 6.5 }, ["msci"]).rows[0];
assert.match(high.leadAnswer, /special dividend/);
assert.ok(high.treatments.every((t) => t.conditions?.threshold_side !== "below"), "the below-5% rows are filtered out");
const low = verdict("cash-dividend", { dividendYieldPct: 2 }, ["msci"]).rows[0];
assert.ok(low.treatments.length > 0 && low.treatments.every((t) => t.conditions?.threshold_side === "below"));
console.log("  ok  a 6.5% 'cash dividend' reads as MSCI special; 2% keeps the ordinary rows");

// A row without a condition key is generic: answering it must not drop the row.
const plain = verdict("secondary-offering", undefined, ["msci"]).rows[0];
const answered = verdict("secondary-offering", { conditions: { consideration: "cash" } }, ["msci"]).rows[0];
assert.ok(plain.treatments.length > 0);
assert.equal(answered.treatments.length, plain.treatments.length, "generic rows survive an answer they do not vary by");
console.log("  ok  rowMatchesFilters: a row without the key applies to every answer");

// At-review with no sourced calendar has no date to grade against.
const vetta = verdict("secondary-offering", undefined, ["vettafi"]).rows[0];
assert.equal(vetta.deferral?.timing, "at-review");
// Without the deferral branch this grades against the event date and reads "expected but absent".
if (!vetta.deferral?.reviewDate) assert.equal(vetta.state, "not-assessed");
else assert.notEqual(vetta.state, "expected-absent", "graded against the review date, not the event date");
console.log(`  ok  VettaFi secondary offering defers: ${vetta.deferral?.finding}`);

// A selected fund hands its index to the deferral, so the calendar can be the index's own.
const storage = memoryStorage();
setVendorDefault("ftse", 5, storage);
const flca = computeLookupVerdict({
  ticker: "TSCO.L", eventType: "secondary-offering", exDate: day("2026-10-01"), today: day("2026-09-24"),
  scope: ["ftse"], fundTicker: "FLCA", storage, isPresentAtVendor: () => false,
  getConfirmation: () => ({ state: "absent", checkedAt: "2026-09-24T00:00:00Z" }),
}).rows[0];
assert.match(flca.deferral?.finding ?? "", /FTSE Canada RIC Capped Index review|\(vendor-wide calendar\)/, "the fund's index reached deferralFor");
console.log(`  ok  FLCA deferral names its calendar: ${flca.deferral.finding}`);

// What a vendor does where its methodology is silent.
const forward = verdict("forward-sale-agreement", undefined, ["solactive"]).rows[0];
const stated = forward.treatments.some((t) => t.treatment !== null && t.confidence !== "absent");
assert.equal(forward.uncoveredPolicy === null, stated, "policy shows exactly when no row is stated");
console.log("  ok  uncovered-event policy follows the stated rows");
