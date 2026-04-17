---
title: Corporate Action Event Parameter Extraction
description: Structured parameter extraction for each corporate action event type across all vendors
vendors: [MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, VettaFi]
created: 2026-04-17
---

# Corporate Action Event Parameter Extraction

## 1. Cash Dividend (Regular)

### MSCI
- **PAF Formula**: None — no price adjustment
- **Divisor Impact**: No
- **PR Treatment**: No adjustment to Price Return
- **TR/NTR Treatment**: Dividends reinvested in TR/NTR indices on ex-date
- **Timing**: Applied on ex-date
- **Grace Period**: Standard 2-day notice
- **Threshold**: NULL - not stated

### S&P DJI
- **PAF Formula**: None — no price adjustment
- **Divisor Impact**: No
- **PR Treatment**: No adjustment
- **TR/NTR Treatment**: Dividends reinvested on ex-date
- **Timing**: Ex-date
- **Grace Period**: None specified
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: None — no price adjustment
- **Divisor Impact**: No (reinvested across index on ex-date)
- **PR Treatment**: No adjustment
- **TR/NTR Treatment**: Reinvested on ex-date
- **Timing**: Ex date
- **Grace Period**: Standard notice
- **Threshold**: NULL

### STOXX
- **PAF Formula**: `padj = pt-1 - Divt` (PR: no adj; GR: `padj = pt-1 - Divt`; NTR: `padj = pt-1 - Divt × (1 – 𝜏)`)
- **Divisor Impact**: Yes — decreases
- **PR Treatment**: Price index NOT adjusted for regular cash dividends (dividend reinvested only in GR/NTR)
- **TR/NTR Treatment**: Gross Return: `padj = pt-1 - Divt`. Net Return: net of withholding tax 𝜏
- **Timing**: Ex-date — 2 trading days' notice required, implemented next trading day after announcement
- **Grace Period**: 2 trading days' notice; effective next trading day after implementation
- **Threshold**: No materiality threshold — all regular cash dividends applied immediately
- **Source**: STOXX Calculation Guide §8.1.1 (Apr 2026)

### Solactive
- **PAF Formula**: NULL — reference to Equity Index Methodology
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL - GPR 100 guide does not detail cash dividend treatment

### Morningstar
- **PAF Formula**: None — no price adjustment for ordinary dividends
- **Divisor Impact**: No
- **PR Treatment**: No adjustment
- **TR/NTR Treatment**: Dividends reinvested (withholding tax deducted for NTR)
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL - not detailed in maintenance policy

---

## 2. Special Cash Dividend

### MSCI
- **PAF Formula**: Price adjusted by dividend amount
- **Divisor Impact**: Yes — divisor adjustment to maintain market value
- **PR Treatment**: Price reduced by dividend amount
- **TR/NTR Treatment**: Not reinvested in TR (special dividends excluded from return calculation)
- **Timing**: Ex-date
- **Grace Period**: 2-day advance notice
- **Threshold**: Third consecutive non-ordinary dividend becomes ordinary

### S&P DJI
- **PAF Formula**: `padj = pt-1 - special_dividend_amount`
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted by amount
- **TR/NTR Treatment**: Not included in TR/NTR calculation
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: Company describes as "special," "extra," "irregular," "return of capital," or "distribution from reserves"

### FTSE Russell
- **PAF Formula**: Price adjusted: `Ex-price = Cum-price - Special dividend`
- **Divisor Impact**: Yes
- **PR Treatment**: Price reduced
- **TR/NTR Treatment**: Not reinvested (excluded from total return)
- **Timing**: Ex date
- **Grace Period**: Standard
- **Threshold**: If recurring on >3 consecutive occasions, 4th becomes ordinary

### STOXX
- **PAF Formula**: `padj = pt-1 - Divt` (Gross Return); `padj = pt-1 - Divt × (1 – 𝜏)` (Price and Net Return indices) — STOXX UNIQUE: Price index IS adjusted for special cash dividends
- **Divisor Impact**: Yes — decreases
- **PR Treatment**: Price indices adjusted for special cash dividends — unique to STOXX among all vendors
- **TR/NTR Treatment**: Gross Return: `padj = pt-1 - Divt`. Net Return: `padj = pt-1 - Divt × (1 – 𝜏)`
- **Timing**: Ex-date — 2 trading days' notice required, implemented next trading day after announcement
- **Grace Period**: 2 trading days' notice; effective next trading day after implementation
- **Threshold**: No formal percentage threshold — company-defined extraordinary distributions trigger immediate treatment
- **Key Difference**: STOXX is the ONLY vendor that adjusts the Price Return index for special dividends. MSCI, S&P, FTSE, Morningstar only adjust PR if threshold is met. This is a fundamental divergence.
- **Source**: STOXX Calculation Guide §8.1.2 (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL - GPR 100 guide not detailed

### Morningstar
- **PAF Formula**: Price adjustment applied
- **Divisor Impact**: Yes
- **PR Treatment**: Price reduced
- **TR/NTR Treatment**: Excluded from total return
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 3. Stock Dividend / Bonus Issue

### MSCI
- **PAF Formula**: Treated as split: `padj = pt-1 × A / (A + B)`
- **Divisor Impact**: No — market cap unchanged
- **PR Treatment**: Price adjusted per ratio
- **TR/NTR Treatment**: No adjustment to return calculation
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### S&P DJI
- **PAF Formula**: Same as stock split: `padj = pt-1 / split_ratio`
- **Divisor Impact**: No
- **PR Treatment**: Price adjusted, shares adjusted, market cap unchanged
- **TR/NTR Treatment**: No divisor change
- **Timing**: Ex-date
- **Grace Period**: None
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Number of shares held before issue ÷ Number of shares held after issue
- **Divisor Impact**: No
- **PR Treatment**: Price adjusted per ratio
- **TR/NTR Treatment**: No adjustment
- **Timing**: Ex date
- **Grace Period**: Standard
- **Threshold**: NULL

### STOXX
- **PAF Formula**: Ordinary: `padj = pt-1 × A / (A + B)`. Treasury Stock: `padj = pt-1 - pt-1 × B / (A + B)`. Another Company: `padj = [(pt-1 × A) – [(1 – 𝜏) × price of other company × B]] / A`. All with `sadj = st-1 × (A + B) / A` for free-float market cap indices.
- **Divisor Impact**: Yes — increases for ordinary; decreases for treasury stock / redeemable shares treated as cash dividend
- **PR Treatment**: Price index adjusted: `padj = pt-1 × A / (A + B)` for ordinary stock dividend
- **TR/NTR Treatment**: Net Return: same PAF with withholding tax adjustment where applicable
- **Timing**: Ex-date — 2 trading days' notice; extraordinary changes (≥±10% share change) announced immediately, implemented 2 trading days later
- **Grace Period**: 2 trading days for standard; 2 trading days' notice for extraordinary
- **Threshold**: ±10% share change from one trading day to next = extraordinary (announced immediately)
- **Source**: STOXX Calculation Guide §8.1.5 (Ordinary), §8.1.5.2 (Treasury Stock), §8.1.5.3 (Redeemable Shares), §8.1.5.4 (Another Company) (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: `PAF = Pre-Event Total Shares / Post-Event Total Shares`
- **Divisor Impact**: No
- **PR Treatment**: Price adjusted by PAF
- **TR/NTR Treatment**: Market value unchanged
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 4. Spin-off / Demerger

### MSCI
- **PAF Formula**: `padj = (pt-1 × A – price of spun-off shares × B) / A`
- **Divisor Impact**: No — on ex-date
- **PR Treatment**: Price adjusted for spun-off value
- **TR/NTR Treatment**: Spin-off added at zero price
- **Timing**: Ex-date
- **Grace Period**: 2-day advance notice
- **Threshold**: 5%, 10%, 25% for Standard/Small/Micro caps

### S&P DJI
- **PAF Formula**: Spin-off added at zero price on ex-date
- **Divisor Impact**: No — on ex-date
- **PR Treatment**: Price adjustment applied
- **TR/NTR Treatment**: No divisor change on ex-date
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Applied per spin-off terms
- **Divisor Impact**: Yes — if deleted later
- **PR Treatment**: Spin-off added at price of zero or estimated price
- **TR/NTR Treatment**: No divisor adjustment on addition
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### STOXX
- **PAF Formula**: `padj = (pt-1 × A – price of spun-off shares × B) / A` on ex-date. Spin-off added at estimated price, not zero. No placeholder approach.
- **Divisor Impact**: No change on ex-date (spun-off company added at estimated price with new shares = `st-1 × B/A`)
- **PR Treatment**: Parent price: `padj = (pt-1 × A – spun-off price × B) / A`. Spin-off added to parent index at estimated price.
- **TR/NTR Treatment**: Divisor unchanged on ex-date. Spin-off qualifies for TMI indices if on latest quarterly review list.
- **Timing**: Ex-date — spin-off qualifies if within upper (higher) buffer on latest selection list for benchmark/blue-chip indices. Announced immediately, implemented 2 trading days later.
- **Grace Period**: No grace period — STOXX adds at market price on first trading day. No placeholder used. Spin-off stock is deleted at close if it does not qualify (no traded price available).
- **Threshold**: Qualifies for STOXX Benchmark/Blue-Chip indices if within upper buffer on latest selection list. Replaces lowest ranked stock. For TMI: added if qualifies as of latest quarterly review.
- **Source**: STOXX Calculation Guide §8.1.8, §8.4 (Apr 2026)
- **Grace Period**: 2-day notice
- **Threshold**: Spin-off added if qualifying for TMI indices

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: Price adjusted to reflect spun-off value
- **Divisor Impact**: Yes
- **PR Treatment**: Parent price reduced by spun-off value
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 5. Rights Issue

### MSCI
- **PAF Formula**: Price adjustment for rights value
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted by rights value
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: 2-day notice
- **Threshold**: In-the-money threshold applies

### S&P DJI
- **PAF Formula**: Applied if in-the-money: rights value calculated
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted by value of rights
- **TR/NTR Treatment**: Shares increased by rights ratio
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: In-the-money (value of rights > 0)

### FTSE Russell
- **PAF Formula**: Corporate action treatment applied
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjustment
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex date
- **Grace Period**: 2-day minimum notice
- **Threshold**: NULL

### STOXX
- **PAF Formula**: Standard Rights: `padj = (pt-1 × A + SP × B) / (A + B)`, `sadj = st-1 × (A + B) / A`. HDRI (B/A ≥ 200%): fully underwritten = treated as standard; not fully underwritten + tradable = included at theoretical price then removed at close; not fully underwritten + not tradable = removed at 0.0000001.
- **Divisor Impact**: Yes — increases for standard rights. For HDRI: unchanged on ex-date, decreases after rights deletion (if tradable), increases on day of share increase if ffmcap index.
- **PR Treatment**: Price adjusted for in-the-money rights. If OTM (SP ≥ closing price) = no adjustment.
- **TR/NTR Treatment**: Adjusted with withholding tax where applicable
- **Timing**: Ex-date — if subscription price available and in-the-money. If price range: both lower and upper range must be in-the-money, use average. OTM = no adjustment.
- **Grace Period**: 2 trading days' notice for extraordinary share changes (≥±10% from one trading day to next)
- **Threshold**: HDRI trigger: share ratio B/A ≥ 200% (Highly Dilutive). OTM trigger: SP ≥ closing price on day before ex-date.
- **Source**: STOXX Calculation Guide §8.1.4, §8.1.4.1, §8.1.4.2 (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: `TERP = (Close Price × Pre Shares + Subscription Value × Additional Shares) / Post Shares`
- **PAF**: `TERP / Close Price`
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted to TERP
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-rights date
- **Grace Period**: Standard
- **Threshold**: In-the-money only (positive value of rights)

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 6. Share Consolidation / Reverse Split

### MSCI
- **PAF Formula**: Same as split: `padj = pt-1 × A / B` where B < A (consolidation)
- **Divisor Impact**: No — market cap unchanged
- **PR Treatment**: Price adjusted per ratio
- **TR/NTR Treatment**: No change
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### S&P DJI
- **PAF Formula**: `padj = pt-1 / adjustment_factor`
- **Divisor Impact**: No
- **PR Treatment**: Price adjusted, shares adjusted
- **TR/NTR Treatment**: No change
- **Timing**: Ex-date
- **Grace Period**: None
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Shares held before ÷ Shares held after
- **Divisor Impact**: No
- **PR Treatment**: Price adjustment per terms
- **TR/NTR Treatment**: No adjustment
- **Timing**: Ex date
- **Grace Period**: Standard
- **Threshold**: NULL

### STOXX
- **PAF Formula**: `padj = pt-1 × A / B`. Free float market cap weighted: `sadj = st-1 × B / A`. Price weighted with weighting factors: `wfadj = wft-1 × B / A`.
- **Divisor Impact**: No change — divisor absorbs the market cap change from adjusted price × new shares
- **PR Treatment**: Price index adjusted: `padj = pt-1 × A / B` (split) or `padj = pt-1 × A / B` with `sadj = st-1 × B / A` (reverse split/consolidation)
- **TR/NTR Treatment**: Same as price index — no separate treatment for split/consolidation
- **Timing**: Ex-date — 2 trading days' notice for extraordinary share changes
- **Grace Period**: 2 trading days' notice for extraordinary changes (≥±10% share change from one trading day to next)
- **Threshold**: ±10% share change from one trading day to next = extraordinary announcement
- **Source**: STOXX Calculation Guide §8.1.3 (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: `PAF = Pre-Event Shares / Post-Event Shares`
- **Divisor Impact**: No
- **PR Treatment**: Price increased by PAF
- **TR/NTR Treatment**: Market value unchanged
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 7. Return of Capital

### MSCI
- **PAF Formula**: Treated as special dividend
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Not reinvested
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### S&P DJI
- **PAF Formula**: Treated as special dividend: `padj = pt-1 - return_of_capital`
- **Divisor Impact**: Yes
- **PR Treatment**: Price reduced
- **TR/NTR Treatment**: Not reinvested
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: If in lieu of ordinary and fits pattern, treated as ordinary

### FTSE Russell
- **PAF Formula**: Price adjusted: `Ex-price = Cum-price - Capital repayment`
- **Divisor Impact**: Yes
- **PR Treatment**: Price reduced
- **TR/NTR Treatment**: Yes — total return adjusted
- **Timing**: Ex date
- **Grace Period**: Standard
- **Threshold**: 10% rule for tax adjustments if >10% of share price

### STOXX
- **PAF Formula**: Treated as combination of cash/special dividend with reverse split. Regular cash dividend: `padj = pt-1 - Divt` (GR), `padj = pt-1 - Divt × (1 – 𝜏)` (NTR/PR for special). Special dividend: `padj = [pt-1 - capital return × (1 – 𝜏)] × A / B`. `sadj = st-1 × B / A` for free float market cap indices.
- **Divisor Impact**: Yes — decreases (treated as dividend component + reverse split share adjustment)
- **PR Treatment**: Treated as special cash dividend: Price index adjusted (`padj = [pt-1 - capital return × (1 – 𝜏)] × A / B`). Regular cash dividend: no PR adjustment.
- **TR/NTR Treatment**: Gross Return: `padj = pt-1 - Divt`. Net Return: `padj = pt-1 - Divt × (1 – 𝜏)`. Withholding tax applied where 𝜏 > 0.
- **Timing**: Ex-date — 2 trading days' notice required, implemented next trading day after announcement
- **Grace Period**: 2 trading days' notice for implementation
- **Threshold**: Company-defined as extraordinary distribution = immediate treatment
- **Source**: STOXX Calculation Guide §8.1.6 (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: Price adjustment
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Not reinvested
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 8. Merger & Acquisition (Target Deletion)

### MSCI
- **PAF Formula**: Market price adjustment or artificial price based on terms
- **Divisor Impact**: Yes
- **PR Treatment**: Deleted at last traded price or M&A terms
- **TR/NTR Treatment**: Final return calculation
- **Timing**: Upon completion / tender results
- **Grace Period**: 2-day advance notice
- **Threshold**: 5%, 10%, 25% for Standard/Small/Micro caps share changes

### S&P DJI
- **PAF Formula**: Deleted at M&A terms price
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted per terms
- **TR/NTR Treatment**: Divisor adjustment
- **Timing**: Completion date
- **Grace Period**: Standard
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Deleted at last traded price or synthetic price
- **Divisor Impact**: Yes
- **PR Treatment**: Removed at M&A terms
- **TR/NTR Treatment**: Adjusted
- **Timing**: Completion date
- **Grace Period**: 2-day minimum notice for actionable events
- **Threshold**: NULL

### STOXX
- **PAF Formula**: Deletion at last traded price; if not trading: artificial price = Cash term | Close price acquirer × Stock term | Cash + Close price acquirer × Stock term | Cash term (for Cash or Stock default option). For free float market cap indices: `sadj = st-1 × B / A`. `wfadj = wft-1 × pt-1 / padj` for price weighted indices.
- **Divisor Impact**: Yes — adjusts to maintain index continuity when target deleted and surviving stock replaces largest original
- **PR Treatment**: Target: deleted at last traded or artificial price. Acquirer: divisor absorbs market cap change. Surviving stock replaces largest original stock in Benchmark indices.
- **TR/NTR Treatment**: Same as price index — no separate TR/NTR treatment for M&A
- **Timing**: When ALL conditions fulfilled (shareholder approval, regulatory approval, minimum acceptances, other conditions). Changes announced immediately, implemented 2 trading days later, effective next trading day after implementation.
- **Grace Period**: 2 trading days' notice. If deletion effective within 2 trading days after review effective date → implemented at review effective date (if 2 days' notice can be given).
- **Threshold**: Deletion trigger (M&A): ≥85% of shares acquired through tender offer AND remaining free float <10%. If only one condition met: deferred to next quarterly review. Free float adjustment: change ≥5 percentage points in free float factor triggers extraordinary adjustment.
- **Key Difference**: STOXX requires BOTH ≥85% acquired AND Float <10%. S&P uses Float <15% OR ≥90% acceptance. FTSE uses ≥90% held OR Float <5%. Solactive uses Float <15% + unconditional deal. Scoped to STOXX Europe 600 (SXXR) and STOXX Europe 600 PAB (SXXPPAB).
- **Source**: STOXX Calculation Guide §8.3.1, §8.3.2 (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: Price adjustment based on M&A terms
- **Divisor Impact**: Yes
- **PR Treatment**: Deleted at completion
- **TR/NTR Treatment**: Adjusted
- **Timing**: Effective date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: Multiple merger approaches (1.0, 2.0, 3.0) by index family
- **Divisor Impact**: Yes
- **PR Treatment**: Varies by approach
- **TR/NTR Treatment**: Adjusted
- **Timing**: Varies
- **Grace Period**: Standard
- **Threshold**: NULL - approach varies by index

---

## 9. Tender Offer

### MSCI
- **PAF Formula**: `PAF = 1` for fixed price; Dutch auction = no PAF on ex-date
- **Divisor Impact**: Conditional
- **PR Treatment**: Fixed price: no adjustment; Dutch: unknown price
- **TR/NTR Treatment**: Adjusted upon results
- **Timing**: Ex-date or end of offer
- **Grace Period**: 2-day advance notice
- **Threshold**: 5%, 10%, 25% for Standard/Small/Micro caps

### S&P DJI
- **PAF Formula**: Treated as M&A event
- **Divisor Impact**: Yes
- **PR Treatment**: Deleted upon completion
- **TR/NTR Treatment**: Adjusted
- **Timing**: Completion
- **Grace Period**: Standard
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Corporate action with price adjustment
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjustment
- **TR/NTR Treatment**: Adjusted
- **Timing**: Completion or ex-date
- **Grace Period**: 2-day minimum for actionable events
- **Threshold**: NULL

### STOXX
- **PAF Formula**: Free float adjustment of target during tender offer: if conditions met (≥85% acquired AND Float <10%) → target deleted. If only one condition met → no immediate deletion. Extraordinary free float adjustment if change ≥5 percentage points.
- **Divisor Impact**: Yes — when target deleted, surviving stock replaces largest original stock. Divisor adjusted to absorb market cap change.
- **PR Treatment**: Target deleted at last traded or artificial price. Acquirer shares adjusted per exchange terms.
- **TR/NTR Treatment**: Same as PR — no separate TR/NTR treatment
- **Timing**: Upon publication of results of each tender offer period (or extension result). Changes announced immediately, implemented 2 trading days later, effective next trading day after implementation.
- **Grace Period**: 2 trading days' notice. Extraordinary free float adjustment: if effective during review implementation week → aligned with review effective date (provided 2 trading days' notice can be given).
- **Threshold**: Deletion: ≥85% acquired through tender AND remaining Float <10%. Free float adjustment trigger: change ≥5 percentage points.
- **Source**: STOXX Calculation Guide §8.3.1, §8.3.1.1 (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: Treated as corporate action
- **Divisor Impact**: Yes
- **PR Treatment**: Adjusted
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 10. Delisting / Bankruptcy

### MSCI
- **PAF Formula**: Deleted at last traded price; 0.0000001 if no price
- **Divisor Impact**: Yes
- **PR Treatment**: Removed from index
- **TR/NTR Treatment**: Final return applied
- **Timing**: Immediate announcement, 2-day implementation
- **Grace Period**: 2-day notice
- **Threshold**: NULL

### S&P DJI
- **PAF Formula**: Deleted at market price or terms
- **Divisor Impact**: Yes
- **PR Treatment**: Removed
- **TR/NTR Treatment**: Final calculation
- **Timing**: Upon delisting/bankruptcy
- **Grace Period**: Standard
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Removed at last traded price or M&A terms
- **Divisor Impact**: Yes
- **PR Treatment**: Removed
- **TR/NTR Treatment**: Adjusted
- **Timing**: Effective date
- **Grace Period**: 2-day minimum for actionable
- **Threshold**: NULL

### STOXX
- **PAF Formula**: Deleted at traded price, OTC price, or 0.0000001
- **Divisor Impact**: Yes
- **PR Treatment**: Removed
- **TR/NTR Treatment**: Adjusted
- **Timing**: Immediate announcement
- **Grace Period**: 2-day implementation
- **Threshold**: 10 consecutive suspension days or bankruptcy filing

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: Deleted at market price
- **Divisor Impact**: Yes
- **PR Treatment**: Removed
- **TR/NTR Treatment**: Final return
- **Timing**: Upon event
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 11. Stock Split

### MSCI
- **PAF Formula**: Treated as split: `padj = pt-1 × A / (A + B)`
- **Divisor Impact**: No — market cap unchanged
- **PR Treatment**: Price and shares adjusted
- **TR/NTR Treatment**: No change
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### S&P DJI
- **PAF Formula**: `padj = pt-1 / split_ratio`
- **Divisor Impact**: No
- **PR Treatment**: Price adjusted, shares adjusted
- **TR/NTR Treatment**: No change
- **Timing**: Ex-date
- **Grace Period**: None
- **Threshold**: NULL

### FTSE Russell
- **PAF Formula**: Number of shares held before ÷ Number of shares held after
- **Divisor Impact**: No
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: No adjustment
- **Timing**: Ex date
- **Grace Period**: Standard
- **Threshold**: NULL

### STOXX
- **PAF Formula**: `padj = pt-1 × A / (A + B)`
- **Divisor Impact**: Yes — increases
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: Immediate implementation
- **Threshold**: NULL

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: `PAF = Pre-Event Total Shares / Post-Event Total Shares`
- **Divisor Impact**: No
- **PR Treatment**: Price reduced by PAF
- **TR/NTR Treatment**: Market value unchanged
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## 12. Return of Cash (Non-Dividend)

### MSCI
- **PAF Formula**: Treated as special dividend
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Not reinvested
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### S&P DJI
- **PAF Formula**: Treated as special dividend
- **Divisor Impact**: Yes
- **PR Treatment**: Price reduced
- **TR/NTR Treatment**: Not included in TR
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: If recurring, may become ordinary

### FTSE Russell
- **PAF Formula**: Capital repayment treatment: price adjustment
- **Divisor Impact**: Yes
- **PR Treatment**: Price reduced
- **TR/NTR Treatment**: Yes
- **Timing**: Ex date
- **Grace Period**: Standard
- **Threshold**: NULL

### STOXX
- **PAF Formula**: Treated as special cash dividend: Regular cash dividend component: `padj = pt-1 - Divt` (GR only) or `padj = pt-1 - Divt × (1 – 𝜏)` (NTR/PR). Special dividend component: `padj = pt-1 - Divt × (1 – 𝜏)` for Price, GR, NTR. With reverse split component: `padj = [pt-1 - capital return × (1 – 𝜏)] × A / B`.
- **Divisor Impact**: Yes — decreases from dividend component; reverse split adjusts shares (`sadj = st-1 × B / A`)
- **PR Treatment**: Price index adjusted when treated as special dividend: `padj = [pt-1 - capital return × (1 – 𝜏)] × A / B`. Regular cash dividend: no PR adjustment.
- **TR/NTR Treatment**: Gross Return: `padj = pt-1 - Divt`. Net Return: `padj = pt-1 - Divt × (1 – 𝜏)`. Withholding tax 𝜏 applied where applicable.
- **Timing**: Ex-date — 2 trading days' notice required
- **Grace Period**: 2 trading days' notice for implementation
- **Threshold**: Company-defined as extraordinary = immediate treatment. No formal percentage threshold.
- **Source**: STOXX Calculation Guide §8.1.6 (Return of Capital and Share Consolidation) (Apr 2026)

### Solactive
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

### Morningstar
- **PAF Formula**: Price adjustment
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: Standard
- **Threshold**: NULL

### VettaFi
- **PAF Formula**: NULL
- **Divisor Impact**: NULL
- **PR Treatment**: NULL
- **TR/NTR Treatment**: NULL
- **Timing**: NULL
- **Grace Period**: NULL
- **Threshold**: NULL

---

## Summary: NULL Parameters by Vendor

| Vendor | Cash Dividend | Special Div | Stock Div | Spin-off | Rights | Consol | Return Cap | M&A | Tender | Delist | Split | Return Cash |
|--------|-------------|------------|----------|----------|--------|--------|-----------|-----|--------|--------|-------|------------|
| MSCI | — | — | — | — | — | — | — | — | — | — | — | — |
| S&P DJI | — | — | — | — | — | — | — | — | — | — | — | — |
| FTSE Russell | — | — | — | — | — | — | — | — | — | — | — | — |
| STOXX | — | — | — | — | — | — | — | — | — | — | — | — |
| Solactive | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |
| Morningstar | — | — | — | — | — | — | — | — | — | — | — | — |
| VettaFi | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL | NULL |

**Legend**: — = Documented parameter | NULL = Not detailed in available source documents

---

*Source: Extracted from vendor methodology PDFs, April 2026*
*Note: Parameters marked NULL indicate the source document does not explicitly state the parameter. Confirm with vendor directly.*
