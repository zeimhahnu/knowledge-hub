#!/usr/bin/env node
import assert from "node:assert/strict";
import { computeDivergence } from "../src/lib/divergence.ts";

// A documented threshold difference is a real disagreement, not a null-driven one.
const specialDividend = computeDivergence(
  ["msci", "sp", "ftse", "stoxx", "morningstar", "solactive"],
  "special-dividend",
);
assert.equal(specialDividend.divergenceField, "threshold");
assert.ok(specialDividend.disagree.length > 0, "special dividend must report speakers that differ");
assert.ok(specialDividend.silent.includes("stoxx"));
assert.ok(specialDividend.silent.includes("solactive"));

// These four methodologies all say ordinary dividends have no price adjustment.
const cashDividend = computeDivergence(
  ["sp", "stoxx", "morningstar"],
  "cash-dividend",
);
assert.equal(cashDividend.divergenceField, null);
assert.deepEqual(cashDividend.disagree, []);
assert.deepEqual(cashDividend.agree, ["sp", "stoxx", "morningstar"]);

// Missing lead-time documentation is silence, never a conflicting opinion.
const leadTimes = computeDivergence(["msci", "sp"], "cash-dividend", "lead-time");
assert.equal(leadTimes.divergenceField, null);
assert.deepEqual(leadTimes.silent, ["msci", "sp"]);
assert.deepEqual(leadTimes.disagree, []);

// A registered app vendor with no rule row is distinct from methodology silence.
const notCovered = computeDivergence(["vettafi"], "cash-dividend");
assert.deepEqual(notCovered.notCovered, ["vettafi"]);
assert.deepEqual(notCovered.silent, []);

console.log("OK — divergence computation distinguishes treatment disagreement, consensus, silence, and not-covered vendors");
