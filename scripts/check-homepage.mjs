import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const match = source.match(/const TICKER_RE[\s\S]*?export function buildLookupUrl\([^)]*\): string \| null \{[\s\S]*?\n\}/);

assert.ok(match, "buildLookupUrl must be exported from src/app/page.tsx");
const executable = match[0]
  .replace("export function", "function")
  .replace("function isValidDate(value: string): boolean", "function isValidDate(value)")
  .replace(
    "function buildLookupUrl(ticker: string, eventType: string, exDate: string): string | null",
    "function buildLookupUrl(ticker, eventType, exDate)",
  );
const buildLookupUrl = new Function(`${executable}; return buildLookupUrl;`)();

assert.equal(
  buildLookupUrl("brk.b", "cash-dividend", "2026-09-30"),
  "/lookup/BRK.B/?eventType=cash-dividend&exDate=2026-09-30",
);
assert.equal(
  buildLookupUrl("^gspc", "stock-split", "2026-10-01"),
  "/lookup/%5EGSPC/?eventType=stock-split&exDate=2026-10-01",
);
assert.equal(buildLookupUrl("", "cash-dividend", "2026-09-30"), null);
assert.equal(buildLookupUrl("AAPL", "", "2026-09-30"), null);
assert.equal(buildLookupUrl("AAPL", "cash-dividend", "2026-2-30"), null);
assert.equal(buildLookupUrl("AAPL", "cash-dividend", "2026-02-30"), null);

console.log("OK");
