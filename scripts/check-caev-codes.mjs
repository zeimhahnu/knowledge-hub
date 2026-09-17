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

// 3. The specific regression: cash-dividend is DVCA, and DVCA is reachable.
assert.equal(
  byEvent.get("cash-dividend")?.values().next().value,
  "DVCA",
  "cash-dividend must be DVCA - it is badged mandatory, and DVOP is an election",
);

// 4. Every CAEV named in the ISO reference page resolves to a real event, so the
//    page can never document a code the product does not use.
const isoPage = readFileSync("src/app/vendors/iso-taxonomy/page.tsx", "utf8");
const documented = new Set(
  [...isoPage.matchAll(/CAEV\s*[—-]\s*([A-Z]{4})/g)].map((m) => m[1]),
);
const available = new Set(seen.map((s) => s.caev));
for (const code of documented) {
  assert.ok(
    available.has(code),
    `the ISO page documents CAEV ${code}, but no event in rules.json uses it - ` +
      `a reader following the reference finds nothing`,
  );
}

console.log(
  `check-caev-codes: ok (${byEvent.size} events, ${available.size} codes, ${documented.size} documented on the ISO page)`,
);
