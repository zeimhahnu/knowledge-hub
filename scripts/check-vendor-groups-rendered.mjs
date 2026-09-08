#!/usr/bin/env node
/**
 * Every vendor group the verdict derives must be rendered somewhere.
 *
 * `deriveVendorGroups` returns six groups; the lookup view rendered only two,
 * and both of those are defined BY a user mark. A freshly selected vendor
 * starts in `unchecked`, which was rendered nowhere - so there was no control
 * to record the first observation, and the two visible groups could never
 * fill. The marking UI existed and was simply unreachable.
 *
 * This guards the bug class, not the instance: derive a group, render it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveVendorGroups } from "../src/lib/lookup-verdict.ts";

const view = readFileSync(new URL("../src/components/lookup/lookup-view.tsx", import.meta.url), "utf8");

// Shape-only verdict: we want the KEYS, not a real computation.
const groups = deriveVendorGroups({ rows: [], totals: {}, empty: true });
const names = Object.keys(groups);
assert.ok(names.length >= 6, "expected the full group set, got " + names.join(", "));

const missing = names.filter((name) => !view.includes("groups?." + name));
assert.deepEqual(
  missing, [],
  "these derived groups are never rendered, so their vendors cannot be marked: " + missing.join(", "),
);
console.log("all " + names.length + " vendor groups are rendered: " + names.join(", "));

// The unchecked group specifically must carry the mark control, since it is
// the only entry point for a first observation.
const uncheckedBlock = view.slice(view.indexOf("groups?.unchecked"));
assert.match(
  uncheckedBlock.slice(0, 900), /onMarkChange/,
  "the unchecked group must expose onMarkChange - it is the only way to record a first mark",
);
console.log("the unchecked group exposes the mark control");
