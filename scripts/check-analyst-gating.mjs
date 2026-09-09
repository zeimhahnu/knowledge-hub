#!/usr/bin/env node
/**
 * Regression guard for the CA Analyst launcher when news validation is unavailable.
 * Run from repo root: node --experimental-strip-types scripts/check-analyst-gating.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAnalystLookupContext } from "../src/lib/ca-analyst/context.ts";

const view = readFileSync(new URL("../src/components/lookup/lookup-view.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  view,
  /caAnalystEnabled\s*&&\s*verdict\s*&&\s*newsResult\s*&&\s*scope\.length\s*>\s*0/,
  "the analyst must not be gated on a successful news result",
);
assert.match(view, /validationRan:\s*false/, "the view must provide an unavailable-news context");
assert.match(view, /<CaAnalystDock context=\{analystContext\} \/>/, "the dock must render from the analyst context");

const context = buildAnalystLookupContext({
  ticker: "AAPL",
  eventType: "cash-dividend",
  exDate: "2026-09-30",
  selectedVendors: ["msci"],
  verdict: {
    rows: [{
      vendor: "msci",
      state: "not-checked",
      rulePresent: true,
      confirmation: null,
      treatments: [],
    }],
  },
  news: {
    verdict: "unverified",
    confidence: "low",
    sources: [],
    reasoning: "News validation has not run yet.",
    validationRan: false,
    warning: "News validation is unavailable for this lookup.",
  },
});
assert.equal(context.news.validationRan, false, "unavailable news must remain explicit in the wire context");
assert.equal(context.news.sources.length, 0, "unavailable news must not fabricate sources");

console.log("OK — analyst context and launcher remain available when news validation is unavailable");
