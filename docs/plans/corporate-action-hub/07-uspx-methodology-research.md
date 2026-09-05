# USPX methodology research — 2026-09-05

**Task:** `[task-2026-09-05-ca-hub-uspx-methodology-research]`  
**Candidate:** Franklin U.S. Equity Index ETF (USPX)  
**Raw evidence:** `agents/goop/memory/audit/task-2026-09-05-ca-hub-uspx-methodology-research-raw.json`  
**Status:** not eligible for detailed 3-D resolver promotion yet

## Official-source recap

Franklin's official 529 program description (<https://www.franklintempleton.com/forms-literature/download/529-HNDBK>) states USPX tracks the Morningstar US Target Market Exposure Index (float-adjusted market-cap-weighted; U.S. large/mid-cap top 85%). The official fund page is <https://www.franklintempleton.com/investments/options/exchange-traded-funds/products/21414/SINGLCLASS/franklin-u-s-equity-index-etf/USPX>.

## Attempted sources and outcome

1. Raw research run produced a summary plus five returned URLs: Morningstar risk, Morningstar quote, AAII profile, a dividend-history page, and the official Franklin fund page. It did **not** return the exact official Morningstar methodology/guideline document for the US Target Market Exposure index, its version/effective date, or its corporate-action treatment/non-treatment.
2. The raw archive is present but the prior session died before committing; the research notes were recovered from the working tree and treated as unclaimed.

## Decision: not eligible

- The exact Morningstar methodology (with version/effective date and corporate-action treatment or explicit absence) was **not** fetched from an official Morningstar URL.
- Dated official Franklin facts for source-as-of, inception date, ISIN, and reconstitution frequency were **not** returned in this run.
- Per the anti-hallucination rule, USPX is therefore **not eligible** for a detailed 3-D resolver record now. General Morningstar policy would not substitute for the exact index methodology.

## Follow-up

- Fetch the official Morningstar index-methodology document for the US Target Market Exposure Index and dated Franklin fact-sheet/prospectus fields before any next eligibility check.
- No snapshot/rule/UI/infrastructure changes were made.