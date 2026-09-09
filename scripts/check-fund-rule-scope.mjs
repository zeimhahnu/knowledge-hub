import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };
import { computeEntailment } from "../src/lib/vendor-entailment.ts";
import { franklinSnapshot, resolveFundRules } from "../src/lib/fund-master.ts";

const all = rules.rules;
const reviewed = franklinSnapshot.records.filter((r) => r.index_type && r.underlying_index && r.index_provider);
console.log("reviewed funds in snapshot: " + reviewed.length);

if (!reviewed.length) { console.log("no reviewed fund to exercise; skipping"); process.exit(0); }

const fund = reviewed[0];
const { resolution, rows } = resolveFundRules(fund.ticker, franklinSnapshot, all);
assert.equal(resolution.mode, "fund-resolved");
const agnostic = all.filter((r) => !r.index_type || r.index_type === "*").length;
const specific = all.filter((r) => r.index_type === fund.index_type).length;

console.log(`fund ${fund.ticker} index_type=${fund.index_type}`);
console.log(`  total rules ............ ${all.length}`);
console.log(`  index-agnostic ......... ${agnostic}`);
console.log(`  specific to this fund .. ${specific}`);
console.log(`  resolved rule set ...... ${rows.length}`);

assert.equal(rows.length, agnostic + specific, "resolved set must be agnostic + specific");
assert.ok(rows.length >= agnostic, "resolving a fund must never shrink below the agnostic set");
assert.ok(rows.length > specific, "the old strict filter returned only the specific rules");
console.log("  ok  resolving a fund no longer discards index-agnostic rules");

// An index-specific rule for a DIFFERENT index type must still be excluded.
const foreign = all.find((r) => r.index_type && r.index_type !== "*" && r.index_type !== fund.index_type);
if (foreign) {
  assert.ok(!rows.some((r) => r === foreign), "rules for another index type must stay excluded");
  console.log("  ok  rules for a different index type are still withheld");
}

// Per-vendor fund context must resolve contrasting index types in one lookup.
// Keep this fixture small: the assertion is about the resolver/entailment
// contract, not about whichever event currently has enough curated rows.
const contrasting = reviewed.filter((record, index, records) =>
  records.findIndex((candidate) => candidate.index_type === record.index_type) === index,
);
assert.ok(contrasting.length >= 2, "the reviewed table must include two different index types");
const [marketCapFund, contrastingFund] = contrasting;
const perVendorRules = [
  { vendor: "msci", event_type: "special-dividend", index_type: marketCapFund.index_type, treatment: "market-cap treatment", source_ref: "fixture:market-cap" },
  { vendor: "morningstar", event_type: "special-dividend", index_type: contrastingFund.index_type, treatment: "contrasting treatment", source_ref: "fixture:contrasting" },
];
const marketCapResolution = resolveFundRules(marketCapFund.ticker, franklinSnapshot, perVendorRules);
const contrastingResolution = resolveFundRules(contrastingFund.ticker, franklinSnapshot, perVendorRules);
assert.equal(marketCapResolution.resolution.mode, "fund-resolved");
assert.equal(contrastingResolution.resolution.mode, "fund-resolved");
assert.notEqual(marketCapResolution.resolution.indexType, contrastingResolution.resolution.indexType);
assert.notEqual(marketCapResolution.rows[0]?.treatment, contrastingResolution.rows[0]?.treatment);
const differentTypes = computeEntailment({
  eventType: "special-dividend",
  absent: ["msci"],
  confirmed: ["morningstar"],
  rules: perVendorRules,
  indexTypes: {
    msci: marketCapResolution.resolution.indexType,
    morningstar: contrastingResolution.resolution.indexType,
  },
});
assert.equal(differentTypes[0].verdict, "indeterminate", "different resolved index types must not be compared");
console.log("  ok  different per-vendor index types do not cross-judge treatments");

const unresolved = resolveFundRules("FLIA", franklinSnapshot, perVendorRules);
assert.equal(unresolved.resolution.mode, "cataloged-unreviewed");
const unresolvedEntailment = computeEntailment({
  eventType: "special-dividend",
  absent: ["msci"],
  confirmed: ["morningstar"],
  rules: perVendorRules,
  indexTypes: { msci: null, morningstar: null },
});
assert.equal(unresolvedEntailment[0].scope, "2-d");
assert.equal(unresolvedEntailment[0].verdict, "indeterminate", "unresolved fund must stay at 2-D scope");
console.log("  ok  cataloged-unreviewed fund remains unresolved at 2-D scope");
console.log("fund rule scoping OK");
