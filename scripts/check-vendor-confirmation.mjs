#!/usr/bin/env node
/** Plain-node gate for user-recorded vendor confirmations. */
import assert from "node:assert/strict";
import { computeLookupVerdict } from "../src/lib/lookup-verdict.ts";

const today = new Date("2026-09-01T12:00:00Z");
const mark = (state) => ({ state, checkedAt: "2026-09-01T12:00:00.000Z" });
const verdict = (state, exDate, vendor = "ftse") =>
  computeLookupVerdict({
    ticker: "AAPL",
    eventType: "special-dividend",
    exDate: new Date(exDate),
    today,
    scope: [vendor],
    getConfirmation: () => (state === "unchecked" ? null : mark(state)),
    isPresentAtVendor: () => state === "confirmed",
  });

const confirmed = verdict("confirmed", "2026-09-03");
assert.equal(confirmed.rows.find((r) => r.vendor === "ftse")?.state, "covered");
assert.equal(confirmed.totals.covered, 1, "a one-vendor scope excludes the other six from every total");

const absentLate = verdict("absent", "2026-09-03");
assert.equal(absentLate.rows.find((r) => r.vendor === "ftse")?.state, "missing");
assert.equal(absentLate.totals.missing, 1);

const absentEarly = verdict("absent", "2026-09-10");
assert.equal(absentEarly.rows.find((r) => r.vendor === "ftse")?.state, "not-yet-due");
assert.equal(absentEarly.totals.missing, 0);

const unchecked = verdict("unchecked", "2026-09-03");
assert.equal(unchecked.rows.find((r) => r.vendor === "ftse")?.state, "not-checked");
assert.equal(unchecked.totals.covered, 0);
assert.equal(unchecked.totals.missing, 0);
assert.equal(unchecked.totals.unchecked, 1, "a one-vendor scope excludes the other six from every total");

const absentNoLead = verdict("absent", "2026-09-03", "msci");
assert.equal(absentNoLead.rows.find((r) => r.vendor === "msci")?.state, "not-assessed");
assert.equal(absentNoLead.totals.missing, 0, "an ungraded vendor is reported separately, never counted as missing");
assert.equal(absentNoLead.totals.notAssessed, 1);

const multiVendor = computeLookupVerdict({
  ticker: "AAPL",
  eventType: "special-dividend",
  exDate: new Date("2026-09-03"),
  today,
  scope: ["ftse", "stoxx", "msci"],
  getConfirmation: () => mark("confirmed"),
  isPresentAtVendor: () => true,
});
assert.equal(multiVendor.totals.covered, 3, "totals sum across every vendor in a widened scope");

console.log("OK — 7 vendor-confirmation assertions pass");
