import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };
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
console.log("fund rule scoping OK");
