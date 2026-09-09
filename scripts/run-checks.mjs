#!/usr/bin/env node
// Runs every scripts/check-*.mjs guard. Until now CI ran exactly one of them,
// so the other 44 were decoration: check-catalog-selector had been asserting
// behaviour that commit 0f222dc deliberately replaced, and nothing noticed.
import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Needs a dev server on :3100. Run it yourself: npm run dev, then
// node --experimental-transform-types scripts/check-responsive.mjs
const NEEDS_SERVER = new Set(["check-responsive.mjs"]);

const dir = fileURLToPath(new URL(".", import.meta.url));
const only = process.argv.slice(2);
const names = (await readdir(dir))
  .filter((f) => f.startsWith("check-") && f.endsWith(".mjs"))
  .filter((f) => !NEEDS_SERVER.has(f))
  .filter((f) => !only.length || only.some((frag) => f.includes(frag)))
  .sort();

const failed = [];
for (const name of names) {
  const run = spawnSync(process.execPath, ["--experimental-transform-types", dir + name], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: 120_000,
  });
  if (run.status === 0) {
    console.log(`  ok   ${name}`);
  } else {
    failed.push(name);
    console.log(`  FAIL ${name}`);
    console.log((run.stderr || run.stdout || "no output").trimEnd().split("\n").map((l) => `       ${l}`).join("\n"));
  }
}

console.log(`\n${names.length - failed.length}/${names.length} checks passed` +
  (NEEDS_SERVER.size ? ` (${[...NEEDS_SERVER].join(", ")} skipped - needs a running server)` : ""));
if (failed.length) process.exit(1);
