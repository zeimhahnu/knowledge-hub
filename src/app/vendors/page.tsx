"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpenIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ScaleIcon,
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  TrendingUpIcon,
} from "lucide-react";

// ─── Glossary ────────────────────────────────────────────────────────────────

type GEntry = { term: string; definition: string; detail?: string };

const GLOSSARY: GEntry[] = [
  {
    term: "In-the-Money (ITM)",
    definition: "A rights issue where the subscription price is below the current market price.",
    detail: "The rights have intrinsic value — a rational investor would exercise them. All major vendors adjust for ITM rights.",
  },
  {
    term: "Out-of-the-Money (OTM)",
    definition: "A rights issue where the subscription price equals or exceeds the current market price.",
    detail: "No intrinsic value. Vendors typically do NOT adjust — the shareholder would not exercise.",
  },
  {
    term: "Nil-Paid Rights",
    definition: "Rights that trade separately from the parent shares before the subscription period begins.",
    detail: "FTSE Russell creates 3 temp lines: nil-paid rights, call dummy, and new shares. Allows price discovery before payment.",
  },
  {
    term: "PAF",
    definition: "Price Adjustment Factor — the theoretical ex-date price after adjusting for a corporate action.",
    detail: "Formula: PAF = (CumPrice − DistributionValue) / CumPrice. Applied on ex-date to maintain index continuity.",
  },
  {
    term: "FAF",
    definition: "Float Adjustment Factor — used when a corporate action changes the free float of a security.",
    detail: "Reduces the shares outstanding used in index calculation to reflect non-tradeable portions.",
  },
  {
    term: "SAF / PAF / FAF",
    definition: "Share Adjustment Factor, Price Adjustment Factor, Float Adjustment Factor.",
    detail: "These three work together: SAF changes shares, PAF adjusts price, FAF adjusts float. All maintain index continuity.",
  },
  {
    term: "TERP",
    definition: "Theoretical Ex-Rights Price — the expected market price after a rights issue is fully subscribed.",
    detail: "Formula: TERP = (OldMarketCap + NewShares × SubPrice) / (OldShares + NewShares). Used by MSCI and S&P to validate rights value.",
  },
  {
    term: "When-Issuued",
    definition: "Trading of a security before its official distribution date, e.g., a spin-off before the ex-date.",
    detail: "MSCI uses when-issued prices for spin-off inclusions. FTSE uses estimated prices. S&P uses zero on day before ex-date.",
  },
  {
    term: "Ex-Date",
    definition: "The date from which a security trades without the benefit of a corporate action (dividend, rights, etc.).",
    detail: "Traders who buy on ex-date do not receive the action. Price typically drops by the action value on this date.",
  },
  {
    term: "Cum-Date",
    definition: "The last date on which a buyer of a security is entitled to the upcoming corporate action.",
    detail: "Opposite of ex-date. Also called 'record date' in some markets.",
  },
  {
    term: "Record Date",
    definition: "The date on which shareholders must be registered to receive a corporate action benefit.",
    detail: "Set by the company. May differ from ex-date depending on market convention (T+2 settlement).",
  },
  {
    term: "Effective Date",
    definition: "The date a corporate action is officially completed and reflected in company records.",
    detail: "May differ from ex-date. The actual date the company processes the action.",
  },
  {
    term: "PR Index",
    definition: "Price Return index — reflects only price changes, dividends are NOT reinvested.",
    detail: "Also called 'Price Index'. Most capitalisation-weighted indices use this as the primary version.",
  },
  {
    term: "TR Index",
    definition: "Total Return index — reflects price changes PLUS gross dividends reinvested on ex-date.",
    detail: "Gross dividends = before withholding tax. TR is always ≥ PR on ex-div dates.",
  },
  {
    term: "NTR Index",
    definition: "Net Total Return index — reflects price changes PLUS dividends net of withholding tax reinvested.",
    detail: "Standard for indices used in products sold to non-domestic investors. NTR ≤ TR due to tax drag.",
  },
  {
    term: "Divisor",
    definition: "A scaling number used in market-cap-weighted indices to keep the index value continuous across corporate actions.",
    detail: "Formula: IndexMarketCap / Divisor = IndexLevel. When shares change, divisor is adjusted to keep level unchanged.",
  },
  {
    term: "Divisor Adjustment",
    definition: "A change to the index divisor to maintain index continuity when a corporate action doesn't directly change share count.",
    detail: "Used in: mergers (acquirer shares change), spin-offs (parent price drops), M&A (target deleted).",
  },
  {
    term: "QIR",
    definition: "Quarterly Index Review — a scheduled rebalance where index composition is updated.",
    detail: "Vendors use QIR differently: FTSE quarterly, S&P Mar/Jun/Sep/Dec, STOXX quarterly. Below-threshold events accumulate.",
  },
  {
    term: "Ongoing",
    definition: "Applied immediately on the corporate action effective or ex-date, outside of scheduled reviews.",
    detail: "Most significant events (dividends, splits, M&A above threshold) are applied Ongoing.",
  },
  {
    term: "Free Float",
    definition: "The proportion of shares available for public trading, excluding strategic, regulatory, and insider holdings.",
    detail: "Free float ≠ total shares. Vendors use different FIF/IWF methods to calculate investable weight.",
  },
  {
    term: "IWF",
    definition: "Investable Weight Factor — MSCI's term for the proportion of total shares available to foreign investors.",
    detail: "IWF = (Total Shares − Restricted Shares) / Total Shares. Updated on schedule, not always event-driven.",
  },
  {
    term: "Mandatory Event",
    definition: "A corporate action that is automatically processed because it has been confirmed by the company.",
    detail: "Cash dividends, stock splits, M&A completions — all vendors apply these without discretion.",
  },
  {
    term: "Voluntary Event",
    definition: "A corporate action where participation requires a shareholder to take action (e.g., exercise rights).",
    detail: "Rights issues, tender offers — vendor may or may not adjust depending on thresholds and likelihood of participation.",
  },
  {
    term: "Primary Offering",
    definition: "A new share issuance by a company that raises capital directly for the issuer.",
    detail: "Dilutive to existing shareholders. All new shares go to the company. Index weight may increase if issuer uses proceeds to grow.",
  },
  {
    term: "Secondary Offering",
    definition: "Sale of existing shares by current shareholders to new investors. No new shares issued.",
    detail: "Not dilutive to per-share metrics. May affect free float if large block is sold into market.",
  },
  {
    term: "Private Placement",
    definition: "Issuance of new shares to a small group of investors (institutions, insiders) — not to the general public.",
    detail: "MSCI: Not adjusted until next QIR unless it causes ≥5% change. FTSE: Treated as extraordinary if ≥1% cumulative.",
  },
  {
    term: "Stock Dividend",
    definition: "A dividend paid in additional shares rather than cash. Also called a scrip dividend.",
    detail: "Same adjustment as a stock split — shares increase, price drops proportionally, no divisor change.",
  },
  {
    term: "Scrip Dividend",
    definition: "A dividend where shareholders can choose to receive cash or additional shares.",
    detail: "If cash is default → reinvested in TR index. If shares are default → treated like stock dividend.",
  },
  {
    term: "Rights Issue",
    definition: "An issuance of rights to existing shareholders to purchase new shares, typically at a discount.",
    detail: "Each shareholder receives one right per share held. Rights can be traded (nil-paid) or exercised.",
  },
  {
    term: "Spin-Off",
    definition: "Separation of a subsidiary from its parent company into an independent, publicly traded entity.",
    detail: "Parent price drops by distribution value on ex-date. Child added to index if eligible, typically after a grace period.",
  },
  {
    term: "Bonus Issue",
    definition: "A free issuance of new shares to all existing shareholders, typically from retained earnings or share premium.",
    detail: "No price adjustment — market cap is unchanged per share (more shares, lower price proportionally).",
  },
  {
    term: "M&A",
    definition: "Mergers & Acquisitions — target company is absorbed or combined with acquirer, ceasing to exist as a separate entity.",
    detail: "Target deleted from index when deal is unconditional / completed. Acquirer shares adjusted per exchange terms.",
  },
  {
    term: "Tender Offer",
    definition: "A public offer to buy shares directly from shareholders at a premium, typically to gain control.",
    detail: "Threshold-based deletion: when ≥75-90% accepted, target is removed. Acquirer may be added.",
  },
  {
    term: "Return of Capital",
    definition: "A distribution to shareholders that is not sourced from earnings or retained profits.",
    detail: "Treated as a special dividend by most vendors. May have different tax treatment from income dividends.",
  },
  {
    term: "Bankruptcy",
    definition: "Company fails and is wound down. Shares delisted, typically at zero or near-zero value.",
    detail: "All vendors remove at zero or last traded price. Divisor adjusted to maintain continuity for remaining constituents.",
  },
  {
    term: "Delisting",
    definition: "Removal of a security from an exchange, either voluntarily or due to regulatory action.",
    detail: "Different from bankruptcy — company may still exist but is no longer publicly tradable.",
  },
  {
    term: "Highly Dilutive Rights Issue (HDRI)",
    definition: "A rights issue that would increase shares by more than 10%, dramatically reducing the subscription price.",
    detail: "STOXX triggers HDRI safeguards if >5% market cap impact. MSCI/S&P create multiple temp lines to manage the adjustment.",
  },
];

// ─── Taxonomy ────────────────────────────────────────────────────────────────

type EventType = {
  id: string;
  name: string;
  badge: "mandatory" | "voluntary";
  parentCategory: string;
  summary: string;
  shortSummary: string;
  recognitionTiming: string;
  adjustmentTiming: string;
  thresholds: { vendor: string; value: string; note?: string }[];
  timingFlow: { phase: string; what: string; who: string[] }[];
  keyTerms: string[];
  criticalRule: string;
  comparisonFields: { label: string; values: Record<string, string> }[];
};

const EVENT_TYPES: EventType[] = [
  {
    id: "cash-dividend",
    name: "Cash Dividend",
    badge: "mandatory",
    parentCategory: "Equity Income",
    summary: "Payment of cash by a company to its shareholders, pro-rata to shareholding.",
    shortSummary: "Cash paid to shareholders pro-rata. No price adjustment in PR index. Dividends reinvested in TR/NTR.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date (PAF not applied to PR, but TR/NTR dividend points added)",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces dividend amount, record date, ex-date, pay date", who: ["All vendors monitor"] },
      { phase: "Last Cum-Date", what: "Last day buyer receives dividend rights", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Price drops by dividend amount in market. PR index: no PAF. TR/NTR: dividend reinvested.", who: ["All vendors apply same day"] },
      { phase: "Record Date", what: "Shareholder registry updated for dividend entitlement", who: ["Company"] },
      { phase: "Pay Date", what: "Cash actually transferred to shareholders", who: ["Company"] },
    ],
    keyTerms: ["Ex-Date", "Record Date", "PR Index", "TR Index", "NTR Index"],
    criticalRule: "All vendors treat ordinary cash dividends identically: NO price adjustment to PR index. TR/NTR reinvest dividends on ex-date. Differences arise only in special dividends.",
    comparisonFields: [
      { label: "PR Index", values: { MSCI: "No PAF", "S&P DJI": "No PAF", "FTSE Russell": "No PAF", STOXX: "No PAF", Solactive: "No PAF", Morningstar: "No PAF", VettaFi: "No PAF" } },
      { label: "Divisor Change", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "No" } },
      { label: "TR/NTR", values: { MSCI: "Reinvested gross/net", "S&P DJI": "Reinvested gross/net", "FTSE Russell": "Reinvested gross/net", STOXX: "Reinvested gross/net", Solactive: "Reinvested", Morningstar: "Reinvested gross/net", VettaFi: "Reinvested" } },
      { label: "Timing", values: { MSCI: "Ongoing", "S&P DJI": "Ongoing", "FTSE Russell": "Ongoing", STOXX: "Ongoing", Solactive: "Ongoing", Morningstar: "Ongoing", VettaFi: "Ongoing" } },
    ],
  },
  {
    id: "special-dividend",
    name: "Special Dividend",
    badge: "mandatory",
    parentCategory: "Equity Income",
    summary: "A non-recurring dividend payment, either from accumulated profits or a one-time event (e.g., asset sale).",
    shortSummary: "One-time dividend outside normal pattern. Subject to threshold rules — may or may not trigger price adjustment.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date (price-adjusted in PR if threshold met)",
    thresholds: [
      { vendor: "MSCI", value: "≥5% of market price → special; <5% → ordinary" },
      { vendor: "S&P DJI", value: "1st & 2nd consecutive = special; 3rd = last special; 4th+ = ordinary" },
      { vendor: "FTSE Russell", value: "1st–3rd = special; 4th+ consecutive = ordinary" },
      { vendor: "STOXX", value: "NO distinction — treated identically to ordinary dividends", note: "Unique: no differentiation" },
      { vendor: "Morningstar", value: "≥5% market price = special (from Aug 2024); <5% = ordinary" },
      { vendor: "VettaFi", value: "Special dividends applied to PR + TR/NTR", note: "UNIQUE: applied to PR index" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Company announces special dividend. Vendor checks threshold/recurrence.", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Price drops by distribution value. PR adjusted if threshold met.", who: ["MSCI, S&P, FTSE, Morningstar: PAF applied. STOXX: same as ordinary."] },
    ],
    keyTerms: ["In-the-Money (ITM)", "PAF", "PR Index", "Special Dividend Threshold"],
    criticalRule: "STOXX has NO special dividend distinction — same as ordinary. VettaFi applies to PR index (unique). S&P DJI uses consecutive count. FTSE uses 1st-3rd rule.",
    comparisonFields: [
      { label: "Threshold", values: { MSCI: "≥5% market price", "S&P DJI": "1st-2nd consec.; 3rd = last", "FTSE Russell": "1st–3rd; 4th+ ordinary", STOXX: "No distinction ⚠️", Solactive: "Case-by-case", Morningstar: "≥5% (Aug 2024+)", VettaFi: "→ PR + TR/NTR ⚠️" } },
      { label: "PR Adjusted", values: { MSCI: "Yes (≥5%)", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes (same)", Solactive: "Yes", Morningstar: "Yes (≥5%)", VettaFi: "Yes + unique ⚠️" } },
      { label: "Formula", values: { MSCI: "PAF=(CumPx−Div)/CumPx", "S&P DJI": "Standard PAF", "FTSE Russell": "Deducted from price", STOXX: "Same as regular", Solactive: "Per methodology", Morningstar: "PAF=(PxExDate−1−GrossSpecDiv)/PxExDate−1", VettaFi: "Standard" } },
    ],
  },
  {
    id: "stock-split",
    name: "Stock Split / Consolidation",
    badge: "mandatory",
    parentCategory: "Corporate Structure",
    summary: "A proportional change in the number of shares: split (more shares, lower price) or consolidation (fewer shares, higher price).",
    shortSummary: "Shares multiplied/divided by split ratio. Price inversely adjusted. No divisor change. Universal treatment.",
    recognitionTiming: "Announcement date (confirmed at effective date)",
    adjustmentTiming: "Ex-date",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces split ratio and effective date", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Shares × split ratio. Price ÷ split ratio. No divisor change.", who: ["All vendors: identical treatment"] },
    ],
    keyTerms: ["Ex-Date", "Divisor"],
    criticalRule: "All vendors apply identically. Shares × ratio, Price ÷ ratio. No divisor change. The market cap stays the same — only per-share metrics change.",
    comparisonFields: [
      { label: "Shares", values: { MSCI: "×Split ratio", "S&P DJI": "×Split ratio", "FTSE Russell": "×Split ratio", STOXX: "×Split ratio", Solactive: "×Split ratio", Morningstar: "×Split ratio", VettaFi: "×Split ratio" } },
      { label: "Price", values: { MSCI: "÷Split ratio", "S&P DJI": "÷Split ratio", "FTSE Russell": "÷Split ratio", STOXX: "÷Split ratio", Solactive: "÷Split ratio", Morningstar: "÷Split ratio", VettaFi: "÷Split ratio" } },
      { label: "Divisor Change", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "No" } },
      { label: "Treatment", values: { MSCI: "Identical", "S&P DJI": "Identical", "FTSE Russell": "Identical", STOXX: "Identical", Solactive: "Identical", Morningstar: "Identical", VettaFi: "Identical" } },
    ],
  },
  {
    id: "bonus-issue",
    name: "Bonus Issue / Capitalisation Issue",
    badge: "mandatory",
    parentCategory: "Corporate Structure",
    summary: "Issuance of free additional shares to all existing shareholders, funded by retained earnings or share premium account.",
    shortSummary: "Free shares issued to shareholders. Market cap per share unchanged. No price adjustment. Same as scrip/stock dividend.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces bonus issue (e.g., 1 for 5 bonus)", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Shares increase pro-rata. Price drops proportionally. Market cap unchanged. No divisor change.", who: ["All vendors: identical"] },
    ],
    keyTerms: ["Ex-Date", "Divisor"],
    criticalRule: "Identical across all vendors. Bonus issue = free shares. Market cap unchanged per share — only per-share metrics change. No divisor adjustment.",
    comparisonFields: [
      { label: "Price Adjustment", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "N/A" } },
      { label: "Shares", values: { MSCI: "Added pro-rata", "S&P DJI": "Added", "FTSE Russell": "Added", STOXX: "Added", Solactive: "Added", Morningstar: "Added", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "N/A" } },
    ],
  },
  {
    id: "rights-issue",
    name: "Rights Issue",
    badge: "voluntary",
    parentCategory: "Equity Offerings",
    summary: "Issuance of rights to existing shareholders to subscribe to new shares at a discounted price within a subscription period.",
    shortSummary: "Shareholders get right to buy new shares at discount. ITM → adjusted. OTM → no adjustment. Key difference: in-the-money vs out-of-the-money.",
    recognitionTiming: "Announcement date (ITM confirmed on ex-date)",
    adjustmentTiming: "Ex-date (for ITM only)",
    thresholds: [
      { vendor: "MSCI", value: "ITM: adjust; OTM: no adj", note: "Sub price < market = ITM" },
      { vendor: "S&P DJI", value: "ITM: adjust; OTM: no adj", note: "Value of rights formula" },
      { vendor: "FTSE Russell", value: "At discount: adjust", note: "Nil-paid rights create 3 temp lines" },
      { vendor: "STOXX", value: "Standard: adjust", note: "HDRI if >5% market cap impact" },
      { vendor: "Solactive", value: "Adjust if ITM", note: "Per methodology" },
      { vendor: "Morningstar", value: "ITM: adjust; OTM: no adj", note: "TERP calculated" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Company announces rights issue: subscription price, ratio, deadline", who: ["All vendors monitor"] },
      { phase: "Ex-Date (ITM check)", what: "If sub price + dividend ≥ market price → IN-THE-MONEY → vendor adjusts", who: ["MSCI, S&P, FTSE, STOXX, Solactive, Morningstar"] },
      { phase: "Ex-Date (OTM check)", what: "If sub price + dividend < market price → OUT-OF-THE-MONEY → no adjustment", who: ["MSCI, S&P, Morningstar: no adj. FTSE: adjust if at discount."] },
      { phase: "Subscription Period", what: "Rights trade nil-paid. FTSE creates 3 temp lines for price discovery.", who: ["FTSE only: nil-paid, call dummy, new shares"] },
      { phase: "Post-Subscription", what: "New shares added. Acquirer shares adjusted. Divisor changes.", who: ["All vendors that adjusted"] },
    ],
    keyTerms: ["In-the-Money (ITM)", "Out-of-the-Money (OTM)", "Nil-Paid Rights", "TERP", "Highly Dilutive Rights Issue (HDRI)"],
    criticalRule: "ITM vs OTM is the key distinction. OTM rights have no value → rational investor doesn't exercise → no price adjustment. STOXX HDRI (>5% market cap) gets special treatment. FTSE creates 3 temp lines for nil-paid rights — most complex of all vendors.",
    comparisonFields: [
      { label: "ITM Adjustment", values: { MSCI: "PAF + shares", "S&P DJI": "Value of rights + shares", "FTSE Russell": "At discount + 3 temp lines", STOXX: "Standard + HDRI safeguard", Solactive: "Per methodology", Morningstar: "TERP + shares", VettaFi: "N/A" } },
      { label: "OTM Adjustment", values: { MSCI: "No adj", "S&P DJI": "No adj", "FTSE Russell": "Adjust if at discount", STOXX: "No adj", Solactive: "No adj", Morningstar: "No adj", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
      { label: "Temp Lines", values: { MSCI: "No", "S&P DJI": "2 lines (rights value + sub cash)", "FTSE Russell": "3 lines ⚠️ (nil-paid, call, new)", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "N/A" } },
    ],
  },
  {
    id: "secondary-offering",
    name: "Secondary Offering",
    badge: "voluntary",
    parentCategory: "Equity Offerings",
    summary: "Sale of existing shares by current shareholders to new investors. No new shares issued — purely a transfer of existing ownership.",
    shortSummary: "Existing shares sold to new investors. Threshold-based: above threshold → immediate price adjustment. Below → QIR accumulation. STOXX unique: divisor ONLY.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date (if above threshold)",
    thresholds: [
      { vendor: "MSCI", value: "≥5% of issued shares → immediate; <5% → QIR" },
      { vendor: "S&P DJI", value: "≥5% + US$150M BOTH required → immediate", note: "Dual threshold" },
      { vendor: "FTSE Russell", value: ">1% cumulative per quarter → quarterly review" },
      { vendor: "STOXX", value: "±10% extraordinary → immediate; <±10% → next quarterly review", note: "Divisor only, NO price adjustment ⚠️" },
      { vendor: "Solactive", value: "Per ex-date", note: "Per methodology" },
      { vendor: "Morningstar", value: "Materiality", note: "Subjective assessment" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Company announces offering size and type (primary vs secondary)", who: ["All vendors monitor"] },
      { phase: "Threshold Check", what: "Vendor checks if size exceeds threshold", who: ["All vendors"] },
      { phase: "Ex-Date (above threshold)", what: "Price adjustment applied (except STOXX). Divisor adjusted.", who: ["MSCI, S&P, FTSE, Solactive, Morningstar: PAF. STOXX: divisor ONLY."] },
      { phase: "Below Threshold", what: "Accumulated and applied at next QIR", who: ["MSCI, S&P, FTSE, STOXX"] },
    ],
    keyTerms: ["Primary Offering", "Secondary Offering", "Private Placement", "PAF", "QIR"],
    criticalRule: "STOXX unique: NO price adjustment for secondary offerings — divisor ONLY. S&P requires BOTH ≥5% AND US$150M. FTSE accumulates below-threshold to quarterly review.",
    comparisonFields: [
      { label: "Threshold", values: { MSCI: "≥5% immediate", "S&P DJI": "≥5% + $150M both ⚠️", "FTSE Russell": ">1% cumulative qtrly", STOXX: "±10% extraordinary", Solactive: "Per ex-date", Morningstar: "Materiality", VettaFi: "N/A" } },
      { label: "Price Adj", values: { MSCI: "PAF applied", "S&P DJI": "PAF applied", "FTSE Russell": "If decided by committee", STOXX: "NO price adj ⚠️ divisor only", Solactive: "PAF applied", Morningstar: "PAF applied", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes (primary method)", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
      { label: "Timing", values: { MSCI: "Ongoing (≥5%); QIR (<5%)", "S&P DJI": "Ongoing; QIR (below)", "FTSE Russell": "QIR (>1%); Ongoing (intra-qtr)", STOXX: "Ongoing (>±10%); QIR (<)", Solactive: "Ongoing", Morningstar: "Ongoing", VettaFi: "N/A" } },
    ],
  },
  {
    id: "private-placement",
    name: "Private Placement",
    badge: "voluntary",
    parentCategory: "Equity Offerings",
    summary: "Issuance of new shares to a select group of investors (institutions, insiders) — not publicly offered.",
    shortSummary: "Shares issued to small group, not public. Not publicly traded. Typically below threshold — most vendors defer to QIR.",
    recognitionTiming: "Announcement or effective date (often less public)",
    adjustmentTiming: "Next QIR (most vendors) or immediate if material",
    thresholds: [
      { vendor: "MSCI", value: "Private placements deferred to QIR unless ≥5% change", note: "No PAF needed" },
      { vendor: "S&P DJI", value: "No minimum — applied on completion if unconditional", note: "" },
      { vendor: "FTSE Russell", value: "Treated as extraordinary if ≥1% cumulative", note: "" },
      { vendor: "STOXX", value: "Per methodology", note: "" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Private placement announced to select investors (often no public notice)", who: ["MSCI: monitor. Others: vary."] },
      { phase: "Completion", what: "Shares issued when deal closes", who: ["All vendors: effective date"] },
      { phase: "QIR", what: "Most vendors apply at next quarterly review if below threshold", who: ["MSCI: QIR. FTSE: extraordinary if ≥1%."] },
    ],
    keyTerms: ["Private Placement", "Primary Offering", "QIR"],
    criticalRule: "Private placements are typically NOT adjusted immediately (unlike public secondaries) unless they cause a ≥5% change in shares outstanding. Deferred to QIR.",
    comparisonFields: [
      { label: "Immediate Adj", values: { MSCI: "Only if ≥5% shares", "S&P DJI": "On completion", "FTSE Russell": "Only if ≥1% extraordinary", STOXX: "Per methodology", Solactive: "Per methodology", Morningstar: "Materiality", VettaFi: "N/A" } },
      { label: "QIR Deferred", values: { MSCI: "Yes (<5%)", "S&P DJI": "No", "FTSE Russell": "Yes (<1%)", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
  {
    id: "spin-off",
    name: "Spin-Off / Demerger",
    badge: "mandatory",
    parentCategory: "Corporate Structure",
    summary: "Separation of a division or subsidiary into a standalone company, distributed to existing shareholders of the parent.",
    shortSummary: "Parent distributes child shares to parent shareholders. Parent price drops. Child added if eligible. Key differences: zero vs estimated price on ex-date.",
    recognitionTiming: "Announcement date (terms finalized)",
    adjustmentTiming: "Ex-date for parent adjustment; child added after grace period or when trading",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces spin-off: ratio, distribution date, child entity details", who: ["All vendors"] },
      { phase: "Last Cum-Date", what: "Last day parent shares trade with spin-off entitlement", who: ["All vendors"] },
      { phase: "Ex-Date (Parent)", what: "Parent price drops by distribution value. Child: if trading → added; if not → grace period.", who: ["FTSE, MSCI, Solactive: market price. S&P: ZERO price. Morningstar: zero."] },
      { phase: "Grace Period", what: "Child trades but not yet distributed. Carried in index at estimated or zero price.", who: ["S&P: 20 days. FTSE: 20 business days. Morningstar: 40 days (60 India)."] },
      { phase: "Distribution / Pay Date", what: "Child shares officially distributed to shareholders", who: ["Company"] },
      { phase: "Deletion / Final Add", what: "Child added at market price; parent divisor adjusted", who: ["All vendors"] },
    ],
    keyTerms: ["When-Issuued", "Ex-Date", "Grace Period", "Divisor Adjustment"],
    criticalRule: "S&P DJI and Morningstar set child price to ZERO on ex-date. FTSE uses estimated price. MSCI uses when-issued/market price. This is the most divergent treatment across vendors.",
    comparisonFields: [
      { label: "Parent Price Adj", values: { MSCI: "Deducted (dist. value)", "S&P DJI": "No adj on ex-date", "FTSE Russell": "Deducted (dist. value)", STOXX: "Spin-off value deducted", Solactive: "Yes", Morningstar: "Deducted (dist. value)", VettaFi: "N/A" } },
      { label: "Child Ex-Date Price", values: { MSCI: "Market/zero", "S&P DJI": "ZERO on ex-date ⚠️", "FTSE Russell": "Estimated if not trading", STOXX: "Market price", Solactive: "—", Morningstar: "Zero price ⚠️", VettaFi: "N/A" } },
      { label: "Grace Period", values: { MSCI: "None", "S&P DJI": "20 days", "FTSE Russell": "20 business days", STOXX: "None", Solactive: "—", Morningstar: "40 days (India: 60)", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
  {
    id: "merger",
    name: "Mergers & Acquisitions",
    badge: "mandatory",
    parentCategory: "M&A",
    summary: "Acquisition or merger where one company absorbs another. Target is deleted; acquirer adjusted per terms.",
    shortSummary: "Target deleted. Acquirer shares adjusted per exchange ratio. Divisor adjusted. Notice period and deletion threshold vary by vendor.",
    recognitionTiming: "Deal announcement (effective on completion)",
    adjustmentTiming: "Effective date (deletion + acquirer adjustment)",
    thresholds: [
      { vendor: "MSCI", value: "When deal is unconditional" },
      { vendor: "S&P DJI", value: "Float <15% OR ≥90% acceptance" },
      { vendor: "FTSE Russell", value: "≥90% held OR Float <5%" },
      { vendor: "STOXX", value: "≥85% acquired OR Float <10%" },
      { vendor: "Solactive", value: "When effective" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Deal announced: exchange ratio, conditions, timeline", who: ["All vendors monitor"] },
      { phase: "Conditions Met", what: "Deal becomes unconditional / shareholder approval received", who: ["All vendors track conditions"] },
      { phase: "Effective Date", what: "Target deleted at last traded price. Acquirer shares adjusted per terms. Divisor adjusted.", who: ["All vendors apply on effective date"] },
    ],
    keyTerms: ["Divisor Adjustment", "M&A", "Effective Date"],
    criticalRule: "Deletion thresholds vary significantly: S&P (<15% float OR ≥90% acceptance), FTSE (≥90% held OR <5% float), STOXX (≥85% acquired OR <10% float). S&P's <15% float threshold can trigger deletion before deal closes.",
    comparisonFields: [
      { label: "Deletion Threshold", values: { MSCI: "Deal unconditional", "S&P DJI": "Float <15% OR ≥90% acceptance", "FTSE Russell": "≥90% held OR Float <5%", STOXX: "≥85% acquired OR Float <10%", Solactive: "When effective", Morningstar: "When completed", VettaFi: "N/A" } },
      { label: "Notice Period", values: { MSCI: "—", "S&P DJI": "1–2 business days", "FTSE Russell": "Min T+2", STOXX: "+2 trading days", Solactive: "—", Morningstar: "—", VettaFi: "N/A" } },
      { label: "Acquirer Adjustment", values: { MSCI: "Per terms", "S&P DJI": "Per terms", "FTSE Russell": "Per terms", STOXX: "Adjusted", Solactive: "Adjusted", Morningstar: "Adjusted", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
  {
    id: "tender-offer",
    name: "Tender Offers",
    badge: "voluntary",
    parentCategory: "M&A",
    summary: "A public offer to purchase shares directly from shareholders at a premium, typically to gain control.",
    shortSummary: "Acquirer offers premium to buy shares directly. Threshold-based: when acceptance reaches trigger → target deleted, acquirer added.",
    recognitionTiming: "Offer announcement",
    adjustmentTiming: "On completion (threshold met)",
    thresholds: [
      { vendor: "MSCI", value: "On completion" },
      { vendor: "S&P DJI", value: "≥75% acceptance" },
      { vendor: "FTSE Russell", value: "Min 2 days notice" },
    ],
    timingFlow: [
      { phase: "Offer Launch", what: "Acquirer announces tender offer: price, acceptance threshold, deadline", who: ["All vendors"] },
      { phase: "Threshold Check", what: "As acceptance approaches trigger, vendors prepare for adjustment", who: ["MSCI, S&P, FTSE monitor"] },
      { phase: "Completion", what: "Target deleted. Acquirer added (if eligible). Divisor adjusted.", who: ["All vendors on completion"] },
    ],
    keyTerms: ["Tender Offer", "Voluntary Event"],
    criticalRule: "S&P DJI requires ≥75% acceptance before deleting target. FTSE requires minimum 2 days notice. MSCI applies on completion.",
    comparisonFields: [
      { label: "Replacement Threshold", values: { MSCI: "On completion", "S&P DJI": "≥75% acceptance", "FTSE Russell": "Min 2 days notice", STOXX: "—", Solactive: "—", Morningstar: "—", VettaFi: "N/A" } },
      { label: "Acquirer Added", values: { MSCI: "—", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "—", Solactive: "—", Morningstar: "—", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
  {
    id: "return-of-capital",
    name: "Return of Capital",
    badge: "mandatory",
    parentCategory: "Equity Income",
    summary: "Distribution to shareholders of cash or assets that is not sourced from earnings or retained profits.",
    shortSummary: "Non-income distribution. Treated as special dividend by most vendors. May have different tax treatment.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces return of capital: amount, timing", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Price adjustment applied (special dividend treatment)", who: ["FTSE: price adj. MSCI/S&P/Morningstar: special dividend."] },
    ],
    keyTerms: ["Special Dividend", "Return of Capital"],
    criticalRule: "Most vendors treat as a special dividend (price adjustment on ex-date). FTSE Russell uses a direct price adjustment on the ex-date without creating a dividend line item.",
    comparisonFields: [
      { label: "Treatment", values: { MSCI: "Special dividend", "S&P DJI": "Special dividend", "FTSE Russell": "Price adj on ex-date ⚠️", STOXX: "Price adj", Solactive: "Per methodology", Morningstar: "Special dividend if outside normal", VettaFi: "N/A" } },
      { label: "Timing", values: { MSCI: "Ongoing", "S&P DJI": "Ongoing", "FTSE Russell": "Ongoing", STOXX: "Ongoing", Solactive: "Ongoing", Morningstar: "Ongoing", VettaFi: "N/A" } },
    ],
  },
  {
    id: "bankruptcy",
    name: "Bankruptcy / Delisting",
    badge: "mandatory",
    parentCategory: "M&A",
    summary: "Company fails or is delisted. Shares removed at zero or nominal value.",
    shortSummary: "Company delisted or bankrupt. Removed at zero/last traded price. Divisor adjusted to protect remaining constituents.",
    recognitionTiming: "Delisting announcement or last trading date",
    adjustmentTiming: "Last trading date or effective delisting date",
    thresholds: [],
    timingFlow: [
      { phase: "Last Trading", what: "Security stops trading. Last price recorded.", who: ["All vendors"] },
      { phase: "Removal", what: "Security deleted from index. Divisor adjusted to maintain continuity.", who: ["All vendors"] },
    ],
    keyTerms: ["Delisting", "Bankruptcy"],
    criticalRule: "STOXX unique: removes at 0.0000001 (not zero — avoids division errors). FTSE removes at cash terms if halted. Others use zero or last traded.",
    comparisonFields: [
      { label: "Removal Price", values: { MSCI: "Zero or last traded", "S&P DJI": "Zero (if no primary price)", "FTSE Russell": "Cash terms if halted", STOXX: "0.0000001 ⚠️", Solactive: "Zero", Morningstar: "Zero/nominal", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
];

// ─── Taxonomy Tree ──────────────────────────────────────────────────────────

const PARENT_CATEGORIES = [
  { name: "Equity Income", icon: TrendingUpIcon, color: "text-green-400" },
  { name: "Corporate Structure", icon: ScaleIcon, color: "text-blue-400" },
  { name: "Equity Offerings", icon: AlertTriangleIcon, color: "text-orange-400" },
  { name: "M&A", icon: CheckCircleIcon, color: "text-red-400" },
];

const VENDORS = ["MSCI", "S&P DJI", "FTSE Russell", "STOXX", "Solactive", "Morningstar", "VettaFi"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ variant }: { variant: "mandatory" | "voluntary" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        variant === "mandatory"
          ? "bg-green-500/15 text-green-400"
          : "bg-orange-500/15 text-orange-400"
      }`}
    >
      {variant === "mandatory" ? (
        <CheckCircleIcon className="h-2.5 w-2.5" />
      ) : (
        <AlertTriangleIcon className="h-2.5 w-2.5" />
      )}
      {variant}
    </span>
  );
}

function TimingFlow({ flow }: { flow: EventType["timingFlow"] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-px bg-border" />
      <div className="space-y-4">
        {flow.map((step, i) => (
          <div key={i} className="relative flex gap-4 pl-10">
            <div className="absolute left-3.5 top-1.5 h-1 w-1 rounded-full bg-primary ring-2 ring-background" />
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3">
              <div className="mb-1 text-xs font-semibold text-primary">{step.phase}</div>
              <div className="text-xs text-muted-foreground">{step.what}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {step.who.map((w) => (
                  <span
                    key={w}
                    className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ fields }: { fields: EventType["comparisonFields"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="min-w-[120px] px-3 py-2 text-left font-semibold text-muted-foreground">Field</th>
            {VENDORS.map((v) => (
              <th key={v} className="min-w-[100px] px-2 py-2 text-center font-semibold text-muted-foreground">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((row, ri) => (
            <tr key={row.label} className={`border-b border-border/40 ${ri % 2 === 0 ? "bg-card" : "bg-muted/10"}`}>
              <td className="px-3 py-2 font-medium">{row.label}</td>
              {VENDORS.map((v) => {
                const val = row.values[v] ?? "—";
                const isCritical = val.includes("⚠️");
                return (
                  <td
                    key={v}
                    className={`px-2 py-2 text-center ${isCritical ? "font-semibold text-amber-400" : "text-muted-foreground"}`}
                    title={val}
                  >
                    <span className={isCritical ? "bg-amber-500/10 px-1 rounded" : ""}>
                      {val}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceNote() {
  return (
    <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
      <div className="font-semibold uppercase tracking-wider text-muted-foreground/70">Document Sources</div>
      <div>FTSE Russell — Corporate Actions and Events Guide v6.8 (Oct 2025)</div>
      <div>STOXX — Calculation Guide (Apr 2026)</div>
      <div>S&P Dow Jones Indices — Equity Indices Policies & Practices (Mar 2026)</div>
      <div>Solactive — GPR Global 100 Index Guideline (Mar 2026)</div>
      <div>Morningstar — Corporate Actions Methodology (Jan 2026)</div>
      <div>VettaFi — Corporate Action Initiators Methodology + Index Maintenance Policy (Apr 2026)</div>
      <div>MSCI — Corporate Events Methodology (2026)</div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function VendorDashboard() {
  const [activeId, setActiveId] = useState<string>(EVENT_TYPES[0].id);
  const [activeGlossary, setActiveGlossary] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(PARENT_CATEGORIES.map((c) => c.name))
  );
  const [showGlossary, setShowGlossary] = useState(false);

  const active = EVENT_TYPES.find((e) => e.id === activeId)!;
  const activeGlossaryEntry = GLOSSARY.find((g) => g.term === activeGlossary);

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const eventsByCategory = PARENT_CATEGORIES.map((cat) => ({
    ...cat,
    events: EVENT_TYPES.filter((e) => e.parentCategory === cat.name),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">Index Vendor Intelligence</h1>
              <p className="text-sm text-muted-foreground">
                Corporate Action Methodology · 7 Index Providers · Interactive Reference
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGlossary(!showGlossary)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all ${
                  showGlossary
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <BookOpenIcon className="h-4 w-4" />
                Glossary
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex gap-6">

          {/* ── Left: Taxonomy Sidebar ─────────────────────────────────── */}
          <aside className="w-56 shrink-0">
            <div className="sticky top-24">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Event Taxonomy
              </div>
              <div className="space-y-3">
                {eventsByCategory.map((cat) => (
                  <div key={cat.name}>
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="mb-1 flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    >
                      <cat.icon className={`h-3.5 w-3.5 ${cat.color}`} />
                      <span className="flex-1 text-left">{cat.name}</span>
                      <ChevronRightIcon
                        className={`h-3 w-3 transition-transform ${expandedCategories.has(cat.name) ? "rotate-90" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {expandedCategories.has(cat.name) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-0.5 pl-5">
                            {cat.events.map((evt) => (
                              <button
                                key={evt.id}
                                onClick={() => setActiveId(evt.id)}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all ${
                                  activeId === evt.id
                                    ? "bg-primary text-primary-foreground font-medium"
                                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <ArrowRightIcon
                                  className={`h-2.5 w-2.5 shrink-0 transition-opacity ${
                                    activeId === evt.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <span className="truncate">{evt.name}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Glossary panel in sidebar */}
              <AnimatePresence>
                {showGlossary && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 overflow-hidden"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      All Glossary Terms
                    </div>
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                      {GLOSSARY.map((g) => (
                        <button
                          key={g.term}
                          onClick={() => setActiveGlossary(activeGlossary === g.term ? null : g.term)}
                          className={`w-full text-left rounded-lg px-2 py-1.5 text-xs transition-all ${
                            activeGlossary === g.term
                              ? "bg-amber-500/15 text-amber-300 font-medium"
                              : "hover:bg-accent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {g.term}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>

          {/* ── Center: Main Content ────────────────────────────────────── */}
          <main className="min-w-0 flex-1">

            {/* Event Header */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <Badge variant={active.badge} />
                <span className="text-sm text-muted-foreground">{active.parentCategory}</span>
              </div>
              <h2 className="mb-2 text-2xl font-bold">{active.name}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{active.summary}</p>
            </div>

            {/* Recognition vs Adjustment callout */}
            <div className="mb-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                  <BellIcon className="h-3.5 w-3.5" />
                  When Vendor Recognises
                </div>
                <div className="text-sm font-medium">{active.recognitionTiming}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Vendor becomes aware and logs the event
                </div>
              </div>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-400">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  When Adjustment Applied
                </div>
                <div className="text-sm font-medium">{active.adjustmentTiming}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Price/shares actually adjusted in the index
                </div>
              </div>
            </div>

            {/* Critical Rule */}
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
                <AlertTriangleIcon className="h-4 w-4" />
                Critical Rule to Watch
              </div>
              <p className="text-sm leading-relaxed">{active.criticalRule}</p>
            </div>

            {/* Thresholds */}
            {active.thresholds.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Threshold Rules</h3>
                <div className="space-y-2">
                  {active.thresholds.map((t) => (
                    <div
                      key={t.vendor}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <span className="min-w-[90px] text-xs font-semibold text-muted-foreground">{t.vendor}</span>
                      <span className="flex-1 text-xs text-foreground">{t.value}</span>
                      {t.note && (
                        <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          {t.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timing Flow */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold">Timing Flow</h3>
              <TimingFlow flow={active.timingFlow} />
            </div>

            {/* Key Terms */}
            {active.keyTerms.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Key Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {active.keyTerms.map((term) => {
                    const entry = GLOSSARY.find((g) => g.term === term);
                    if (!entry) return null;
                    return (
                      <button
                        key={term}
                        onClick={() => setActiveGlossary(activeGlossary === term ? null : term)}
                        className={`rounded-full border px-3 py-1 text-xs transition-all ${
                          activeGlossary === term
                            ? "border-amber-400 bg-amber-500/20 text-amber-300"
                            : "border-amber-500/40 bg-amber-500/5 text-amber-400 hover:border-amber-400"
                        }`}
                      >
                        {term}
                      </button>
                    );
                  })}
                </div>
                {/* Inline glossary definition */}
                <AnimatePresence>
                  {activeGlossary && activeGlossaryEntry && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 overflow-hidden rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
                    >
                      <div className="mb-1 text-sm font-bold text-amber-300">
                        {activeGlossaryEntry.term}
                      </div>
                      <div className="mb-2 text-sm text-foreground">
                        {activeGlossaryEntry.definition}
                      </div>
                      {activeGlossaryEntry.detail && (
                        <div className="text-xs text-muted-foreground">
                          {activeGlossaryEntry.detail}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Vendor Comparison Table */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold">Vendor Comparison</h3>
              <div className="rounded-2xl border border-border overflow-hidden">
                <ComparisonTable fields={active.comparisonFields} />
              </div>
            </div>

            {/* Source Notes */}
            <SourceNote />
          </main>

          {/* ── Right: Quick Reference Rail ─────────────────────────────── */}
          <aside className="w-48 shrink-0">
            <div className="sticky top-24 space-y-4">

              {/* Legend */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cell Legend
                </div>
                <div className="space-y-2">
                  {[
                    { color: "bg-amber-400", label: "Critical rule", desc: "Unique or divergent" },
                    { color: "bg-orange-400", label: "Threshold", desc: "Numeric/detail" },
                    { color: "bg-green-400", label: "Confirmed", desc: "Applied/adjusted" },
                    { color: "bg-muted-foreground/30", label: "N/A", desc: "Not applicable" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2 text-[11px]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${l.color}`} />
                      <div>
                        <span className="font-medium">{l.label}</span>
                        <span className="ml-1 text-muted-foreground">{l.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timing Summary */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recognition vs Adjustment
                </div>
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <BellIcon className="h-3 w-3 text-blue-400" />
                  <span className="text-muted-foreground">Recognise:</span>
                  <span className="font-medium">{active.recognitionTiming}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CalendarIcon className="h-3 w-3 text-green-400" />
                  <span className="text-muted-foreground">Adjust:</span>
                  <span className="font-medium">{active.adjustmentTiming}</span>
                </div>
              </div>

              {/* Quick Hits */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Hits
                </div>
                <div className="space-y-2 text-[11px] text-muted-foreground">
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    STOXX: No special div distinction
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    STOXX: Secondaries = divisor only
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    S&P: Zero spin-off price on ex-date
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    VettaFi: Special div → PR index
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    FTSE: 3 temp lines for nil-paid rights
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    S&P: Dual threshold 5% + $150M
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    STOXX: Delist at 0.0000001
                  </div>
                </div>
              </div>

              {/* Doc Versions */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Doc Versions
                </div>
                <div className="space-y-1.5 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>FTSE</span><span className="font-medium text-foreground">v6.8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>STOXX</span><span className="font-medium text-foreground">Apr 26</span>
                  </div>
                  <div className="flex justify-between">
                    <span>S&P</span><span className="font-medium text-foreground">Mar 26</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Solactive</span><span className="font-medium text-foreground">Mar 26</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Morningstar</span><span className="font-medium text-foreground">Jan 26</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VettaFi</span><span className="font-medium text-foreground">Apr 26</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MSCI</span><span className="font-medium text-foreground">2026</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>Last updated: 2026-04-17 · All 7 vendor documents referenced</div>
            <div>React 19 · Tailwind v4 · Framer Motion</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
