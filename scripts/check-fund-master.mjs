#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const snapshot = JSON.parse(await readFile("src/data/fund-master/franklin-etf-snapshot-2026-09-04.json", "utf8"));
const raw = JSON.parse(await readFile("../memory/audit/task-2026-09-05-ca-hub-p1b-franklin-vertical-slice-raw.json", "utf8"));
assert.equal(snapshot.schema_version, "1.0"); assert.match(snapshot.snapshot_id, /^franklin-etf-\d{4}-\d{2}-\d{2}$/); assert.equal(snapshot.records.length, 1); assert.equal(snapshot.acquisition.record_count, 1);
const urls = new Set(raw.sources.map((s) => s.url)); const tickers = new Set();
for (const fund of snapshot.records) { assert.match(fund.ticker, /^[A-Z0-9.\-^=]+$/); assert(!tickers.has(fund.ticker)); tickers.add(fund.ticker); for (const url of fund.source_urls) { assert.match(url, /^https:\/\//); assert(urls.has(url), `source missing from raw audit: ${url}`); } for (const field of ["ticker","name","isin","underlying_index","index_provider","index_type","universe","weighting","reconstitution_frequency","inception_date"]) { if (fund[field] === null) assert(fund.missing_fields.includes(field)); } assert.notEqual(fund.ticker, "VETTAFI"); }
assert.equal(snapshot.records.some((r) => r.index_provider === "Solactive"), false); assert.equal(snapshot.records.some((r) => r.ticker === "FLJP"), true);
const { franklinSnapshot, resolveFundRules } = await import("../src/lib/fund-master.ts");
const rules = [{ vendor: "ftse", event_type: "cash-dividend", index_type: "market-cap-weighted" }];
const resolved = resolveFundRules("fljp", franklinSnapshot, rules); assert.equal(resolved.resolution.mode, "fund-resolved"); assert.equal(resolved.resolution.indexType, "market-cap-weighted"); assert.equal(resolveFundRules(undefined, franklinSnapshot, rules).resolution.mode, "p0-compat"); assert.equal(resolveFundRules("unknown", franklinSnapshot, rules).resolution.mode, "fund-unresolved");
console.log("check-fund-master: PASS (schema, provenance, dated snapshot, resolver, VettaFi/Solactive exclusions)");
