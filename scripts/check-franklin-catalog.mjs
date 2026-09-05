#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync("src/data/fund-master/franklin-us-etf-catalog-2026-09-05.json", "utf8"));
const raw = fs.readFileSync("../memory/audit/task-2026-09-05-ca-hub-franklin-catalog-extraction-raw.xml.txt", "utf8");
assert.equal(catalog.source_url, "https://www.franklintempleton.com/binaries/content/assets/global/sitemaps/google/en-us_product.xml");
assert.equal(catalog.records.length, catalog.counts.etf_rows);
assert.equal(new Set(catalog.records.map((r) => r.ticker)).size, catalog.records.length, "ETF tickers must be unique");
for (const row of catalog.records) {
  assert.match(row.url, /\/investments\/options\/exchange-traded-funds\/products\//);
  assert.match(row.ticker, /^[A-Z0-9.-]+$/);
  assert(row.name.length > 0);
  assert.equal(row.source_as_of, null);
  assert.equal(row.retrieved_at, "2026-09-05");
  assert(raw.includes(`<loc>${row.url}</loc>`), `ETF URL missing from raw: ${row.url}`);
}
for (const row of catalog.excluded_closed_products) {
  assert(row.url.includes("/investments/closed/"));
  assert(!catalog.records.some((r) => r.url === row.url));
  assert(raw.includes(`<loc>${row.url}</loc>`), `closed URL missing from raw: ${row.url}`);
}
assert.equal(catalog.counts.closed_rows, catalog.excluded_closed_products.length);
console.log(`franklin catalog check passed: ${catalog.records.length} ETF rows; ${catalog.excluded_closed_products.length} closed rows segregated`);
