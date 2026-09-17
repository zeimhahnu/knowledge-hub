#!/usr/bin/env node
/**
 * The relay validator is the gate between the browser and the Analyst, and until
 * 2026-09-16 nothing tested it -- it lived in route.ts behind `next/server` and
 * extensionless imports, which bare node cannot load.
 *
 * What it cost: a stock-split rule fires unconditionally, so it carries no
 * `conditions`, and JSON.stringify DROPS an undefined key. The validator required
 * the field, so the WHOLE request was rejected. Every Analyst lookup on an
 * unconditional rule returned "Invalid request" while the service sat idle with
 * an empty journal -- the request never left the hub. Reported live on 8035.T /
 * stock-split with 4 vendors.
 *
 * So this drives the REAL verdict engine and REAL context builder into the REAL
 * validator, through a JSON round-trip, because the round-trip is where an
 * undefined key disappears.
 */
import assert from "node:assert/strict";
import { computeLookupVerdict } from "../src/lib/lookup-verdict.ts";
import { buildAnalystLookupContext } from "../src/lib/ca-analyst/context.ts";
import { computeCuratedEntailment } from "../src/lib/vendor-entailment.ts";
import { validRequest } from "../src/lib/ca-analyst/validate-request.ts";
import { VENDOR_IDS } from "../src/lib/vendors.ts";

const EX_DATE = "2026-09-29";
const TODAY = new Date("2026-09-17T00:00:00Z");
const EVENT_TYPES = ["cash-dividend", "special-dividend", "rights-issue", "stock-split", "merger"];

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
};

function wire(ticker, eventType, scope, { withEntailment = true } = {}) {
  const verdict = computeLookupVerdict({
    ticker, eventType,
    exDate: new Date(`${EX_DATE}T00:00:00Z`), today: TODAY,
    scope, storage: memoryStorage(),
  });
  const entailment = withEntailment
    ? computeCuratedEntailment({
        eventType,
        absent: scope.slice(1),
        confirmed: scope.slice(0, 1),
        notYetDue: [],
        indexTypes: Object.fromEntries(scope.map((v) => [v, "market-cap"])),
      })
    : undefined;
  const lookup = buildAnalystLookupContext({
    ticker, eventType, exDate: EX_DATE, selectedVendors: scope, verdict,
    news: {
      validationRan: false, verdict: "unverified", confidence: "low", sources: [],
      reasoning: "News validation has not run yet.",
      warning: "News validation is unavailable for this lookup.",
    },
    entailment,
  });
  // The browser sends JSON. An undefined key does not survive that, which is the
  // whole point: validating the in-memory object would have passed all along.
  return JSON.parse(JSON.stringify({ lookup, question: `Why is ${ticker} treated this way?` }));
}

// The exact reported failure.
assert.equal(validRequest(wire("8035.T", "stock-split", ["msci", "ftse", "stoxx", "solactive"])), true,
  "8035.T / stock-split / 4 vendors must be accepted -- its rules carry no `conditions`");

// Every event type, full scope and single vendors.
for (const eventType of EVENT_TYPES) {
  assert.equal(validRequest(wire("AAPL", eventType, [...VENDOR_IDS])), true,
    `full scope / ${eventType} must be accepted`);
  for (const vendor of VENDOR_IDS) {
    assert.equal(validRequest(wire("AAPL", eventType, [vendor])), true,
      `solo ${vendor} / ${eventType} must be accepted`);
  }
}

// Entailment is optional on the wire; its absence must not fail the request.
assert.equal(validRequest(wire("AAPL", "stock-split", [...VENDOR_IDS], { withEntailment: false })), true,
  "a payload without entailment must still be accepted");

// The validator must still REJECT what it is there to reject.
const good = wire("AAPL", "special-dividend", [...VENDOR_IDS]);
const reject = (label, mutate) => {
  const bad = structuredClone(good);
  mutate(bad);
  assert.equal(validRequest(bad), false, `must reject: ${label}`);
};
reject("an unknown top-level key", (p) => { p.lookup.surprise = 1; });
reject("an unknown vendor", (p) => { p.lookup.selectedVendors.push("not-a-vendor"); });
reject("a malformed exDate", (p) => { p.lookup.exDate = "29-09-2026"; });
reject("an unknown rule confidence", (p) => { p.lookup.matrixRows[0].rules[0].confidence = "vibes"; });
reject("conditions as an array", (p) => { p.lookup.matrixRows[0].rules[0].conditions = []; });
reject("an empty question", (p) => { p.question = "   "; });
if (good.lookup.entailment?.length) {
  reject("an unknown entailment verdict", (p) => { p.lookup.entailment[0].verdict = "probably-fine"; });
  reject("an empty entailment reason", (p) => { p.lookup.entailment[0].reason = ""; });
}

console.log("check-ca-analyst-relay-validation: ok");
