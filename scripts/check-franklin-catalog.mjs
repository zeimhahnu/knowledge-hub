#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
const catalog = JSON.parse(fs.readFileSync("src/data/fund-master/franklin-us-etf-catalog-2026-09-05.json", "utf8"));
// Provenance: the <loc> values for the two URL families this catalog draws from,
// extracted from the fetched sitemap and committed beside the catalog. It used to
// read the 254K raw XML from agents/goop/memory/audit/ in the PARENT workspace,
// which git never tracked - so this gate only ran inside one agent's working tree.
const sourceUrls = new Set(
  fs.readFileSync("src/data/fund-master/franklin-us-etf-catalog-2026-09-05.sources.txt", "utf8")
    .split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean),
);
assert.equal(catalog.source_url, "https://www.franklintempleton.com/binaries/content/assets/global/sitemaps/google/en-us_product.xml");
assert.equal(catalog.records.length, catalog.counts.etf_rows);
assert.equal(new Set(catalog.records.map((r) => r.ticker)).size, catalog.records.length, "ETF tickers must be unique");
assert.equal(catalog.schema_version, "2.0");
assert.deepEqual(catalog.counts.by_region, { us: 81, canada: 24, europe: 33, australia: 9, other: 0 });
assert.equal(catalog.records.filter((r) => r.region === "us").length, 81);
assert.equal(catalog.records.filter((r) => r.region === "canada").length, 24);
assert.equal(catalog.records.filter((r) => r.region === "europe").length, 33);
assert.equal(catalog.records.filter((r) => r.region === "australia").length, 9);
assert.equal(catalog.records.some((r) => r.ticker === "FLEM" && r.region === "canada"), true);
assert.equal(catalog.records.some((r) => r.ticker === "FLUR" && r.region === "canada"), true);
for (const row of catalog.records) {
  assert.match(row.url, /^https:\/\//);
  assert.match(row.ticker, /^[A-Z0-9.-]+$/);
  assert(row.name.length > 0);
  assert.equal(row.source_as_of, null);
  assert.ok(["us", "canada", "europe", "australia", "other"].includes(row.region));
  if (row.region === "us") {
    assert.equal(row.retrieved_at, "2026-09-05");
    assert.match(row.url, /\/investments\/options\/exchange-traded-funds\/products\//);
  } else {
    assert.equal(row.retrieved_at, "2026-09-17");
  }
  assert(sourceUrls.has(row.url), `ETF URL missing from sitemap: ${row.url}`);
}
for (const row of catalog.excluded_closed_products) {
  assert(row.url.includes("/investments/closed/"));
  assert(!catalog.records.some((r) => r.url === row.url));
  assert(sourceUrls.has(row.url), `closed URL missing from sitemap: ${row.url}`);
}
assert.equal(catalog.counts.closed_rows, catalog.excluded_closed_products.length);

// Stronger than membership: the catalog must account for every ETF product URL the
// sitemap advertises, so a silently dropped fund fails here rather than passing.
const sitemapEtfs = [...sourceUrls].filter((u) => u.includes("/exchange-traded-funds/products/"));
assert.equal(sitemapEtfs.length, 81, "the US sitemap ETF count must remain stable");
for (const url of sitemapEtfs) {
  assert(catalog.records.some((r) => r.url === url), `sitemap ETF missing from catalog: ${url}`);
}
console.log(`franklin catalog check passed: ${catalog.records.length} ETF rows; ${catalog.excluded_closed_products.length} closed rows segregated`);
