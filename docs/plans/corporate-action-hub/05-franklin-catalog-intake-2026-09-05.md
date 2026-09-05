# Franklin U.S. ETF catalog intake — 2026-09-05

**Task:** `[task-2026-09-05-ca-hub-franklin-catalog-extraction]`  
**Source:** <https://www.franklintempleton.com/binaries/content/assets/global/sitemaps/google/en-us_product.xml>  
**Raw response:** `agents/goop/memory/audit/task-2026-09-05-ca-hub-franklin-catalog-extraction-raw.xml.txt`

The official static sitemap returned **1,714** `<loc>` URLs. Filtering the returned URLs by `/investments/options/exchange-traded-funds/products/` yielded **81 ETF rows**. A separate **103** returned URLs matched `/investments/closed/` and are stored under `excluded_closed_products`; they are not included in the ETF records.

The dated artifact is `src/data/fund-master/franklin-us-etf-catalog-2026-09-05.json`. Each record contains only the URL-derived ticker and name slug, the exact source URL, `retrieved_at`, and `source_as_of: null`. No ISIN, index, provider, index type, weighting, cadence, inception date, or active/closed status is inferred. The artifact reports the returned sitemap rows, not a claim that the result is Franklin's complete ETF universe.

Validation is no-network: `node scripts/check-franklin-catalog.mjs` checks exact source membership, unique tickers, path scope, closed-row segregation, and explicit missingness. This intake does not modify `rules.json`, the reviewed FLJP resolver record, lookup UI, or P1a code.

## Sources

- Official Franklin sitemap: <https://www.franklintempleton.com/binaries/content/assets/global/sitemaps/google/en-us_product.xml>
- Archived raw response: `agents/goop/memory/audit/task-2026-09-05-ca-hub-franklin-catalog-extraction-raw.xml.txt`
