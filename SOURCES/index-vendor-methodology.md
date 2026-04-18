# Index Vendor Methodology — Canonical Source of Truth

> **Purpose:** This document is the single source of truth for all vendor corporate action methodology used in this knowledge hub. It is cross-referenced against all 8 source PDFs. Cursor should reference this document when implementing any feature, building any component, or answering any question about index vendor behavior.
>
> **Last Updated:** 2026-04-18
>
> **Source PDFs:**
> - `msci-corporate-events-methodology-2026.pdf` → MSCI
> - `sp-equity-indices-policies-practices.pdf` → S&P DJI
> - `ftse-russell-corporate-actions-guide.pdf` → FTSE Russell
> - `stoxx-calculation-guide-apr-2026.pdf` → STOXX
> - `solactive-gpr-global-100-2026.pdf` → Solactive
> - `morningstar-corporate-action-methodology-2026.pdf` → Morningstar
> - `vettafi-corporate-action-initiators.pdf` → VettaFi
> - `vettafi-index-maintenance-policy.pdf` → VettaFi

---

## Vendor Coverage Overview

| Vendor | Index Families | Review Frequency | Coverage Window |
|--------|---------------|-------------------|-----------------|
| MSCI | MSCI World, MSCI EM, MSCI Frontier | Quarterly (Mar, Jun, Sep, Dec) | T-5 |
| S&P DJI | S&P 500, S&P 400, S&P 600 | Quarterly (Mar, Jun, Sep, Dec) | T-5 |
| FTSE Russell | FTSE 100, FTSE 350, FTSE All-Share | Quarterly (Mar, Jun, Sep, Dec) | T-5 |
| STOXX | STOXX Europe 600 (SXXR), STOXX 600 PAB | Quarterly (Mar, Jun, Sep, Dec) | T-5 |
| Solactive | GPR Global 100 | **SEMI-ANNUAL** (Jan/Jun) | T-5 |
| Morningstar | Morningstar Global Index | Daily updates | T-5 |
| VettaFi | ETF benchmarks | Varies by index | T-5 |

**T-5 Coverage Period:** Data received on day T reflects the state at close of day T-1, covering all events up to T+4 (5 business days). Open constituent projections are available at T-5 for all vendors.

---

## Event Type Taxonomy (ISO 20022 CAEV)

| Category | Event | ISO CAEV | SWIFT MT564 |
|----------|-------|---------|-------------|
| Equity Income | Cash Dividend (Regular) | DVOP | NEWM (Dividend) |
| Equity Income | Special Cash Dividend | DVOP | NEWM (Dividend) |
| Equity Income | Return of Capital | REDU | NEWM (Reduction of Capital) |
| Corporate Structure | Bonus Issue | BONU | NEWM (Bonus Issue) |
| Corporate Structure | Stock Dividend | BONU | NEWM (Bonus Issue) |
| Corporate Structure | Stock Split / Consolidation | SPLT / CONS | NEWM (Stock Split) |
| Corporate Structure | Spin-off / Demerger | SPIN | NEWM (Spin-off) |
| Equity Offerings | Rights Issue | RHDI | NEWM (Rights Issue) |
| Equity Offerings | Secondary Offering | OFFO | NEWM (Offer For Sale) |
| Equity Offerings | Private Placement | OFFO | NEWM (Offer For Sale) |
| M&A | Tender Offer | TEND | NEWM (Tender Offer) |
| M&A | Mergers & Acquisitions | MRGR | NEWM (Merger) |
| M&A | Bankruptcy / Delisting | DELI / BANK | NEWM (Delisting) |

---

## 1. Cash Dividend (Regular)

**Definition:** Periodic distribution of earnings to shareholders. Recurring, expected.

### Vendor Treatment

| Vendor | PAF Formula | Divisor | PR Adjusted | TR/NTR | Timing | Threshold |
|--------|-------------|---------|-------------|--------|--------|-----------|
| MSCI | None — no price adj | No | No | Reinvested on ex-date | Ex-date | None stated |
| S&P DJI | None — no price adj | No | No | Reinvested on ex-date | Ex-date | None stated |
| FTSE Russell | None — no price adj | No | No | Reinvested on ex-date | Ex date | None stated |
| STOXX | `padj = pt-1 - Divt` (GR); `padj = pt-1 - Divt × (1-τ)` (NTR) | Yes — decreases | **NO** — only GR/NTR adjusted | Reinvested net of withholding tax τ | Ex-date | None — applied immediately |
| Solactive | NULL — reference to Equity Index Methodology | NULL | NULL | NULL | NULL | NULL |
| Morningstar | None — no price adj | No | No | Reinvested (withholding tax for NTR) | Ex-date | Standard |
| VettaFi | NULL | NULL | NULL | NULL | NULL | NULL |

### Key Notes
- **STOXX unique:** Regular cash dividend — PR NOT adjusted (dividend reinvested only in GR/NTR). Same formula as special dividend for GR/NTR but PR is NOT adjusted for regular.
- **Divisor impact:** When dividend is paid, share price drops by dividend amount. Total market cap drops. Divisor decreases to keep index level continuous.
- **QIR vs Ongoing:** Regular dividends are Ongoing — applied on ex-date outside scheduled reviews.

### Formula Reference (STOXX)
```
GR: padj = pt-1 - Divt
NTR: padj = pt-1 - Divt × (1 - τ)
where τ = withholding tax rate
```

---

## 2. Special Cash Dividend

**Definition:** Non-recurring distribution from accumulated profits or asset sales. Not part of normal dividend policy.

### The Critical Divergence — Classification vs PR Treatment

There are **two separate questions** that must not be confused:
1. **Is this event classified as a "special dividend"?** (determines whether it's tracked separately)
2. **Is the PR (Price Return) index adjusted?** (determines whether the price drops on ex-date)

The answers differ by vendor.

### Vendor Treatment

| Vendor | Classification Rule | PR Adjusted? | TR/NTR | PAF Formula |
|--------|---------------------|--------------|--------|-------------|
| MSCI | ≥5% of market price = special; <5% = ordinary | Only if ≥5% | Always reinvested | `PAF = (CumPx - Div) / CumPx` |
| S&P DJI | 1st and 2nd consecutive = special; 3rd = last special; 4th+ = ordinary | Yes | Always reinvested | Standard PAF |
| FTSE Russell | 1st to 3rd consecutive = special; 4th+ = ordinary | Yes | Always reinvested | Deducted from price on ex-date |
| **STOXX** | **NO distinction — ALL treated as special (UNIQUE)** | **YES — always, regardless of size (UNIQUE)** | Always reinvested | `padj = pt-1 - Divt` (GR); `pt-1 - Divt × (1-τ)` (PR/NTR) |
| Morningstar | ≥5% of market price = special (from Aug 2024); <5% = ordinary | Only if ≥5% | Always reinvested | `PAF = (PxEx-1 - GrossSpecDiv) / PxEx-1` |
| VettaFi | Always classified as special | **YES — always adjusted (UNIQUE)** | Always reinvested | Standard PAF |

### Key Divergence Points

**STOXX is the critical outlier:**
- Does NOT use a threshold or recurrence rule to classify special dividends
- Instead applies a **different PAF formula** for special vs regular cash dividends
- The **PR index IS adjusted for ALL special dividends** — this is unique to STOXX
- Formula: `padj = pt-1 - Divt` for Gross Return; `padj = pt-1 - Divt × (1-τ)` for Price Return and NTR

**Same event, different outcomes:**
- A €0.50 special dividend on a €20 stock (2.5% of price):
  - **STOXX**: Classified as special, PR adjusted → price drops on ex-date
  - **MSCI/Morningstar**: Below 5% threshold → classified as ordinary, PR NOT adjusted
  - **S&P**: Depends on recurrence count
  - **VettaFi**: Always special, PR adjusted

**FTSE most generous:** 3 free passes before treating recurring special dividends as ordinary.
**S&P:** 2 free passes.

### Timing
- All vendors: Applied on ex-date
- All vendors: TR/NTR always reinvested regardless of classification

---

## 3. Stock Dividend (Bonus Shares)

**Definition:** Shares distributed from retained earnings or share premium to existing shareholders. Not funded by cash reserves.

**Distinguished from Bonus Issue:** While both result in more shares and no value leaving the company, stock dividends typically come from retained earnings and may have a different tax treatment. Some vendors use different PAF formulas for stock dividend vs bonus issue.

### Vendor Treatment

| Vendor | PAF Formula | Divisor | PR Adjusted | Notes |
|--------|-------------|---------|-------------|-------|
| MSCI | `padj = pt-1 × A / (A+B)` (same as split) | No | Yes | No distinction from bonus issue — split formula applied |
| S&P DJI | `padj = pt-1 / split_ratio` | No | Yes | Treated identically to stock split |
| FTSE Russell | Shares before ÷ Shares after | No | Yes | **Distinct from bonus issue** — uses this specific ratio formula |
| STOXX | **4 subtypes, 4 different formulas** | Varies | Yes | Ordinary / Treasury Stock / Redeemable Shares / Another Company — each has distinct PAF. See §8.1.5.1–8.1.5.4 |
| Solactive | NULL | NULL | NULL | |
| Morningstar | `PAF = Pre-Event Total Shares / Post-Event Total Shares` | No | Yes | Absolute share count ratio — distinct from bonus issue |
| VettaFi | NULL | NULL | NULL | |

### STOXX Four Subtypes (Source: STOXX Calculation Guide §8.1.5)

**8.1.5.1 Ordinary Stock Dividend:**
```
padj = pt-1 × A / (A + B)
sadj = st-1 × (A + B) / A   [for free-float market cap indices]
```

**8.1.5.2 Treasury Stock Method:**
```
padj = pt-1 - pt-1 × B / (A + B)
Divisor: YES — decreases (treated as cash distribution)
```

**8.1.5.3 Redeemable Shares (Cash Dividend):**
```
padj = pt-1 - pt-1 × B / (A + B)
Divisor: Yes — decreases
```

**8.1.5.4 Shares of Another Company:**
```
padj = [(pt-1 × A) – [(1 – τ*) × price_of_other_company × B]] / A
where τ* = withholding tax rate
Divisor: Yes — adjusts
```

### Key Divergence
- MSCI/S&P: No distinction between stock dividend and bonus — split formula
- FTSE: Distinguishes, uses share count ratio
- STOXX: Most granular — 4 different subtypes with 4 different formulas
- Morningstar: Absolute share count ratio, distinct from bonus

---

## 4. Bonus Issue

**Definition:** Free additional shares issued to all existing shareholders, funded by retained earnings or share premium. No value leaves the company.

### Vendor Treatment (All Identical)

| Vendor | Price Adjustment | Shares | Divisor | Notes |
|--------|-----------------|--------|---------|-------|
| MSCI | No | x bonus ratio | No | Market cap unchanged |
| S&P DJI | No | x bonus ratio | No | Same |
| FTSE Russell | No | x bonus ratio | No | Same |
| STOXX | No | x bonus ratio | No | Same |
| Solactive | No | x bonus ratio | No | Same |
| Morningstar | No | x bonus ratio | No | Same |
| VettaFi | N/A | N/A | N/A | |

### Formula
```
New price = Old price / (1 + bonus ratio)
Market cap unchanged — only per-share metrics change
No divisor adjustment needed
```

### Key Notes
- **Identical across all vendors** — no divergence
- More shares, lower price, same total market cap
- No adjustment to divisor because market cap per share (price) is maintained proportionally

---

## 5. Stock Split / Consolidation

**Definition:** Division (split) or consolidation (reverse split) of existing shares. Total market cap unchanged.

### Vendor Treatment

| Vendor | PAF Formula | Divisor | Notes |
|--------|-------------|---------|-------|
| MSCI | `padj = pt-1 × A / (A+B)` | No | Market cap unchanged |
| S&P DJI | `padj = pt-1 / split_ratio` | No | |
| FTSE Russell | Number of shares before ÷ after | No | Price adjusted per ratio |
| STOXX | `padj = pt-1 × A / (A+B)` | **Yes — increases** | STOXX adjusts divisor for splits (unique) |
| Solactive | NULL | NULL | |
| Morningstar | `PAF = Pre-Event Total Shares / Post-Event Total Shares` | No | |
| VettaFi | NULL | NULL | |

### Key Divergence
- **STOXX unique:** Divisor IS adjusted for stock splits (increases). All other vendors: divisor unchanged.
- This means for STOXX, the index level stays the same after a split (price drops, shares increase, divisor increases to offset).
- Other vendors: index level drops proportionally with price.

---

## 6. Spin-off / Demerger

**Definition:** Separation of a company business unit into a standalone entity distributed to parent shareholders. Parent loses the distributed entity's value on ex-date.

### The Placeholder Problem

When Company B is spun off from Company A, Company B has not started trading yet on the ex-date. There is no market price. Each vendor handles this gap differently — which is the **primary source of divergence** for spin-offs.

### Vendor Treatment

| Vendor | Child Addition Price | Grace Period / Transition | Parent Price Ex-Date |
|--------|---------------------|--------------------------|---------------------|
| MSCI | When-issued price if available; zero if not trading | Until real price available | Deducted on ex-date |
| S&P DJI | Zero placeholder | 20 calendar days max | No adjustment on ex-date |
| FTSE Russell | Estimated price | Until real price available | Deducted on ex-date |
| STOXX | **Market price only — NO placeholder** | No grace period | Spin-off value deducted |
| Solactive | 0.00000001 floor | Until trading begins | Deducted on ex-date |
| Morningstar | Zero placeholder | **40 calendar days (India: 60)** | Deducted on ex-date |
| VettaFi | N/A | N/A | N/A |

### STOXX Artificial Price (Source: STOXX Calculation Guide §8.3.2)
If target is not trading at deletion (suspended/delisted before effective date):
- Cash only: artificial price = cash term
- Stock only: artificial price = acquirer closing price × stock exchange ratio
- Cash + Stock: artificial price = cash term + (acquirer price × stock term)
- Cash or Stock default: cash term

### Key Divergence — When Does the Child Appear in Projection Data?

| Vendor | Appears in Projection Data |
|--------|---------------------------|
| Morningstar | **First** — zero placeholder, 40-day grace |
| S&P DJI | **Second** — zero placeholder, 20-day grace |
| Solactive | **Third** — 0.00000001 floor, immediate |
| FTSE Russell | Estimated price, when available |
| MSCI | When-issued or zero, when available |
| STOXX | **Last** — waits for first trade, no placeholder |

### Five Approaches Summarized
1. **S&P and Morningstar** = zero placeholder (different grace lengths)
2. **Solactive** = 0.00000001 floor (same floor STOXX uses for delistings)
3. **FTSE Russell** = estimated price
4. **MSCI** = when-issued or zero
5. **STOXX** = waits for real trading — no placeholder

### Solactive Guru Indices
Spin-offs treated as **special dividend** in Guru Indices — different from standard Solactive index treatment.

### Swedish Redemption Shares
Solactive: Only the **final form** of the security is added — temporary redemption lines are NOT added.

---

## 7. Rights Issue

**Definition:** Existing shareholders have the right to subscribe for new shares at a discount. Voluntary — not all shareholders participate, creating free float uncertainty.

### In-the-Money vs Out-of-the-Money

| Term | Definition | Vendor Treatment |
|------|-----------|-----------------|
| In-the-Money (ITM) | Subscription price < current market price | Rights have value — all major vendors adjust |
| Out-of-the-Money (OTM) | Subscription price ≥ market price | No rational investor exercises — most vendors ignore |

### Vendor Treatment

| Vendor | ITM Adjustment | OTM Adjustment | Threshold / Notes |
|--------|---------------|-----------------|-------------------|
| MSCI | Yes — when-issued price | No adjustment | 5%, 10%, 25% for cap tier |
| S&P DJI | Yes — PAF applied | No adjustment | None stated |
| FTSE Russell | Yes — 3 temp lines (nil-paid rights, call dummy, new shares) | No adjustment | Nil-paid rights trade separately |
| STOXX | Yes — PAF applied | No adjustment | Not treated as cash dividend |
| Solactive | Per methodology | No adjustment | Semi-annual — events between reviews deferred |
| Morningstar | Yes — adjustment applied | No adjustment | Standard |
| VettaFi | NULL | NULL | |

### FTSE Nil-Paid Rights (Unique)
FTSE Russell creates **3 temporary lines** for rights issues:
1. Nil-paid rights (trade before subscription period opens)
2. Call dummy (placeholder)
3. New shares (after subscription closes)

This allows price discovery before shareholders must pay the subscription price.

### Key Divergence
- **FTSE**: Most detailed — creates nil-paid lines for ITM rights
- **STOXX**: Not treated as cash dividend despite having value
- **Solactive GPR Global 100**: Semi-annual — rights issue events can fall between rebalance windows and miss an entire cycle
- **MSCI**: When-issued price used for ITM rights

---

## 8. Secondary Offering

**Definition:** Issuance of new shares by a company that is already public. Can be dilutive.

### Vendor Treatment

| Vendor | PAF | Divisor | Notes |
|--------|-----|---------|-------|
| MSCI | Yes if ≥5% of market cap | Yes if above threshold | Standard threshold |
| S&P DJI | Per M&A methodology | Yes | Treated as M&A event |
| FTSE Russell | Price adjustment | Yes | |
| STOXX | Per M&A / extraordinary adj | Yes | Free float adjustment if change ≥5pp |
| Solactive | NULL | NULL | |
| Morningstar | Corporate action | Yes | |
| VettaFi | Per methodology | NULL | |

### Key Divergence
- Most vendors treat secondary offerings as M&A or apply PAF if above threshold
- STOXX: extraordinary free float adjustment if change ≥5 percentage points

---

## 9. Private Placement

**Definition:** Issuance of new shares to a small group of investors, not via public offering. Can be dilutive.

### Vendor Treatment

| Vendor | PAF | Divisor | Notes |
|--------|-----|---------|-------|
| MSCI | Yes if ≥5% | Yes | |
| S&P DJI | Per M&A | Yes | |
| FTSE Russell | Price adjustment | Yes | |
| STOXX | Per M&A / extraordinary adj | Yes | Free float adjustment if ≥5pp |
| Solactive | NULL | NULL | |
| Morningstar | Corporate action | Yes | |
| VettaFi | Per methodology | NULL | |

---

## 10. Return of Capital

**Definition:** Distribution to shareholders from invested capital or asset sales — NOT from earnings. Not income.

### Vendor Treatment

| Vendor | Treatment | PAF Formula | Timing |
|--------|-----------|-------------|--------|
| MSCI | Special dividend line | Standard | Ex-date |
| S&P DJI | Special dividend | Standard | Ex-date |
| FTSE Russell | **Direct price adjustment** (unique) | Deducted from price on ex-date | Ex-date |
| STOXX | Price adjustment | `padj = [pt-1 - capital_return × (1-τ)] × A / B` | Ex-date |
| Solactive | Per methodology | NULL | |
| Morningstar | Special dividend if outside normal | Standard | Ex-date |
| VettaFi | N/A | N/A | |

### STOXX Formula (Source: STOXX Calculation Guide §8.1.6)
```
padj = [pt-1 - capital_return × (1 - τ)] × A / B
sadj = st-1 × B / A   [for free-float market cap indices]
```
where τ = withholding tax rate, A = shares before, B = shares after (for consolidation component)

### Key Divergence
- **FTSE Russell unique:** Direct price adjustment on ex-date — does NOT create a dividend line item
- All other vendors: treat as special dividend line
- Result is the same (price drops by distribution value) but implementation differs

---

## 11. Mergers & Acquisitions (Target Deletion)

**Definition:** Acquisition or merger where target is absorbed. Target is deleted from index; acquirer adjusted per exchange terms.

### Three Scenarios — Treatment Depends on WHO is in the Index

#### Scenario A: Both Target and Acquirer in Same Index
All vendors: target deleted at last traded price; acquirer added; divisor adjusted.

| Vendor | Deletion Trigger | Notes |
|--------|-----------------|-------|
| MSCI | Deal unconditional | No fixed % threshold |
| S&P DJI | Float <15% OR ≥90% shareholder acceptance | Two separate triggers — Float <15% can fire BEFORE 90% acceptance |
| FTSE Russell | ≥90% held OR Float <5% | Float <5% independent of deal completion |
| STOXX | ≥85% acquired AND Float <10% (BOTH required) | Strictest — requires both conditions. If <85%: deferred to quarterly review |
| Solactive | Float <15% + deal unconditional | |
| Morningstar | Deal completed | |
| VettaFi | Varies by approach | |

#### Scenario B: Only Target in Index
Acquirer not relevant. Deletion threshold determines when target is removed.

Same triggers as Scenario A — but acquirer share adjustment is irrelevant.

#### Scenario C: Only Acquirer in Index
Target not in index. Acquirer's share change size triggers adjustment, not deletion threshold.

| Vendor | Acquirer Share Adjustment Trigger |
|--------|----------------------------------|
| MSCI | 5%/10%/25% for Standard/Small/Micro caps |
| S&P DJI | Adjusted per exchange terms on completion |
| FTSE Russell | Free float change monitored; ≥5pp triggers extraordinary adjustment |
| STOXX | Extraordinary free float adjustment if change ≥5pp |
| Solactive | Per quarterly review |
| Morningstar | Adjusted per exchange terms |

### STOXX Deletion Threshold (Unique: Both Conditions Required)
Source: STOXX Calculation Guide §8.3.1 (Apr 2026)

Requires **BOTH** conditions to be met simultaneously:
1. ≥85% of shares acquired through tender offer
2. Remaining free float of target <10%

If only one condition is met → no immediate deletion, deferred to next quarterly review.

This contrasts with S&P (Float <15% OR ≥90% — two separate triggers either can fire) and FTSE (≥90% held OR Float <5% — either can fire).

### STOXX Acquirer Adjustment
When target is deleted, surviving stock replaces the **largest original stock** in Benchmark indices. Divisor absorbs the market cap change.

### Removal Price

| Vendor | Removal Price |
|--------|--------------|
| MSCI | Last traded price |
| S&P DJI | Last traded price |
| FTSE Russell | Cash terms if halted |
| STOXX | Last traded or **artificial price** (if not trading) |
| Solactive | Per methodology |
| Morningstar | Tender price or last traded |

---

## 12. Tender Offers

**Definition:** Public offer to buy shares directly from shareholders at a premium to gain control. Voluntary — not all shareholders tender.

### Vendor Treatment

| Vendor | Deletion Trigger | Advance Notice | Removal Price |
|--------|-----------------|-----------------|---------------|
| MSCI | Offer completed | None required | Tender price or last traded |
| S&P DJI | ≥75% acceptance — **immediate** | None (immediate) | Tender price |
| FTSE Russell | Min 2 trading days notice | **Required** | Last traded |
| STOXX | Same as M&A: ≥85% acquired AND Float <10% | 2 trading days | Tender price or artificial price |
| Solactive | Float <15% + offer unconditional | Per methodology | Per methodology |
| Morningstar | Offer completed | None required | Tender price or last traded |

### Key Divergence — Notice Requirement

| Vendor | Notice Required? |
|--------|-----------------|
| S&P DJI | **No** — immediate deletion at ≥75% acceptance |
| MSCI | No |
| Morningstar | No |
| FTSE Russell | **Yes — 2 trading days minimum** |
| STOXX | Yes — 2 trading days |

**FTSE is the only vendor requiring advance notice before deletion.**

This means the same tender offer can appear in S&P projection data before FTSE — S&P deletes immediately at ≥75%, FTSE gives 2 days' notice before deleting.

### STOXX Tender Offer (Source: STOXX Calculation Guide §8.3.1.1)
STOXX does not have a separate tender offer methodology — it applies the **same M&A deletion rules** (both ≥85% acquired AND Float <10% required).

---

## 13. Bankruptcy / Delisting

**Definition:** Company fails or is delisted. Shares removed at zero or near-zero value.

### Vendor Treatment

| Vendor | Removal Trigger | Removal Price |
|--------|-----------------|---------------|
| MSCI | Immediate announcement, 2-day implementation | Last traded price; 0.0000001 if no price |
| S&P DJI | Upon delisting/bankruptcy | Market price or M&A terms |
| FTSE Russell | Effective date | Last traded price or M&A terms |
| STOXX | Immediate announcement, 2-day implementation | Traded price, OTC price, or **0.0000001** |
| Solactive | Delisting | Per methodology |
| Morningstar | Upon event | Market price |
| VettaFi | NULL | NULL |

### STOXX Removal Price Formula (Source: STOXX Calculation Guide)
If not trading: artificial price based on acquisition terms (same as M&A artificial price rules).

### STOXX 10-Consecutive-Day Rule
Deletion trigger: 10 consecutive suspension days or bankruptcy filing.

---

## Cross-Vendor Divergence Matrix

| Event | Main Divergence | Most Aggressive | Most Conservative |
|-------|----------------|-----------------|-------------------|
| Cash Dividend (Regular) | None — all same | All identical | All identical |
| Special Cash Dividend | PR adjusted vs not; threshold vs always | **STOXX** (always PR adjusted) | MSCI/Morningstar (<5% = no PR) |
| Stock Dividend | PAF formula differs | STOXX (4 formulas) | MSCI/S&P (split formula) |
| Bonus Issue | None — all same | All identical | All identical |
| Stock Split | Divisor adjustment | **STOXX** (divisor adjusts) | All others (no divisor change) |
| Spin-off | Placeholder price approach | **Morningstar** (40-day zero placeholder) | **STOXX** (market price only, no placeholder) |
| Rights Issue | Nil-paid lines; semi-annual deferment | **FTSE** (nil-paid lines) | **Solactive** (semi-annual — can miss cycle) |
| Return of Capital | Dividend line vs direct price adj | All same result | All same result |
| M&A Deletion | Deletion threshold formula | **S&P** (Float <15% OR ≥90%) | **STOXX** (BOTH conditions required) |
| Tender Offer | Notice requirement | **S&P** (immediate ≥75%) | **FTSE** (2-day notice required) |
| Bankruptcy | Removal price floor | STOXX (0.0000001) | S&P (last traded/M&A terms) |

---

## Glossary

| Term | Definition |
|------|-----------|
| **PAF** | Price Adjustment Factor — theoretical ex-date price after a corporate action. Formula: `PAF = (CumPrice - DistributionValue) / CumPrice` |
| **Divisor** | Scaling number keeping index level continuous when market cap changes. `Index = TotalMarketCap / Divisor` |
| **PR Index** | Price Return index — reflects price changes only, no dividend reinvestment |
| **TR Index** | Total Return index — price changes + dividend reinvestment |
| **NTR Index** | Net Total Return index — TR net of withholding tax |
| **GR Index** | Gross Total Return — TR before tax |
| **QIR** | Quarterly Index Review — scheduled rebalance (MSCI, S&P, FTSE, STOXX: Quarterly. Solactive GPR Global 100: **Semi-annual**) |
| **Ex-Date** | First day security trades without the dividend/right/entitlement. Price adjustment applied. |
| **Effective Date** | Date corporate action is settled/completed |
| **Float** | Free float — shares available for public trading (excludes strategic holdings) |
| **ITM** | In-the-Money — rights issue where subscription price < market price |
| **OTM** | Out-of-the-Money — rights issue where subscription price ≥ market price |
| **Artificial Price** | STOXX price when target is not trading at deletion — based on acquisition terms |
| **Withholding Tax (τ)** | Tax deducted on dividends for NTR indices. Default 15% for most markets, varies by jurisdiction |
| **Placeholder Price** | Temporary price used by some vendors when real market price is not yet available (e.g., for spin-off children) |
| **Nil-Paid Rights** | FTSE Russell's temporary trading lines for rights before subscription period opens |

---

## Source Documents

| Vendor | Document | Version |
|--------|----------|---------|
| MSCI | Corporate Events Methodology | 2026 |
| S&P DJI | Equity Indices Policies and Practices | Mar 2026 |
| FTSE Russell | Corporate Actions and Events Guide | v6.8, Oct 2025 |
| STOXX | Calculation Guide | Apr 2026 |
| Solactive | GPR Global 100 Index Guideline | Mar 2026 |
| Morningstar | Corporate Actions Methodology | Jan 2026 |
| VettaFi | Corporate Action Initiators Methodology | Apr 2026 |
| VettaFi | Index Maintenance Policy | Apr 2026 |