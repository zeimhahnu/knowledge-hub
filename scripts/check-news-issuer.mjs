#!/usr/bin/env node
/** Offline issuer-relevance gate for the real 2026-09-03 AAPL search failure. */
import assert from "node:assert/strict";
import { issuerMatches, scoreNewsValidation } from "../src/lib/news-validation.ts";

const EX_DATE = new Date("2026-09-01T00:00:00Z");
const issuer = { ticker: "AAPL", companyName: "Apple Inc" };
const dated = (title, content, url) => ({
  title,
  content,
  url,
  publishedDate: "2026-08-28T00:00:00Z",
});

const appleHospitality = dated(
  "Apple Hospitality REIT, Inc. Declares Monthly Dividend",
  "Apple Hospitality REIT, Inc. announced its monthly cash dividend.",
  "https://example.com/apple-hospitality",
);
const appleDividend = dated(
  "Apple Inc. (AAPL) declares $0.25 dividend",
  "Apple Inc. declared a quarterly cash dividend.",
  "https://example.com/apple-dividend",
);
const listicle = dated(
  "11 S&P 500 Dividend Stocks Going Ex-Dividend",
  "A roundup of companies with dividends due this month.",
  "https://example.com/dividend-listicle",
);

assert.equal(
  issuerMatches(appleHospitality, issuer.ticker, issuer.companyName),
  false,
  "Apple Hospitality must not match Apple Inc",
);
assert.equal(
  issuerMatches(appleDividend, issuer.ticker, issuer.companyName),
  true,
  "standalone AAPL must match Apple Inc",
);
assert.equal(
  issuerMatches(listicle, issuer.ticker, issuer.companyName),
  false,
  "generic dividend listicle must not match Apple Inc",
);

const rejectedOnly = scoreNewsValidation({
  exDate: EX_DATE,
  eventType: "cash-dividend",
  results: [appleHospitality, listicle],
  ...issuer,
});
assert.equal(rejectedOnly.verdict, "unverified", "no issuer evidence must be unverified");
assert.notEqual(rejectedOnly.verdict, "contradicted", "wrong issuer can never contradict");
assert.equal(rejectedOnly.sources.length, 0, "wrong-issuer sources must not be cited");
assert.match(rejectedOnly.reasoning, /2 dropped for issuer mismatch/, "reasoning audits drops");

console.log("OK — issuer relevance rejects unrelated AAPL dividend results");
