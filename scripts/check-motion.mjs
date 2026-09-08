import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const sourceRoots = [new URL("../src/", import.meta.url)];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory.pathname, entry.name);
    if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory));
    else if (/\.(css|tsx|ts|js|mjs)$/.test(entry.name)) files.push(path);
  }
}

for (const directory of sourceRoots) await collect(directory);
const source = await Promise.all(files.map(async (path) => ({ path, text: await readFile(path, "utf8") })));
const globals = source.find(({ path }) => path.endsWith("src/app/globals.css"));
assert.ok(globals, "globals.css must be present");

const requiredTokens = {
  "--ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "--ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
  "--dur-press": "80ms",
  "--dur-state": "160ms",
  "--dur-panel": "260ms",
  "--dur-page": "320ms",
};
for (const [name, value] of Object.entries(requiredTokens)) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(globals.text, new RegExp(`${name}:\\s*${escapedValue}`), `${name} token is missing or changed`);
}
assert.match(globals.text, /--default-transition-duration:\s*var\(--dur-state\)/, "utility transitions must resolve through the state token");
assert.match(globals.text, /linear-gradient\(90deg, #fc4c02, #ef2cc1, #bdbbff, #ef2cc1, #fc4c02\)/, "brand rule must use the palindromic gradient");
assert.match(globals.text, /background-size:\s*200% 100%/, "brand rule must flow across two gradient widths");
assert.match(globals.text, /animation:\s*flow\s+var\(--dur-ambient\)\s+var\(--ease-linear\)\s+infinite/, "brand rule must use the ambient token and linear timing");

const literalDurationPattern = /(?:transition(?:-duration)?|animation(?:-duration)?)\s*:[^;\n]*(?:\b\d+(?:\.\d+)?(?:ms|s)\b)/g;
const utilityDurationPattern = /\b(?:duration|delay)-\d+(?:ms)?\b/g;
for (const { path, text } of source) {
  assert.deepEqual([...text.matchAll(literalDurationPattern)], [], `hard-coded transition/animation duration in ${path}`);
  assert.deepEqual([...text.matchAll(utilityDurationPattern)], [], `hard-coded duration utility in ${path}`);
}

const keyframes = [...globals.text.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1]);
assert.ok(keyframes.length > 0, "motion system must define keyframes");
const reducedMotion = globals.text.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*$/)?.[0] ?? "";
assert.match(reducedMotion, /animation:\s*none\s*!important/, "reduced motion must disable animations");
assert.match(reducedMotion, /transition-duration:\s*var\(--dur-press\)/, "reduced motion must cap transitions at the press token");
for (const keyframe of keyframes) {
  assert.match(globals.text, new RegExp(`animation:[^;]*${keyframe}`), `${keyframe} must be used by a tokenized animation`);
}

console.log(`check-motion: PASS (${keyframes.length} keyframes, tokenized timings, reduced-motion counterpart)`);
