import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const dock = await readFile(new URL("src/components/lookup/ca-analyst-dock.tsx", root), "utf8");
const globals = await readFile(new URL("src/app/globals.css", root), "utf8");

const portalStart = dock.indexOf("createPortal(");
assert.ok(portalStart >= 0, "Analyst chrome must render through a React portal");
const portalBody = dock.indexOf("document.body", portalStart);
assert.ok(portalBody > portalStart, "Analyst portal target must be document.body");
const portalMarkup = dock.slice(portalStart, portalBody);
assert.match(portalMarkup, /<button[\s\S]*<aside/, "launcher and dock must share the body-level portal");
assert.doesNotMatch(
  dock.slice(0, portalStart),
  /className=\"[^\"]*fixed[^\"]*\"/,
  "fixed Analyst chrome must not be returned outside the portal",
);

// These properties establish a containing block for position:fixed descendants.
// This source guard intentionally models the browser rule so a future wrapper cannot
// quietly reintroduce the page-height dock regression.
const containingBlockProperties = /(?:transform|filter|perspective|will-change|contain\s*:\s*paint)/i;
assert.doesNotMatch(portalMarkup, containingBlockProperties, "portal chrome must not carry a containing-block property");
assert.match(dock, /className=\"[^\"]*box-border[^\"]*fixed[^\"]*right-0/, "dock must be border-box and anchored to the viewport edge");
assert.match(dock, /className=\"[^\"]*box-border[^\"]*fixed[^\"]*bottom-6[^\"]*right-6/, "launcher must be border-box and remain inside the viewport");

const pageEnter = globals.match(/@keyframes\s+ca-page-enter\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
assert.ok(pageEnter, "ca-page-enter must remain defined");
assert.doesNotMatch(pageEnter, /transform\s*:/, "page-enter must not leave an identity transform containing block behind");

console.log("check-fixed-positioning: PASS (body portal, containing-block guard, viewport-edge anchoring, transform-free page enter)");
