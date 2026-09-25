import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };
import { computeEntailment } from "../src/lib/vendor-entailment.ts";
import { franklinSnapshot, isReturnVariant, resolveFundRules } from "../src/lib/fund-master.ts";

const all = rules.rules;
const reviewed = franklinSnapshot.records.filter((r) => r.index_type && r.underlying_index && r.index_provider);
console.log("reviewed funds in snapshot: " + reviewed.length);

if (!reviewed.length) { console.log("no reviewed fund to exercise; skipping"); process.exit(0); }

const fund = reviewed[0];
const { resolution, rows } = resolveFundRules(fund.ticker, franklinSnapshot, all);
assert.equal(resolution.mode, "fund-resolved");
const agnostic = all.filter((r) => !r.index_type || r.index_type === "*").length;
const specific = all.filter((r) => r.index_type === fund.index_type).length;
// Without a recorded variant every PR/TR/NTR row stays; with one, only its branch stays.
const variantRows = fund.return_variant
  ? all.filter((r) => r.index_type === fund.return_variant).length
  : all.filter((r) => isReturnVariant(r.index_type)).length;

console.log(`fund ${fund.ticker} index_type=${fund.index_type}`);
console.log(`  total rules ............ ${all.length}`);
console.log(`  index-agnostic ......... ${agnostic}`);
console.log(`  specific to this fund .. ${specific}`);
console.log(`  resolved rule set ...... ${rows.length}`);

assert.equal(rows.length, agnostic + specific + variantRows, "resolved set must be agnostic + specific + return-variant rows");
assert.ok(rows.length >= agnostic, "resolving a fund must never shrink below the agnostic set");
assert.ok(rows.length > specific, "the old strict filter returned only the specific rules");
console.log("  ok  resolving a fund no longer discards index-agnostic rules");

// An index-specific rule for a DIFFERENT index type must still be excluded.
const foreign = all.find((r) => r.index_type && r.index_type !== "*" && r.index_type !== fund.index_type && !isReturnVariant(r.index_type));
if (foreign) {
  assert.ok(!rows.some((r) => r === foreign), "rules for another index type must stay excluded");
  console.log("  ok  rules for a different index type are still withheld");
}

// A recorded return_variant keeps only that variant's rows (MSCI cash dividend: NTR, not PR/TR).
const variantFund = { ...fund, return_variant: "net-total-return" };
const variantScoped = resolveFundRules(fund.ticker, { ...franklinSnapshot, records: [variantFund] }, all).rows;
const msciCash = variantScoped.filter((r) => r.vendor === "msci" && r.event_type === "cash-dividend").map((r) => r.index_type);
assert.ok(msciCash.includes("net-total-return"), "the fund's own variant row must stay");
assert.ok(!msciCash.includes("price-return") && !msciCash.includes("total-return"), "other variants' rows must drop");
console.log("  ok  a recorded return_variant keeps only its own variant rows");

// Entailment must use the same per-vendor return-variant context as the lookup.
// These rows deliberately share the event but differ only by return series.
const variantEntailmentRules = [
  { vendor: "msci", event_type: "cash-dividend", index_type: "net-total-return", treatment: "MSCI NTR", source_ref: "fixture:msci:ntr" },
  { vendor: "msci", event_type: "cash-dividend", index_type: "price-return", treatment: "MSCI PR", source_ref: "fixture:msci:pr" },
  { vendor: "msci", event_type: "cash-dividend", index_type: "total-return", treatment: "MSCI TR", source_ref: "fixture:msci:tr" },
  { vendor: "morningstar", event_type: "cash-dividend", index_type: "net-total-return", treatment: "Morningstar NTR", source_ref: "fixture:morningstar:ntr" },
];
const ntrContext = {
  msci: fund.index_type,
  morningstar: fund.index_type,
};
const ntrVariants = { msci: "net-total-return", morningstar: "net-total-return" };
const matchingNtr = computeEntailment({
  eventType: "cash-dividend",
  absent: ["msci"],
  confirmed: ["morningstar"],
  rules: variantEntailmentRules,
  indexTypes: ntrContext,
  returnVariants: ntrVariants,
});
assert.equal(matchingNtr[0].verdict, "contradicted", "matching NTR rows must participate in entailment");
assert.deepEqual(matchingNtr[0].drivers, ["morningstar"]);
console.log("  ok  matching NTR rows participate in entailment");

const withoutMsciNtr = variantEntailmentRules.filter((rule) => !(rule.vendor === "msci" && rule.index_type === "net-total-return"));
const nonMatchingNtr = computeEntailment({
  eventType: "cash-dividend",
  absent: ["msci"],
  confirmed: ["morningstar"],
  rules: withoutMsciNtr,
  indexTypes: ntrContext,
  returnVariants: ntrVariants,
});
assert.equal(nonMatchingNtr[0].verdict, "indeterminate", "PR/TR rows must not judge an NTR fund");
console.log("  ok  PR/TR rows do not participate for an NTR fund");

const unresolvedVariant = computeEntailment({
  eventType: "cash-dividend",
  absent: ["msci"],
  confirmed: ["morningstar"],
  rules: variantEntailmentRules,
  indexTypes: ntrContext,
  returnVariants: { msci: null, morningstar: null },
});
assert.equal(unresolvedVariant[0].verdict, "contradicted", "a null return variant must keep the deliberate variant-row fallback");
console.log("  ok  null return_variant keeps the deliberate all-variant fallback");

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

// Preserve cataloged-unreviewed coverage after later slices review SOEZ.
const unreviewedSnapshot = {
  ...franklinSnapshot,
  records: franklinSnapshot.records.filter((record) => record.ticker !== "SOEZ"),
};
const cataloged = resolveFundRules("SOEZ", unreviewedSnapshot, perVendorRules);
assert.equal(cataloged.resolution.mode, "cataloged-unreviewed");
assert.equal(cataloged.resolution.ruleScope, "2-d");
assert.equal(cataloged.rows, perVendorRules, "cataloged-unreviewed keeps P0 rows");

const unresolved = resolveFundRules("FLIA", franklinSnapshot, perVendorRules);
assert.equal(unresolved.resolution.mode, "fund-unresolved");
const unresolvedEntailment = computeEntailment({
  eventType: "special-dividend",
  absent: ["msci"],
  confirmed: ["morningstar"],
  rules: perVendorRules,
  indexTypes: { msci: null, morningstar: null },
});
assert.equal(unresolvedEntailment[0].scope, "2-d");
assert.equal(unresolvedEntailment[0].verdict, "indeterminate", "unresolved fund must stay at 2-D scope");
console.log("  ok  fund with missing index fields remains unresolved at 2-D scope");
console.log("fund rule scoping OK");
