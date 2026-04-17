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
- **PAF Formula**: `padj = pt-1 - dividend`
- **Divisor Impact**: Yes — decreases
- **PR Treatment**: Price reduced by dividend amount
- **TR/NTR Treatment**: Net of withholding tax for NTR
- **Timing**: Ex-date
- **Grace Period**: Standard 2-day implementation
- **Threshold**: NULL

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
- **PAF Formula**: `padj = pt-1 × A / (A + B)` where A=pre-event shares, B=new shares from distribution
- **Divisor Impact**: Yes — increases
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Net of tax adjustment
- **Timing**: Ex-date
- **Grace Period**: 2-day notice for extraordinary changes
- **Threshold**: 10% rule for extraordinary adjustments

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
- **PAF Formula**: `padj = pt-1 × A / (A + B)` where A=pre-event shares, B=new shares
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
- **PAF Formula**: `padj = (pt-1 × A – price of spun-off shares × B) / A`
- **Divisor Impact**: No — on ex-date (divisor changes if spun-off deleted later)
- **PR Treatment**: Parent price adjusted
- **TR/NTR Treatment**: Unchanged on ex-date
- **Timing**: Ex-date, announced immediately, implemented 2 trading days later
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
- **PAF Formula**: `padj = [pt-1 × A + SP × C] / (A + C)` where SP=subscription price, C=new shares from rights
- **Divisor Impact**: Yes — increases
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: Immediate for share changes
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
- **PAF Formula**: `padj = pt-1 × A / B`
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
- **PAF Formula**: `padj = pt-1 × A / (A + B)` similar to special dividend
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: 2-day notice
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
- **PAF Formula**: Artificial price: Cash=Cash term, Stock=Close×Stock term, Cash&Stock=Cash+Close×Stock
- **Divisor Impact**: Yes
- **PR Treatment**: Deleted at terms price
- **TR/NTR Treatment**: Adjusted
- **Timing**: Upon completion, announced immediately
- **Grace Period**: 2-day implementation
- **Threshold**: 85% acquisition or <10% free float for deletion

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
- **PAF Formula**: Target free float adjustment during tender
- **Divisor Impact**: Yes
- **PR Treatment**: Free float adjusted at 85%/10% threshold
- **TR/NTR Treatment**: Adjusted
- **Timing**: Upon results publication
- **Grace Period**: 2-day implementation
- **Threshold**: 85% acquisition or <10% free float

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
- **PAF Formula**: `padj = pt-1 × A / (A + B)` or similar
- **Divisor Impact**: Yes
- **PR Treatment**: Price adjusted
- **TR/NTR Treatment**: Adjusted
- **Timing**: Ex-date
- **Grace Period**: 2-day
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
