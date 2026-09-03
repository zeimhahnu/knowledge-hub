#!/usr/bin/env node
/**
 * Self-check for `src/lib/news-validation.ts` — §8 news cross-validation.
 *
 * Plain node, no deps, NO network. Node ≥22.18 strips types natively, so
 * this imports the REAL module — the check can never drift from the source.
 *
 * Run from repo root: node scripts/check-news-validation.mjs
 */
import assert from "node:assert/strict";
import { scoreNewsValidation, eventSearchTerms } from "../src/lib/news-validation.ts";

const EX = new Date("2026-09-01T00:00:00Z");
const MS_DAY = 86_400_000;

/** A fake dated result `daysAgo` days before the ex-date (UTC), or `days` after when negative. */
const dated = (url, publishedDate, content) => ({ url, publishedDate, content });
const rel = (daysFromEx) => new Date(EX.getTime() + daysFromEx * MS_DAY).toISOString().slice(0, 10);
const inWindow = (daysFromEx, content, url = "https://reuters.com/article/x") =>
  dated(url, rel(daysFromEx), content);

const cases = [
  {
    name: "0 sources -> unverified/low (anti-hallucination: empty sources must stay unverified)",
    input: { exDate: EX, eventType: "dividend", results: [] },
    expect: { verdict: "unverified", confidence: "low", sources: 0 },
  },
  {
    name: "1 dated matching source -> confirmed/medium",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        inWindow(-12, "Apple declares a quarterly dividend of $0.25 per share; ex-dividend date September 1, 2026.", "https://reuters.com/a1"),
      ],
    },
    expect: { verdict: "confirmed", confidence: "medium", sources: 1 },
  },
  {
    name: "2 independent dated matching sources -> confirmed/high",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        inWindow(-12, "Apple board approves quarterly dividend of $0.25 per share.", "https://reuters.com/a1"),
        inWindow(-10, "Apple dividend: ex-dividend date set for September 1, 2026.", "https://marketwatch.com/a2"),
      ],
    },
    expect: { verdict: "confirmed", confidence: "high", sources: 2 },
  },
  {
    name: "dated source whose date contradicts the ex-date -> contradicted",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        // Published inside the window, matches the event, but says the event is delayed.
        inWindow(-5, "Apple postpones its dividend payment indefinitely amid a restructuring review.", "https://reuters.com/a3"),
      ],
    },
    expect: { verdict: "contradicted", sources: 1 },
  },
  {
    name: "dated source stating a conflicting ex-date in text -> contradicted",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        inWindow(5, "Apple announces the ex-dividend date will be October 15, 2026, not September.", "https://marketwatch.com/a4"),
      ],
    },
    expect: { verdict: "contradicted", sources: 1 },
  },
  {
    name: "historical prior-cycle issuer dividend is context, not contradiction",
    input: {
      exDate: EX,
      eventType: "dividend",
      ticker: "AAPL",
      companyName: "Apple Inc.",
      results: [
        inWindow(-20, "Apple dividend declared; ex-dividend date August 10, 2026.", "https://reuters.com/a-prior-cycle"),
      ],
    },
    expect: { verdict: "unverified", confidence: "low", sources: 1 },
  },
  {
    name: "2 same-domain dated sources count as 1 independent -> confirmed/medium",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        inWindow(-12, "Apple declares quarterly dividend of $0.25 per share.", "https://reuters.com/a1"),
        inWindow(-9, "Apple dividend ex-date September 1 confirmed.", "https://reuters.com/a5"),
      ],
    },
    expect: { verdict: "confirmed", confidence: "medium", sources: 2 },
  },
  {
    name: "dated source outside the window is discarded -> unverified",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        inWindow(-120, "Apple declares its quarterly dividend; ex-dividend date to be announced.", "https://reuters.com/a6"),
      ],
    },
    expect: { verdict: "unverified", confidence: "low", sources: 0 },
  },
  {
    name: "dated source not about the event is discarded -> unverified",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        inWindow(-5, "Tech stocks rally as the Fed signals a pause.", "https://bloomberg.com/a7"),
      ],
    },
    expect: { verdict: "unverified", confidence: "low", sources: 0 },
  },
  {
    name: "matching source without a real publication date is discarded -> unverified",
    input: {
      exDate: EX,
      eventType: "dividend",
      results: [
        dated("https://reuters.com/a8", null, "Apple declares a dividend of $0.25 per share."),
      ],
    },
    expect: { verdict: "unverified", confidence: "low", sources: 0 },
  },
]

let assertions = 0
const check = (cond, msg) => { assert.ok(cond, msg); assertions += 1 }

for (const { name, input, expect } of cases) {
  const got = scoreNewsValidation(input)
  check(got.verdict === expect.verdict, `${name}: verdict ${got.verdict}, expected ${expect.verdict}`)
  if (expect.confidence !== undefined) {
    check(got.confidence === expect.confidence, `${name}: confidence ${got.confidence}, expected ${expect.confidence}`)
  }
  check(got.sources.length === expect.sources, `${name}: sources ${got.sources.length}, expected ${expect.sources}`)
  // Anti-hallucination invariants on EVERY case:
  check(
    got.sources.length === 0 ? got.verdict === "unverified" : true,
    `${name}: empty sources must imply unverified`,
  )
  const injectedUrls = new Set(input.results.map((r) => r.url))
  for (const s of got.sources) {
    check(injectedUrls.has(s.url), `${name}: source URL ${s.url} must come verbatim from the injected results, never constructed`)
    check(/^\d{4}-\d{2}-\d{2}$/.test(s.publishedAt), `${name}: publishedAt must be YYYY-MM-DD, got ${s.publishedAt}`)
  }
}

// Term resolution sanity.
const terms = eventSearchTerms("dividend")
check(terms.includes("dividend"), "eventSearchTerms('dividend') resolves to dividend terms")
check(
  eventSearchTerms("totally-unknown-event").length > 0 && !eventSearchTerms("totally-unknown-event").includes(""),
  "unknown event types fall back to their own name (tool stays open)",
)
assertions += 2

console.log(`OK — ${assertions} news-validation assertions pass (§8)`)