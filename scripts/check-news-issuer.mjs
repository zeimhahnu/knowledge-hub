#!/usr/bin/env node
/** Offline issuer/evidence gate for the real 2026-09-03 AAPL search failure. */
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
  "Apple Inc. (AAPL) Declares $0.25 Dividend, Ex-Date September 15",
  "Apple Inc. declared a quarterly cash dividend.",
  "https://example.com/apple-dividend",
);
const listicle = dated(
  "11 S&P 500 Dividend Stocks Going Ex-Dividend",
  "This month AAPL, MSFT, and NVDA are among the companies going ex-dividend.",
  "https://example.com/dividend-listicle",
);
const appleCdr = dated(
  "Apple CDR (CAD Hedged) To Go Ex-Dividend",
  "AAPL exposure is available through this Canadian depositary receipt.",
  "https://example.com/apple-cdr",
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
  true,
  "a realistic listicle snippet mentioning AAPL survives issuer filtering",
);

const strongOnly = scoreNewsValidation({
  exDate: new Date("2026-09-15T00:00:00Z"),
  eventType: "cash-dividend",
  results: [appleDividend],
  ...issuer,
});
assert.equal(strongOnly.verdict, "confirmed", "Apple Inc. title is strong evidence");
assert.doesNotMatch(strongOnly.sources[0].title, /^\[Weak evidence\]/);

const weakOnly = scoreNewsValidation({
  exDate: EX_DATE,
  eventType: "cash-dividend",
  results: [listicle, appleCdr],
  ...issuer,
});
assert.equal(weakOnly.verdict, "unverified", "weak-only evidence cannot contradict");
assert.equal(weakOnly.sources.length, 2, "weak sources remain visible to the reader");
assert.match(weakOnly.sources[0].title, /^\[Weak evidence\]/, "listicle is weak");
assert.match(weakOnly.sources[1].title, /^\[Weak evidence\]/, "CDR wrapper is weak");
assert.match(weakOnly.reasoning, /0 strong, 2 weak/, "reasoning audits evidence strength");

const rejectedOnly = scoreNewsValidation({
  exDate: EX_DATE,
  eventType: "cash-dividend",
  results: [appleHospitality],
  ...issuer,
});
assert.equal(rejectedOnly.verdict, "unverified", "no issuer evidence must be unverified");
assert.equal(rejectedOnly.sources.length, 0, "wrong-issuer sources must not be cited");
assert.match(rejectedOnly.reasoning, /1 dropped for issuer mismatch/, "reasoning audits drops");

console.log("OK — issuer relevance and evidence strength protect AAPL validation");
