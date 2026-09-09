#!/usr/bin/env node
/**
 * Keep client-side internal API requests compatible with next.config's
 * trailingSlash setting. A redirected POST may not replay its body reliably.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const nextConfig = readFileSync(path.resolve("next.config.ts"), "utf8");
assert.match(nextConfig, /trailingSlash\s*:\s*true/, "next.config.ts must keep trailingSlash: true");

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(absolute);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolute] : [];
  });
}

const violations = [];
const fetchCall = /\b(?:fetch|fetchImpl)\s*\(\s*(["'`])([\s\S]*?)\1/g;
for (const file of filesIn(ROOT)) {
  if (file.includes(`${path.sep}app${path.sep}api${path.sep}`)) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(fetchCall)) {
    const target = match[2];
    if (!target.startsWith("/api/")) continue;
    const internalPath = target.split(/[?#]/, 1)[0];
    if (!internalPath.endsWith("/")) {
      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`${path.relative(process.cwd(), file)}:${line} -> ${target}`);
    }
  }
}

assert.deepEqual(violations, [], `client-side internal API paths need trailing slashes:\n${violations.join("\n")}`);
console.log("OK — client-side internal API paths use trailing slashes");
