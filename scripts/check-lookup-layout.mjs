#!/usr/bin/env node
/**
 * Structural guard for the staged lookup investigation.
 *
 * It intentionally fails against the pre-investigation page: that page renders
 * two CoverageMatrix instances in a two-column grid and has no single vendor
 * list that can own the publication window geometry.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const lookup = readFileSync(resolve(root, "src/components/lookup/lookup-view.tsx"), "utf8");
const listPath = resolve(root, "src/components/lookup/vendor-investigation-list.tsx");
let list = "";
try {
  list = readFileSync(listPath, "utf8");
} catch {
  // Keep the first failure useful on the old two-up page.
}

assert.doesNotMatch(
  lookup,
  /grid[^\n]*lg:grid-cols-2/,
  "lookup must not put vendor coverage into a side-by-side desktop grid",
);
assert.doesNotMatch(
  lookup,
  /CoverageMatrix|CoverageTimeline/,
  "lookup must render the merged investigation list, not the old split representations",
);
assert.match(
  lookup,
  /VendorInvestigationList/,
  "lookup must mount the merged vendor investigation list",
);
assert.match(list, /orderedRows\.map\(/, "vendors must be rendered by one ordered list map");
assert.equal(
  (list.match(/data-vendor-row/g) ?? []).length,
  1,
  "the vendor list must have one row template",
);
assert.match(list, /data-vendor-id=\{row\.vendor\}/, "each row must expose its vendor identity");
assert.match(list, /key=\{item\.row\.vendor\}/, "each vendor row must be keyed by its vendor identity");
assert.match(list, /GROUP_ORDER\.flatMap\(\(group\) => groups\[group\]\.map\(\(row\) => \(\{ row, group \}\)\)\)/, "all vendor groups must flatten into one ordered list");
assert.match(list, /GROUP_META|group.*supplied|expectedAbsent/, "grouping must remain inside the single vendor list");
assert.doesNotMatch(list, /overflow-x-auto|<table/, "the merged vendor list must never require horizontal scrolling");
assert.doesNotMatch(list, /md:grid-cols-\[/, "the four-column vendor row must stack below the wide desktop breakpoint");
assert.match(list, /lg:grid-cols-\[/, "the four-column vendor row must only activate at the wide desktop breakpoint");

console.log("OK — lookup uses one full-width, grouped vendor list with no split matrix or horizontal table wrapper.");
