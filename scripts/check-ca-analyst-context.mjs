#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildAnalystLookupContext } from "../src/lib/ca-analyst/context.ts";

const sources = Array.from({ length: 9 }, (_, index) => ({
  url: `https://example.test/news/${index}`,
  title: `<b>News ${index}</b>`,
  publishedAt: "2026-09-01",
  snippet: "display-only",
}));
const refs = Array.from({ length: 9 }, (_, index) => `<i>Rule ${index}</i>`);
const row = (vendor, state, confirmation = null) => ({
  vendor,
  state,
  rulePresent: true,
  confirmation,
  treatments: refs.map((sourceRef) => ({ sourceRef })),
});
const verdict = {
  rows: [
    row("ftse", "not-checked"),
    row("msci", "missing", { state: "absent", checkedAt: "2026-09-01T00:00:00.000Z" }),
  ],
};

const unavailable = buildAnalystLookupContext({
  ticker: " aapl ",
  eventType: " cash-dividend ",
  exDate: "2026-09-30",
  selectedVendors: ["ftse", "not-a-vendor", "msci", "ftse"],
  verdict,
  news: {
    validationRan: false,
    verdict: "unverified",
    confidence: "low",
    warning: "<strong>News unavailable</strong>",
    sources,
    reasoning: "unused display text",
  },
});

assert.equal(unavailable.ticker, "AAPL");
assert.equal(unavailable.eventType, "cash-dividend");
assert.deepEqual(unavailable.selectedVendors, ["ftse", "msci"], "only selected canonical vendors cross the wire");
assert.equal(unavailable.matrixRows.length, 2, "current selected rows are retained");
assert.equal(unavailable.matrixRows[0].state, "not-assessed", "P0 not-checked remains represented, not dropped");
assert.equal(unavailable.matrixRows[0].provenance, "inferred");
assert.equal(unavailable.matrixRows[1].provenance, "measured");
assert.equal(unavailable.matrixRows[0].ruleRefs.length, 8, "rule refs are capped");
assert.equal(unavailable.matrixRows[0].ruleRefs[0], "Rule 0", "display markup is stripped from rule refs");
assert.equal(unavailable.news.validationRan, false, "unavailable P0 state is preserved exactly");
assert.equal(unavailable.news.warning, "News unavailable", "display markup is stripped from warnings");
assert.equal(unavailable.news.sources.length, 8, "news sources are capped");
assert.equal(unavailable.news.sources[0].url, sources[0].url, "P0 source URL is preserved verbatim");
assert.equal(unavailable.news.sources[0].title, "News 0", "display markup is stripped from source titles");

console.log("OK — CA Analyst context bounds, selected rows, unavailable news, and source preservation pass");
