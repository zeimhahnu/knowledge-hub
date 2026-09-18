#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const snapshot = JSON.parse(await readFile("src/data/fund-master/franklin-etf-snapshot-2026-09-04.json", "utf8"));
// Provenance is asserted against the snapshot's own acquisition block, which is
// committed here. It previously read a task artifact in the parent workspace
// (agents/goop/memory/audit/...-raw.json) that was never tracked in git, so this
// gate passed only inside one agent's working tree and failed everywhere else.
const raw = { sources: snapshot.acquisition.successful_sources.map((url) => ({ url })) };
assert.equal(snapshot.schema_version, "1.0"); assert.match(snapshot.snapshot_id, /^franklin-etf-\d{4}-\d{2}-\d{2}$/); assert.equal(snapshot.records.length, 142); assert.equal(snapshot.acquisition.record_count, 142);
const urls = new Set(raw.sources.map((s) => s.url)); const tickers = new Set();
for (const fund of snapshot.records) { assert.match(fund.ticker, /^[A-Z0-9.\-^=]+$/); assert(!tickers.has(fund.ticker)); tickers.add(fund.ticker); for (const url of fund.source_urls) { assert.match(url, /^https:\/\//); assert(urls.has(url), `source missing from raw audit: ${url}`); } for (const field of ["ticker","name","isin","underlying_index","index_provider","index_type","universe","weighting","reconstitution_frequency","inception_date"]) { if (fund[field] === null) assert(fund.missing_fields.includes(field)); } assert.notEqual(fund.ticker, "VETTAFI"); }
assert.equal(snapshot.records.some((r) => r.index_provider === "Solactive AG"), true); assert.equal(snapshot.records.some((r) => r.ticker === "FLJP"), true); assert.deepEqual(new Set(["SOEZ","WABF","FTMU","USFI","FLMB","FLHY","FTMA","CNV","FGOV","FHIS","FLCI","FLCP","FLGA","FLSD","IE00BHZRR253"]), new Set(snapshot.records.slice(-15).map((r) => r.ticker))); assert.equal(snapshot.records.filter((r) => r.index_type === "fixed-income").length, 32); assert.equal(snapshot.records.find((r) => r.ticker === "EZPZ").index_type, "thematic-custom");
assert.equal(new Set(snapshot.records.map((r) => r.index_type)).size, 6, "reviewed table must exercise six index types");
const { franklinSnapshot, resolveFundRules } = await import("../src/lib/fund-master.ts");
const rules = [{ vendor: "ftse", event_type: "cash-dividend", index_type: "market-cap-weighted" }];
const resolved = resolveFundRules("fljp", franklinSnapshot, rules); assert.equal(resolved.resolution.mode, "fund-resolved"); assert.equal(resolved.resolution.indexType, "market-cap-weighted"); assert.equal(resolveFundRules(undefined, franklinSnapshot, rules).resolution.mode, "p0-compat"); assert.equal(resolveFundRules("unknown", franklinSnapshot, rules).resolution.mode, "fund-unresolved"); for (const ticker of ["INCE", "YLDE", "PGRO"]) { const active = franklinSnapshot.records.find((r) => r.ticker === ticker); assert.equal(active.index_type, "active"); assert.equal(active.underlying_index, null); assert.equal(active.index_provider, null); assert(active.missing_fields.includes("underlying_index")); assert(active.missing_fields.includes("index_provider")); assert.equal(resolveFundRules(ticker, franklinSnapshot, rules).resolution.mode, "fund-unresolved"); }
console.log("check-fund-master: PASS (schema, provenance, dated snapshot, resolver, VettaFi exclusion, Solactive coverage)");
