# P1b provider/index-type enrichment research — 2026-09-05

**Task:** `[task-2026-09-05-ca-hub-p1b-provider-enrichment-research]`  
**Raw evidence:** `agents/goop/memory/audit/task-2026-09-05-ca-hub-p1b-provider-enrichment-research-raw.json`

The active-catalog test is membership in the committed official Franklin sitemap snapshot (`src/data/fund-master/franklin-us-etf-catalog-2026-09-05.json`). No status, provider, weighting, index type, cadence, or product metadata is inferred from secondary listings.

## Candidates (maximum three)

### 1. USPX — recommended next candidate, pending exact methodology capture

- **Active catalog evidence:** Official sitemap-derived catalog row and fund URL: <https://www.franklintempleton.com/investments/options/exchange-traded-funds/products/21414/SINGLCLASS/franklin-u-s-equity-index-etf/USPX>.
- **Official fund evidence:** Franklin's official program description <https://www.franklintempleton.com/forms-literature/download/529-HNDBK> states that USPX tracks the Morningstar US Target Market Exposure Index, maintained/calculated by Morningstar; it describes the index as free-float-adjusted market-capitalization weighted, covering large/mid-cap U.S. stocks in the top 85% of the investable universe.
- **Provider evidence:** Morningstar's official index page <https://indexes.morningstar.com/equity> confirms the Target Market Exposure family and rules-based equity-index provider context.
- **Known fields:** ticker `USPX`; fund name from catalog URL; underlying index `Morningstar US Target Market Exposure Index`; provider `Morningstar`; index type `float-adjusted-cap-weighted`; universe `U.S. large/mid-cap, top 85%`; weighting `free-float-adjusted market capitalization`.
- **Missing fields:** exact product-methodology URL, source-as-of/effective date for the fund facts, inception date, ISIN, reconstitution frequency, and a source-backed corporate-action rule for this exact index.
- **Decision:** best next research target, but not yet eligible for a committed detailed resolver record until the exact Morningstar methodology and product dates are captured.

### 2. FLQL — exclude from immediate resolver enrichment

- **Active catalog evidence:** Official sitemap-derived catalog row and fund URL: <https://www.franklintempleton.com/investments/options/exchange-traded-funds/products/25773/SINGLCLASS/franklin-u-s-large-cap-multifactor-index-etf/FLQL>.
- **Official fund evidence:** Franklin's official program description <https://www.franklintempleton.com/forms-literature/download/529-HNDBK> states that FLQL's underlying index is a systematic, rules-based proprietary index maintained/calculated by FTSE Russell, based on Russell 1000 with a multi-factor selection process.
- **Provider evidence:** FTSE Russell Russell 1000 factsheet <https://research.ftserussell.com/Analytics/FactSheets/Home/DownloadSingleIssue?openfile=open&issueName=US1000USD&isManual=True> supports the parent index only.
- **Known fields:** ticker `FLQL`; fund name from catalog URL; provider `FTSE Russell`; parent universe `Russell 1000`; multi-factor, rules-based construction.
- **Missing fields:** exact proprietary underlying-index name, exact weighting/index-type taxonomy mapping, reconstitution frequency for the proprietary index, inception date, ISIN, and a product-specific corporate-action methodology.
- **Decision:** exclude from immediate detailed resolver enrichment; do not translate “multi-factor” into the project's `capped-factor` or `fundamental-weighted` type without the exact product methodology.

### 3. S&P DJI / STOXX / Solactive U.S.-catalog candidates — exclude for this round

Targeted official Franklin searches did not return a current U.S.-catalog fund plus exact official S&P DJI, STOXX, or product-specific Solactive index-methodology pair. The returned Solactive and STOXX examples were European UCITS or general disclosures, outside this U.S. catalog slice; the returned S&P result was a general third-party disclosure rather than a U.S.-catalog product record. No candidate is promoted by backfilling from those results.

## Recommendation

Pursue USPX next by obtaining the exact Morningstar US Target Market Exposure methodology and dated fund facts. Keep FLQL as a later candidate pending its proprietary index document. Do not alter `rules.json`, the FLJP reviewed snapshot/resolver, UI, or any infrastructure from this research-only result.

## Sources

All URLs and evidence notes above are archived before synthesis in `agents/goop/memory/audit/task-2026-09-05-ca-hub-p1b-provider-enrichment-research-raw.json`.
