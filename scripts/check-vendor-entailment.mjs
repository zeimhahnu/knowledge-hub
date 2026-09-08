#!/usr/bin/env node
/**
 * Cross-vendor entailment, against the REAL curated rules.
 * Alex's worked example is the first case: Morningstar published, MSCI did not,
 * both fire at >=5% of market price, therefore MSCI's silence is a real miss.
 */
import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };
import { computeEntailment, entailmentSummary } from "../src/lib/vendor-entailment.ts";

const rows = rules.rules;
const one = (r) => { assert.equal(r.length, 1, "expected exactly one result"); return r[0]; };

// 1. The worked example: shared 5% bar => contradicted.
const msci = one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: ["morningstar"], rules: rows,
}));
assert.equal(msci.verdict, "contradicted", "MSCI must be contradicted: " + msci.reason);
assert.deepEqual(msci.drivers, ["morningstar"]);
assert.ok(msci.ruleRefs.length > 0, "a contradiction must cite the rules it rests on");
assert.match(msci.reason, /5% of market price/);
console.log("  ok  MSCI absent + Morningstar confirmed -> contradicted");
console.log("      " + msci.reason);

// 2. Symmetry: the same logic in reverse.
assert.equal(one(computeEntailment({
  eventType: "special-dividend", absent: ["morningstar"], confirmed: ["msci"], rules: rows,
})).verdict, "contradicted");
console.log("  ok  the inference is symmetric for an equal bar");

// 3. Methodology silent (confidence: "absent") must NEVER be condemned.
for (const vendor of ["stoxx", "solactive"]) {
  const r = one(computeEntailment({
    eventType: "special-dividend", absent: [vendor], confirmed: ["morningstar", "msci"], rules: rows,
  }));
  assert.equal(r.verdict, "indeterminate", vendor + " publishes no treatment: " + r.reason);
}
console.log("  ok  STOXX / Solactive publish no treatment -> indeterminate, not contradicted");

// 4. Timing beats entailment: not-yet-due is early, never wrong.
const early = one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: ["morningstar"],
  notYetDue: ["msci"], rules: rows,
}));
assert.equal(early.verdict, "indeterminate");
assert.match(early.reason, /not yet due/);
console.log("  ok  a not-yet-due vendor is early, not wrong");

// 5. Nothing confirmed => nothing to test against.
assert.equal(one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: [], rules: rows,
})).verdict, "indeterminate");
console.log("  ok  no confirmed vendor -> indeterminate");

// 6. A STRICTER bar explains the silence instead of condemning it.
const synthetic = [
  { vendor: "msci", event_type: "special-dividend", index_type: "*", confidence: "stated",
    treatment: "adjust", source_ref: "rules:msci:x", conditions: { dividend_size_threshold_pct: 10, threshold_side: "at_or_above" } },
  { vendor: "morningstar", event_type: "special-dividend", index_type: "*", confidence: "stated",
    treatment: "adjust", source_ref: "rules:mstar:x", conditions: { dividend_size_threshold_pct: 5, threshold_side: "at_or_above" } },
];
const stricter = one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: ["morningstar"], rules: synthetic,
}));
assert.equal(stricter.verdict, "consistent", stricter.reason);
assert.match(stricter.reason, /stricter bar/);
console.log("  ok  MSCI at 10% vs Morningstar at 5% -> absence EXPLAINED, not condemned");
console.log("      " + stricter.reason);

// 7. ...and a LOOSER bar still condemns.
assert.equal(one(computeEntailment({
  eventType: "special-dividend", absent: ["morningstar"], confirmed: ["msci"], rules: synthetic,
})).verdict, "contradicted");
console.log("  ok  the looser bar is still contradicted by the stricter peer clearing");

// 8. Fund index type gates comparison (Alex: "is it market capped or not").
const indexed = [
  { vendor: "msci", event_type: "special-dividend", index_type: "market-cap-weighted", confidence: "stated",
    treatment: "adjust", source_ref: "rules:msci:mcw", conditions: { dividend_size_threshold_pct: 5, threshold_side: "at_or_above" } },
  { vendor: "morningstar", event_type: "special-dividend", index_type: "market-cap-weighted", confidence: "stated",
    treatment: "adjust", source_ref: "rules:mstar:mcw", conditions: { dividend_size_threshold_pct: 5, threshold_side: "at_or_above" } },
];
const capped = one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: ["morningstar"],
  rules: indexed, indexType: "market-cap-weighted",
}));
assert.equal(capped.verdict, "contradicted");
assert.equal(capped.scope, "3-d");
console.log("  ok  market-cap-weighted fund -> 3-d scope, rules compared");

const wrongIndex = one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: ["morningstar"],
  rules: indexed, indexType: "equal-weighted",
}));
assert.equal(wrongIndex.verdict, "indeterminate", "market-cap rules must not judge an equal-weighted fund");
console.log("  ok  equal-weighted fund -> market-cap-only rules are NOT applied");

const noFund = one(computeEntailment({
  eventType: "special-dividend", absent: ["msci"], confirmed: ["morningstar"], rules: indexed,
}));
assert.equal(noFund.scope, "2-d");
assert.equal(noFund.verdict, "indeterminate", "unresolved fund must not borrow index-specific rules");
console.log("  ok  unresolved fund -> 2-d scope, index-specific rules withheld");

// 9. Summary line.
const many = computeEntailment({
  eventType: "special-dividend", absent: ["msci", "stoxx"], confirmed: ["morningstar"], rules: rows,
});
assert.match(entailmentSummary(many), /should have published but did not: MSCI/);
console.log("  ok  summary names the contradicted vendors");

console.log("vendor entailment OK");
