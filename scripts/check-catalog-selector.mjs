#!/usr/bin/env node
import assert from "node:assert/strict";
import { activeFranklinCatalog, franklinCatalog, franklinSnapshot, resolveFundRules } from "../src/lib/fund-master.ts";
import { computeLookupVerdict } from "../src/lib/lookup-verdict.ts";

const catalog = activeFranklinCatalog();
assert(catalog.length > 0, "active catalog must contain selectable rows");
assert(catalog.every((row) => !row.url.includes("/investments/closed/")), "closed products must not be active");
assert.equal(catalog.some((row) => row.ticker === "FLJP"), true);
assert.equal(franklinCatalog.records.some((row) => row.url.includes("/investments/closed/")), false, "closed rows stay segregated from records");

const rules = [
  { vendor: "ftse", event_type: "cash-dividend", index_type: "market-cap-weighted", treatment: "reviewed" },
  { vendor: "msci", event_type: "cash-dividend", index_type: "*", treatment: "p0" },
];
const fljp = resolveFundRules("fljp", franklinSnapshot, rules);
assert.equal(fljp.resolution.mode, "fund-resolved");
assert.equal(fljp.resolution.ruleScope, "3-d");
assert.deepEqual(fljp.rows.map((row) => row.vendor), ["ftse"]);

const cataloged = resolveFundRules("FLIA", franklinSnapshot, rules);
assert.equal(cataloged.resolution.mode, "cataloged-unreviewed");
assert.equal(cataloged.resolution.ruleScope, "2-d");
assert.equal(cataloged.rows, rules, "cataloged-unreviewed keeps P0 rows");
assert.match(cataloged.resolution.warnings[0], /metadata has not been reviewed/);

const noFund = resolveFundRules(undefined, franklinSnapshot, rules);
assert.equal(noFund.resolution.mode, "p0-compat");
assert.equal(noFund.rows, rules, "unset control keeps P0 rows");

const verdictInput = {
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: new Date("2026-09-10T00:00:00Z"),
  today: new Date("2026-09-01T00:00:00Z"),
  scope: ["msci"],
  getConfirmation: () => null,
};
const verdict = computeLookupVerdict({ ...verdictInput, fundTicker: "FLIA" });
const p0Verdict = computeLookupVerdict(verdictInput);
assert.equal(verdict.rows[0].treatment, p0Verdict.rows[0].treatment, "cataloged-unreviewed lookup retains 2-D P0 treatment");
console.log(`catalog selector check passed: ${catalog.length} active rows; FLJP 3-D; cataloged fallback; closed exclusion; unset P0`);
