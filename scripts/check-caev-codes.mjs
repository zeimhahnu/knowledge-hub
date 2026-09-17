#!/usr/bin/env node
/**
 * CAEV codes must agree with the event they sit on.
 *
 * Reported symptom: the MT564 sample on the ISO taxonomy page shows
 * `:22F: CAEV — DVCA`, but no event in the product carried DVCA, so a reader
 * following the reference could never find the event it described.
 *
 * Cause: every cash-dividend rule was coded DVOP. In ISO 20022 DVOP is
 * "Dividend Option" -- an ELECTIVE event where the holder chooses cash or
 * securities -- while a mandatory cash dividend is DVCA. The product's own
 * taxonomy badges cash-dividend `mandatory`, so the data contradicted itself:
 * a mandatory event carrying an election code.
 *
 * These pin the correction and the rule behind it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CANONICAL_EVENTS } from "../src/lib/event-taxonomy.ts";

const rules = JSON.parse(readFileSync("src/data/rules.json", "utf8"));

/** CAEV codes that imply a holder election, so they cannot sit on a mandatory event. */
const ELECTIVE_CAEV = new Set(["DVOP", "EXOF", "EXWA", "PRIO", "CONV"]);

const badge = new Map(CANONICAL_EVENTS.map((e) => [e.id, e.badge]));

/**
 * Codes that are NOT corporate-action event types, mapped to what they really are.
 * Each of these shipped as a CAEV until 2026-09-17; two of them point at entirely
 * different MT564 fields, so a feed carrying the real event would never match.
 */
const NOT_EVENT_CODES = new Map([
  ["SPLT", "the 'Deadline to Split' DATE qualifier on field 98a, not an event - splits are SPLF/SPLR"],
  ["OFFO", "the 'Offeror' NARRATIVE qualifier on field 70a, not an event"],
  ["SPIN", "not in the current CAEV list - Spin-Off is SOFF"],
  ["RHDI", "Intermediate Securities Distribution, the distribution stage - a Rights Issue is RHTS"],
  ["REDU", "not in the current CAEV list - Capital Distribution is CAPD"],
  ["DELI", "not in the current CAEV list - Bankruptcy is BRUP, Delisted is DLST, Liquidation is LIQU"],
]);

const seen = [];
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === "object") {
    if (typeof node.caev === "string" && typeof node.event_type === "string") {
      seen.push({ caev: node.caev, eventType: node.event_type });
    }
    return Object.values(node).forEach(walk);
  }
})(rules);

assert.ok(seen.length > 0, "no CAEV-coded rules found - the walk is looking in the wrong place");

// 1. A mandatory event must never carry an election code.
for (const { caev, eventType } of seen) {
  if (badge.get(eventType) === "mandatory") {
    assert.ok(
      !ELECTIVE_CAEV.has(caev),
      `${eventType} is badged mandatory but carries the elective CAEV ${caev}. ` +
        `A mandatory cash dividend is DVCA; DVOP is a holder election.`,
    );
  }
}

// 2. One event resolves to one CAEV. Two codes for one event means the reference
//    page and the rules can disagree about what the reader is looking at.
const byEvent = new Map();
for (const { caev, eventType } of seen) {
  if (!byEvent.has(eventType)) byEvent.set(eventType, new Set());
  byEvent.get(eventType).add(caev);
}
for (const [eventType, codes] of byEvent) {
  assert.equal(
    codes.size,
    1,
    `${eventType} carries ${codes.size} different CAEV codes (${[...codes].join(", ")})`,
  );
}

// 2b. None of the retired non-event codes may return.
for (const { caev, eventType } of seen) {
  const why = NOT_EVENT_CODES.get(caev);
  assert.ok(!why, `${eventType} uses ${caev}, which is ${why}`);
}

// 3. The specific regression: cash-dividend is DVCA, and DVCA is reachable.
assert.equal(
  byEvent.get("cash-dividend")?.values().next().value,
  "DVCA",
  "cash-dividend must be DVCA - it is badged mandatory, and DVOP is an election",
);

// A special CASH dividend is also DVCA and also mandatory: ISO has no "special"
// code, and the holder makes no election. "Special" is vendor TREATMENT, a
// separate axis from whether the holder must act.
assert.equal(byEvent.get("special-dividend")?.values().next().value, "DVCA",
  "special-dividend must be DVCA - ISO has no special-dividend code");
assert.equal(badge.get("special-dividend"), "mandatory",
  "special-dividend is mandatory: a cash distribution offers the holder no election");

// 4. The WIRE SAMPLE must only show codes the product actually uses - that was
//    the reported bug: the sample showed DVCA while no event carried it, so a
//    reader following the reference found nothing.
//
//    Scoped to the sample on purpose. The CAEV_CODES catalogue and the mapping
//    table are ISO REFERENCE material and legitimately document codes we do not
//    implement (CAPG, DRIP, INTR, and SPLR for the consolidation direction our
//    single stock-split event bundles). Asserting over those would force the
//    reference to shrink to our coverage, which is backwards.
const isoPage = readFileSync("src/app/vendors/iso-taxonomy/page.tsx", "utf8");
const inSample = [...isoPage.matchAll(/CAEV\/\/([A-Z]{4})/g)].map((m) => m[1]);
assert.ok(inSample.length > 0, "no CAEV found in the MT564 sample - the matcher has drifted");
const available = new Set(seen.map((s) => s.caev));
for (const code of inSample) {
  assert.ok(available.has(code),
    `the MT564 sample shows CAEV ${code}, but no event in rules.json uses it - ` +
    `a reader following the reference finds nothing`);
}

// 5. And the page must never carry a retired non-event code anywhere, including
//    its reference catalogue - that is what made it misleading in the first place.
// Matched as a WORD, not as an exact quoted string. The first version tested
// `"OFFO"` and so walked straight past isoCAEV: "OFFO / BUTF" on the Partial
// Tender row -- a bundled value hides every code in it from an exact match.
// Found by looking at the rendered page, not the source.
const pageCodeValues = [
  ...[...isoPage.matchAll(/isoCAEV:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...isoPage.matchAll(/code:\s*"([^"]+)"/g)].map((m) => m[1]),
];
for (const [code, why] of NOT_EVENT_CODES) {
  const carrier = pageCodeValues.find((value) =>
    value.split(/[^A-Z]+/).filter(Boolean).includes(code),
  );
  assert.ok(!carrier, `the ISO page still lists "${carrier}" containing ${code}, which is ${why}`);
}

console.log(
  `check-caev-codes: ok (${byEvent.size} events, ${available.size} codes, sample shows ${inSample.join(", ")})`,
);
