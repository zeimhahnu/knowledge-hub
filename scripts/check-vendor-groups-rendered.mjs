#!/usr/bin/env node
/**
 * Every vendor group the verdict derives must be rendered somewhere.
 *
 * `deriveVendorGroups` returns six groups; the investigation list must own all
 * six in one ordered render path. A freshly selected vendor starts in
 * `unchecked`, so that group must also expose the first-observation control.
 *
 * This guards the bug class, not the instance: derive a group, render it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveVendorGroups } from "../src/lib/lookup-verdict.ts";

const investigationList = readFileSync(new URL("../src/components/lookup/vendor-investigation-list.tsx", import.meta.url), "utf8");

// Shape-only verdict: we want the KEYS, not a real computation.
const groups = deriveVendorGroups({ rows: [], totals: {}, empty: true });
const names = Object.keys(groups);
assert.ok(names.length >= 6, "expected the full group set, got " + names.join(", "));

const missing = names.filter((name) => !investigationList.includes(name));
assert.deepEqual(
  missing, [],
  "these derived groups are never rendered, so their vendors cannot be marked: " + missing.join(", "),
);
console.log("all " + names.length + " vendor groups are rendered: " + names.join(", "));

// The unchecked group specifically must carry the mark control, since it is
// the only entry point for a first observation.
const uncheckedBlock = investigationList.slice(investigationList.indexOf('"unchecked"'));
assert.match(
  uncheckedBlock, /onMarkChange/,
  "the unchecked group must expose onMarkChange - it is the only way to record a first mark",
);
console.log("the unchecked group exposes the mark control");
