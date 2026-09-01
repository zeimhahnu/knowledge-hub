#!/usr/bin/env node
/**
 * Self-check for `src/lib/coverage.ts` — the coverage-window engine (§7a-i).
 *
 * Plain node, no deps, no test runner. Node ≥22.18 strips types natively, so
 * this imports the REAL module — the check can never drift from the source.
 *
 * Run from repo root: node scripts/check-coverage.mjs
 */
import assert from "node:assert/strict"
import { coverageState } from "../src/lib/coverage.ts"

const day = (iso) => new Date(iso)

const cases = [
  {
    name: "present at vendor -> covered",
    input: { exDate: day("2026-09-11"), today: day("2026-09-01"), leadDays: 5, presentAtVendor: true },
    expected: "covered",
  },
  {
    name: "absent, daysOut=10 leadDays=5 -> not-yet-due",
    input: { exDate: day("2026-09-11"), today: day("2026-09-01"), leadDays: 5, presentAtVendor: false },
    expected: "not-yet-due",
  },
  {
    name: "absent, daysOut=3 leadDays=5 -> missing",
    input: { exDate: day("2026-09-04"), today: day("2026-09-01"), leadDays: 5, presentAtVendor: false },
    expected: "missing",
  },
  {
    name: "absent, daysOut=0 leadDays=5 -> missing",
    input: { exDate: day("2026-09-01"), today: day("2026-09-01"), leadDays: 5, presentAtVendor: false },
    expected: "missing",
  },
  {
    name: "absent, daysOut=-2 (ex-date passed) -> missing",
    input: { exDate: day("2026-08-30"), today: day("2026-09-01"), leadDays: 5, presentAtVendor: false },
    expected: "missing",
  },
  {
    name: "BOUNDARY daysOut=5 leadDays=5 -> missing (the off-by-one that matters)",
    input: { exDate: day("2026-09-06"), today: day("2026-09-01"), leadDays: 5, presentAtVendor: false },
    expected: "missing",
  },
]

for (const { name, input, expected } of cases) {
  const got = coverageState(input)
  assert.equal(got, expected, `${name}: expected ${expected}, got ${got}`)
}

console.log(`OK — ${cases.length} coverage-state assertions pass (§7a-i)`)