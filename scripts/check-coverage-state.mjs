#!/usr/bin/env node
/**
 * Regression guard: data coverage comes from rules.json alone. Timing belongs
 * to coverage settings and must not leak into this pure corpus classification.
 */
import assert from "node:assert/strict";
import { dataCoverageFor } from "../src/lib/lookup-verdict.ts";

const eventType = "special-dividend";

for (const vendor of ["msci", "sp", "ftse", "morningstar"]) {
  assert.equal(
    dataCoverageFor(vendor, eventType),
    "states-treatment",
    `${vendor} states a treatment`,
  );
}

for (const vendor of ["stoxx", "solactive"]) {
  assert.equal(dataCoverageFor(vendor, eventType), "silent", `${vendor} is methodology silent`);
}

assert.equal(
  dataCoverageFor("absent-vendor", eventType),
  "not-covered",
  "an absent vendor is a corpus gap, not silence",
);

for (const vendor of ["msci", "sp", "ftse", "morningstar", "stoxx", "solactive"]) {
  const coverage = dataCoverageFor(vendor, eventType);
  assert.equal(typeof coverage, "string");
  assert.ok(!coverage.includes("timing"), `${vendor} data coverage contains no timing state`);
}

console.log("OK — data coverage is independent of timing and empty settings.");
