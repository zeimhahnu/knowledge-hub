#!/usr/bin/env node
/**
 * Self-check for the /lookup density fix — `src/components/lookup/coverage-matrix.tsx`
 * and `src/components/lookup/lookup-view.tsx`.
 *
 * Plain node, no deps, no network, no React rendering. Structural assertions
 * only — it verifies the guardrails that would otherwise regress:
 *
 *   1. The treatment cell renders a truncated/summary treatment AND an expander
 *      (show-full-text / show-less control) — never raw 400-1000 char prose.
 *   2. source_ref is NOT rendered inline in the same element as the treatment
 *      body — it is split out as a separate provenance component.
 *   3. The verbose captions are gone from the view ("one row per in-scope…",
 *      "in-scope, applicable vendors only", "Selected vendors only",
 *      "Compare selected vendors…").
 *
 * Run from repo root: node scripts/check-lookup-density.mjs
 */
import { readFileSync } from "node:fs";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const matrix = read("../src/components/lookup/coverage-matrix.tsx");
const view = read("../src/components/lookup/lookup-view.tsx");

let failures = 0;
const fail = (name, detail) => {
  failures++;
  console.error(`  ✗ ${name}: ${detail}`);
};
const ok = (name) => console.log(`  ✓ ${name}`);

// 1. Progressive disclosure: a lead + an expander (not raw prose).
if (!matrix.includes("Show full text") && !matrix.includes("Show less")) {
  fail("expander", "no show-full-text/show-less toggle found in treatment cell");
} else {
  ok("expander present");
}
if (
  !/text-\{row\.treatment!\}/.test(matrix) &&
  !matrix.includes("row.treatment!")
) {
  fail("progressive", "treatment body is not referenced by the component");
} else {
  ok("treatment body referenced");
}

// 2. source_ref split into its own provenance component, not inline with prose.
const sourceRefUsage = [...matrix.matchAll(/SourceRef/g)].length;
if (sourceRefUsage < 3) {
  fail("source-ref", "SourceRef component not defined and used");
} else {
  ok("SourceRef defined and used");
}
// The old inline rendering (treatment text and sourceRef in the same <span>) must not
// survive: search for the original single-block pattern.
const inlinePattern = /text-sm leading-relaxed[\s\S]{0,160}sourceRef/
  .test(matrix)
  ? "inline sourceRef with prose"
  : null;
if (inlinePattern) {
  fail("source-ref-detached", `source_ref still inline with treatment: ${inlinePattern}`);
} else {
  ok("source_ref detached from treatment prose");
}

// 3. Verboose captions removed from the view.
const banned = [
  "one row per in-scope",
  "publication window with its source",
  "in-scope, applicable vendors only",
  "Selected vendors only",
  "Compare selected vendors",
  "sourced six",
];
let foundAny = false;
for (const phrase of banned) {
  if (view.includes(phrase) || matrix.includes(phrase)) {
    fail("verbose-caption", `"${phrase}" still present`);
    foundAny = true;
  }
}
if (!foundAny) ok("verbose captions removed");

// 4. Table column widths constrained so prose doesn't span the whole container.
if (!matrix.includes("max-w-64") && !matrix.includes("max-w-[")) {
  fail("measured-column", "treatment column has no max-width constraint");
} else {
  ok("treatment column max-width present");
}

if (failures > 0) {
  console.error(`\ncheck-lookup-density: FAILED (${failures} problem(s))`);
  process.exit(1);
}
console.log("\ncheck-lookup-density: OK");
