---
title: ISO 20022 Corporate Action Taxonomy
description: Universal taxonomy mapping ISO 20022 CAEV codes and SWIFT MT564 event types to vendor-specific terminology used by MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, and VettaFi
vendors: [MSCI, S&P DJI, FTSE Russell, STOXX, Solactive, Morningstar, VettaFi]
created: 2026-04-17
source: Official methodology PDFs per vendor
---

# ISO 20022 Corporate Action Taxonomy

## Master Mapping Table

| Master Category | ISO CAEV | SWIFT MT564 Event Type | MSCI | S&P DJI | FTSE Russell | STOXX | Solactive | Morningstar | VettaFi |
|-----------------|----------|------------------------|------|---------|--------------|-------|-----------|-------------|---------| 
| Cash Dividend (Regular) | DVOP | NEWM (Dividend) | Cash Dividend | Dividend (Cash) | Ordinary Dividend | Cash Dividend | Cash Distribution | Ordinary Dividend | Cash Dividend |
| Special Cash Dividend | DVOP | NEWM (Dividend) | Special Cash Dividend | Special Dividend | Special Dividend | Special Cash Dividend | Special Cash Distribution | Special Dividend | Special Dividend |
| Stock Dividend / Bonus Issue | BONU | NEWM (Bonus Issue) | Stock Dividend / Bonus Issue | Stock Dividend | Scrip Issue / Stock Distribution | Stock Dividend | Stock Distribution | Stock Dividend / Bonus Issue | Stock Dividend |
| Spin-off / Demerger | SPIN | NEWM (Spin-off) | Spin-off | Spin-off | Demerger | Spin-off | Spin-off | Spin-off | Spin-off |
| Rights Issue | RHDI | NEWM (Rights Issue) | Rights Issue | Rights Offering | Rights Issue / Entitlement Offer | Rights Offering | Rights Issue | Rights Offering | Rights Issue |
| Share Consolidation / Reverse Split | CONS / SPLT | NEWM (Stock Split / Consolidation) | Split / Reverse Split | Stock Split / Consolidation | Split (Sub-division) / Reverse Split | Split and Reverse Split | Share Split / Reverse Split | Stock Split / Reverse Stock Split | Split / Reverse Split |
| Return of Capital | REDU | NEWM (Reduction of Capital) | Return of Capital | Return of Capital | Capital Repayment | Return of Capital and Share Consolidation | Capital Return | Return of Capital | Return of Capital |
| Merger & Acquisition (Target) | MRGR | NEWM (Merger) | Merger & Acquisition | Merger & Acquisition | Merger and Acquisition | Merger and Takeover | Merger & Acquisition | Merger and Acquisition | M&A |
| Tender Offer | TEND | NEWM (Tender Offer) | Tender Offer | Tender Offer | Tender Offer | (handled via M&A) | Tender Offer | Tender Offer | Tender Offer |
| Delisting / Bankruptcy | DELI / BANK | NEWM (Delisting / Bankruptcy) | Delisting / Bankruptcy | Bankruptcy / Liquidation | Delisting / Bankruptcy | Delisting / Bankruptcy / Insolvency | Delisting | Bankruptcy / Delisting / Liquidation | Delisting / Bankruptcy |
| Stock Split | SPLT | NEWM (Stock Split) | Stock Split | Stock Split | Ordinary Splits (sub-division) | Split and Reverse Split | Share Split | Stock Split | Stock Split |
| Return of Cash (Non-Dividend) | REDU | NEWM (Other) | Return of Capital | Return of Capital | Capital Repayment | Return of Capital | Cash Distribution | Return of Capital | Return of Capital |
| IPO / Direct Listing | IPOO | NEWM (Initial Public Offer) | IPO | IPO / Direct Listing | IPO | IPO | IPO | IPO | IPO |
| Scrip Dividend | SCRP | NEWM (Scrip Dividend) | Scrip Dividend | Scrip Dividend | Scrip Issue | Stock Dividend | Scrip Dividend | Scrip Dividend | Scrip Dividend |
| Warrant / Option | WARI | NEWM (Warrant) | Warrant / Option | Warrant / Option | (not separately classified) | (treated as ineligible) | Warrant | Warrant / Option | Warrant |
| Partial Tender / Buyback | OFFO / BUTF | NEWM (Buyback) | Partial Tender Offer / Buyback | Tender Offer / Buyback | Compulsory Partial Tender / Buyback | Repurchase of Shares / Self-Tender | Share Repurchase | Buyback | Buyback |

## ISO 20022 CAEV Code Definitions

| Code | Full Name | Description |
|------|-----------|-------------|
| BONU | Bonus Issue | Shares issued to shareholders at no charge, pro-rata |
| CAPG | Capital Gains Distribution | Fund's distribution of realized capital gains |
| CONS | Consolidation / Reverse Split | Reduction of number of shares via merging |
| DELI | Delisting | Removal of security from official exchange |
| DIVT | Dividend | Periodic distribution from earnings |
| DRIP | Dividend Reinvestment | Dividend reinvested via purchase of additional shares |
| DVOP | Dividend Option | Shareholder choice between cash or stock dividend |
| EXAM | Mandatory Amendment | Forced change to terms of an event |
| EXWA | Exercise Warrant | Conversion of warrants into shares |
| FRCL | Freely Liquidable | Change in free float classification |
| HLDR | Holder Election | Election event triggered by security holder |
| INTR | Interest Payment | Payment of interest on debt securities |
| IPOO | Initial Public Offering | First time security offered to public |
| LIQU | Liquidation | Winding up of company, distribution of assets |
| MRGR | Merger | Two entities combine into one |
| OVLS | Oversubscription | Right to purchase additional shares beyond entitlement |
| PAYS | Payment | General payment instruction |
| PCAL | Partial Call | Redemption of part of a security issue |
| PRED | Predetermination | Pre-arranged event outcome |
| REDU | Return of Capital | Distribution of capital back to shareholders |
| RHDI | Rights Issue | Right to subscribe for new shares at discount |
| SHOP | Stock Purchase | Open market share repurchase |
| SOLI | Solicitation | Solicitation of proxies or acceptances |
| SPLT | Stock Split | Division of existing shares into more shares |
| SPIN | Spin-off | Separation of company business units |
| SUSP | Suspension | Trading halt or pause |
| TEND | Tender Offer | Public offer to buy shares at premium |
| WTRN | Written News | Mandatory notification of an event |
| BUTF | But-font | Mandatory buyback offer |
| OFFO | Offer For Sale | Public sale of shares to market |

## SWIFT MT564 Message Structure (Reference)

The MT564 Corporate Action Notification uses Sequence A field 22F to indicate the CAEV (Corporate Action Event) code. This is the standard wire format that feeds into vendor systems.

## Vendor Taxonomy Notes

### MSCI
- Uses "Spin-off" as standard term
- M&A: "Merger and Acquisition" as category
- Partial tender: "Partial tender offer" and "Buyback offers" treated separately
- Rights: "Rights Issue"
- Bonus: "Stock Dividend / Bonus Issue"

### S&P DJI
- Uses "Rights Offering" for rights issues
- "Spin-off" for spin-offs
- "Stock Dividend" for bonus issues
- Merger treatment includes "Reverse Mergers / Takeovers"
- Tender offers explicitly handled under own section

### FTSE Russell
- Uses "Demerger" for spin-offs (vs. "Spin-off" used by others)
- "Scrip Issue" for bonus shares
- "Rights Issue / Entitlement Offer"
- "Capital Repayment" for return of capital
- "Special Dividend" clearly distinguished from ordinary

### STOXX
- "Spin-off" as standard
- "Rights Offering" with sub-classification: Standard vs. Highly Dilutive (>200% ratio)
- "Repurchase of Shares / Self-Tender" for buybacks
- "Return of Capital and Share Consolidation" combined treatment
- Separate handling for "Stock Dividend from treasury stock"

### Solactive
- Refers to "Solactive Equity Index Methodology" for detailed treatment
- GPR Global 100 is a specialty real estate index
- High-level list of events but specific formulas in separate document
- M&A with stock terms: target deleted, acquirer shares increased, weighting cap factor recalculated

### Morningstar
- Explicit "Corporate Action Category" table: Mandatory vs. Nonmandatory
- "Bonus Issue" as distinct from "Stock Dividend" (shares not entitled to cash dividend)
- "Return of Capital" treated like special dividend (price + divisor adjustment)
- "Accelerated Implementation Rule" for non-mandatory events
- Separate "Scrip Dividend" and "Coupon Distribution Cash/Stock"

### VettaFi
- Uses MSCI methodology (MSCI Corporate Events Methodology, February 2026)
- Same event classification as MSCI
- VettaFi index maintenance policy aligns with MSCI triggers

## Event Classification: Mandatory vs. Non-Mandatory

| Event | MSCI | S&P DJI | FTSE Russell | STOXX | Morningstar |
|-------|------|---------|--------------|-------|-------------|
| Cash Dividend | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Special Cash Dividend | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Stock Split | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Rights Issue | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory (if in-the-money) |
| Spin-off | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| M&A | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Tender Offer | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Delisting | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Bonus Issue | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| Return of Capital | Mandatory | Mandatory | Mandatory | Corporate Action | Mandatory |
| IPO | Non-Mandatory | Additions | Non-Mandatory | Review-driven | Non-Mandatory |
| Share Buyback | Non-Mandatory | Non-Mandatory | Event-driven | Non-Mandatory | Non-Mandatory |
| Public Offering | Non-Mandatory | Non-Mandatory | Event-driven | Non-Mandatory | Non-Mandatory |

*Solactive defers to Equity Index Methodology; VettaFi follows MSCI*
