#!/usr/bin/env node
/** Offline issuer/evidence gate with synthetic search payloads. */
import assert from "node:assert/strict";
import { issuerMatches, scoreNewsValidation } from "../src/lib/news-validation.ts";

const EX_DATE = new Date("2026-09-15T00:00:00Z");
const issuer = { ticker: "ACME", companyName: "Acme Industries Inc" };
const dated = (title, content, url) => ({
  title,
  content,
  url,
  publishedDate: "2026-09-10T00:00:00Z",
});

const contosoHoldings = dated(
  "Contoso Holdings REIT Declares Monthly Dividend",
  "Contoso Holdings REIT announced its monthly cash dividend.",
  "https://example.com/contoso-holdings",
);
const roundup = dated(
  "12 Index Constituents Going Ex-Dividend This Week",
  "ACME is among the constituents going ex-dividend this week.",
  "https://example.com/acme-roundup",
);
const acmeCdr = dated(
  "Acme CDR (CAD Hedged) Goes Ex-Dividend",
  "ACME exposure is available through this Canadian depositary receipt.",
  "https://example.com/acme-cdr",
);
const acmeDividend = dated(
  "Acme Industries Inc (ACME) Declares Dividend, Ex-Date 2026-09-15",
  "Acme Industries Inc declared a quarterly cash dividend.",
  "https://example.com/acme-dividend",
);

assert.equal(
  issuerMatches(contosoHoldings, issuer.ticker, issuer.companyName),
  false,
  "Contoso Holdings must not match Acme Industries Inc",
);
assert.equal(
  issuerMatches(acmeDividend, issuer.ticker, issuer.companyName),
  true,
  "standalone ACME must match Acme Industries Inc",
);
assert.equal(
  issuerMatches(roundup, issuer.ticker, issuer.companyName),
  true,
  "a snippet-only ACME mention survives issuer filtering for reader visibility",
);

const strongOnly = scoreNewsValidation({
  exDate: EX_DATE,
  eventType: "cash-dividend",
  results: [acmeDividend],
  ...issuer,
});
assert.equal(strongOnly.verdict, "confirmed", "issuer-specific title is strong evidence");
assert.doesNotMatch(strongOnly.sources[0].title, /^\[Weak evidence\]/);

const weakOnly = scoreNewsValidation({
  exDate: EX_DATE,
  eventType: "cash-dividend",
  results: [roundup, acmeCdr],
  ...issuer,
});
assert.equal(weakOnly.verdict, "unverified", "weak-only evidence cannot decide");
assert.equal(weakOnly.sources.length, 2, "weak sources remain visible to the reader");
assert.match(weakOnly.sources[0].title, /^\[Weak evidence\]/, "roundup is weak");
assert.match(weakOnly.sources[1].title, /^\[Weak evidence\]/, "CDR wrapper is weak");
assert.match(weakOnly.reasoning, /0 strong, 2 weak/, "reasoning audits evidence strength");
assert.match(
  weakOnly.reasoning,
  /none was strong enough to confirm or contradict this issuer's event/,
  "weak-only reasoning explains why the verdict is withheld",
);

const rejectedOnly = scoreNewsValidation({
  exDate: EX_DATE,
  eventType: "cash-dividend",
  results: [contosoHoldings],
  ...issuer,
});
assert.equal(rejectedOnly.verdict, "unverified", "no issuer evidence must be unverified");
assert.equal(rejectedOnly.sources.length, 0, "wrong-issuer sources must not be cited");
assert.match(rejectedOnly.reasoning, /1 dropped for issuer mismatch/, "reasoning audits drops");

console.log("OK — issuer relevance and evidence strength protect ACME validation");
