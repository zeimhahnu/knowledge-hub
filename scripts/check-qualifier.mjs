import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };
import { computeLookupVerdict, treatmentFor } from "../src/lib/lookup-verdict.ts";

const today = new Date("2026-09-01T00:00:00Z");
const exDate = new Date("2026-09-15T00:00:00Z");
const base = (eventType, filters) => computeLookupVerdict({
  ticker: "AAPL", eventType, exDate, today, scope: ["msci"], filters,
  getConfirmation: () => null,
});
const texts = (result) => result.rows[0].treatments.map((row) => row.treatment);

assert.equal(rules.rules.filter((r) => r.vendor === "msci" && r.event_type === "cash-dividend").length, 3);
assert.equal(treatmentFor("msci", "cash-dividend").length, 3);
assert.equal(texts(base("cash-dividend")).length, 3);
assert.equal(texts(base("cash-dividend", { indexType: "total-return" })).length, 1);
assert.match(texts(base("cash-dividend", { indexType: "total-return" }))[0], /Gross Daily Total Return/);
assert.equal(texts(base("rights-issue")).length, 2);
assert.equal(texts(base("rights-issue", { conditions: { rights_moneyness: "in-the-money" } })).length, 1);
assert.match(texts(base("rights-issue", { conditions: { rights_moneyness: "in-the-money" } }))[0], /in-the-money/);
const ftse = (filters) => computeLookupVerdict({
  ticker: "AAPL", eventType: "cash-dividend", exDate, today, scope: ["ftse"], filters,
  getConfirmation: () => null,
});
assert.deepEqual(texts(ftse()), texts(ftse({ indexType: "total-return" })));
console.log("OK");
