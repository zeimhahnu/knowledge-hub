#!/usr/bin/env node
/**
 * Offline HTTP-contract check for /api/news. No real search calls are made.
 * Run from repo root: node --experimental-transform-types scripts/check-news-route.mjs
 */
import assert from "node:assert/strict";
import { GET } from "../src/app/api/news/route.ts";

const request = (query) => new Request(`http://localhost/api/news?${query}`);
const originalKey = process.env.TAVILY_API_KEY;
const originalFetch = globalThis.fetch;

try {
  const malformed = await GET(request("ticker=???&eventType=cash-dividend&exDate=2026-09-04"));
  assert.equal(malformed.status, 400, "malformed ticker must be rejected at the route boundary");
  assert.equal((await malformed.json()).code, "INVALID_TICKER");

  delete process.env.TAVILY_API_KEY;
  globalThis.fetch = () => {
    throw new Error("the no-key degradation path must not call fetch");
  };
  const unconfigured = await GET(
    request("ticker=AAPL&eventType=cash-dividend&exDate=2026-12-15&companyName=Apple"),
  );
  assert.equal(unconfigured.status, 503, "missing Tavily key must be honest degradation");
  const degraded = await unconfigured.json();
  assert.equal(degraded.validationRan, false);
  assert.equal(degraded.errorCode, "NEWS_NOT_CONFIGURED");
  assert.equal(degraded.verdict, "unverified", "degradation must not fabricate a result");
  assert.deepEqual(degraded.sources, []);

  process.env.TAVILY_API_KEY = "offline-test-key";
  const errors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => errors.push(args.join(" "));
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ detail: "Invalid API key" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  const rejected = await GET(
    request("ticker=AAPL&eventType=cash-dividend&exDate=2026-11-15&companyName=Apple Inc."),
  );
  console.error = originalConsoleError;
  assert.equal(rejected.status, 503, "an upstream provider rejection must stay honest degradation");
  const rejectedBody = await rejected.json();
  assert.equal(rejectedBody.errorCode, "NEWS_AUTH_ERROR");
  assert.match(rejectedBody.warning, /HTTP 401.*Invalid API key/);
  assert.ok(errors.some((line) => /status=401.*Invalid API key/.test(line)), "provider status and message must be logged");

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        results: [
          {
            title: "Apple Inc. dividend declared",
            content: "Apple dividend declared; ex-dividend date August 10, 2026.",
            url: "https://reuters.com/a-prior-cycle",
            published_date: "2026-08-12T00:00:00Z",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  const priorCycle = await GET(
    request("ticker=AAPL&eventType=cash-dividend&exDate=2026-09-01&companyName=Apple Inc."),
  );
  assert.equal(priorCycle.status, 200);
  assert.equal(priorCycle.headers.get("Cache-Control"), "public, s-maxage=600, stale-while-revalidate=1200");
  const result = await priorCycle.json();
  assert.equal(result.validationRan, true);
  assert.equal(result.verdict, "unverified", "a prior issuer cycle is context, not contradiction");
  assert.equal(result.sources[0].url, "https://reuters.com/a-prior-cycle");
} finally {
  if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
}

console.log("OK — /api/news route status, degradation, cache, and prior-cycle contracts pass");
