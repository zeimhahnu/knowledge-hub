#!/usr/bin/env node
// Every release gate must be runnable from a clean clone of THIS repo.
//
// Twice now a check has asserted against a task artifact in the parent workspace
// (agents/goop/memory/audit/*-raw.json, *-raw.xml.txt). Those files are untracked,
// so the gate passed inside one agent's working tree and failed - or silently
// stopped proving anything - everywhere else. A gate that only one machine can run
// is not a gate. Commit the evidence next to the data it proves instead.
import { readdirSync, readFileSync } from "node:fs";

const dir = new URL("./", import.meta.url);
const offenders = [];

for (const file of readdirSync(dir).filter((f) => f.startsWith("check-") && f.endsWith(".mjs"))) {
  if (file === "check-gates-selfcontained.mjs") continue;
  const src = readFileSync(new URL(file, dir), "utf8");
  // A read path that climbs out of the repo root. Bare "../src/..." is fine -
  // scripts/ sits one level down - so only flag climbs that leave the project.
  for (const m of src.matchAll(/["'`](\.\.\/[^"'`]*)["'`]/g)) {
    const path = m[1];
    if (/^\.\.\/(src|scripts|docs|public|node_modules)\//.test(path)) continue;
    offenders.push(`${file}: ${path}`);
  }
}

if (offenders.length) {
  console.error("Gates must not read outside the repo:");
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}
console.log(`OK - all gate scripts are self-contained`);
