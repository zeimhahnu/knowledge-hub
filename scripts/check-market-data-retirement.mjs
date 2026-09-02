#!/usr/bin/env node
/** No-network contract check for the Yahoo v8/chart client relocation. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { makeYahooChartRequest, normalizeTicker } from "../src/lib/market-data/yahoo-chart.ts";

const request = makeYahooChartRequest({ ticker: " brk.b ", interval: "1d", range: "10y", events: "div|split" });
assert.equal(request.ticker, "BRK-B");
assert.equal(
  request.url,
  "https://query1.finance.yahoo.com/v8/finance/chart/BRK-B?interval=1d&range=10y&events=div%7Csplit",
);
assert.equal(normalizeTicker(" 7203.T "), "7203.T");
assert.throws(() => makeYahooChartRequest({ ticker: "bad/ticker" }), /INVALID_TICKER/);
assert.equal(existsSync("src/app/investors"), false, "retired /investors route must be absent");
assert.equal(existsSync("src/app/api/investors"), false, "retired /api/investors routes must be absent");
const lookupRoute = readFileSync("src/app/lookup/[ticker]/page.tsx", "utf8");
assert.doesNotMatch(lookupRoute, /(?:@\/lib\/investors|components\/investors|\/api\/investors)/);
console.log("✓ Yahoo v8/chart request contract and lookup isolation verified (no network)");
