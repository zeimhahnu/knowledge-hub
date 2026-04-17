"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  ScaleIcon,
  TrendingUpIcon,
} from "lucide-react";

// ─── Glossary with tooltips ─────────────────────────────────────────────────

type GEntry = { term: string; definition: string; detail?: string };

const GLOSSARY: GEntry[] = [
  {
    term: "In-the-Money (ITM)",
    definition: "Rights issue where the subscription price is below the current market price.",
    detail: "The rights have real value. A rational investor exercises them. All major vendors adjust for ITM rights because an index tracker must either exercise or sell the rights to minimise tracking error.",
  },
  {
    term: "Out-of-the-Money (OTM)",
    definition: "Rights issue where the subscription price equals or exceeds market price.",
    detail: "No rational investor exercises OTM rights. Index trackers ignore OTM rights. Most vendors do not adjust.",
  },
  {
    term: "Nil-Paid Rights",
    definition: "Rights that trade separately from parent shares before the subscription period opens.",
    detail: "FTSE Russell creates 3 temporary lines: (1) nil-paid rights, (2) call dummy, (3) new shares. This allows price discovery before shareholders must pay the subscription price.",
  },
  {
    term: "PAF",
    definition: "Price Adjustment Factor — the theoretical ex-date price after a corporate action.",
    detail: "Formula: PAF = (CumPrice - DistributionValue) / CumPrice. Applied on ex-date to ensure the Laspeyres index remains continuous.",
  },
  {
    term: "Divisor",
    definition: "A scaling number that keeps the index level continuous when market cap changes.",
    detail: "Index = TotalMarketCap / Divisor. When shares are added without a price change, the divisor is adjusted instead — so the index level does not jump.",
  },
  {
    term: "QIR",
    definition: "Quarterly Index Review — a scheduled rebalance where index composition is updated.",
    detail: "Below-threshold events accumulate until the next QIR. MSCI, S&P, FTSE, STOXX: Quarterly (Mar/Jun/Sep/Dec). Solactive GPR Global 100: SEMI-ANNUAL.",
  },
  {
    term: "Ongoing",
    definition: "Applied immediately on the corporate action effective or ex-date, outside of scheduled reviews.",
    detail: "Most significant events (dividends, splits, M&A completions) are Ongoing — applied as soon as confirmed.",
  },
  {
    term: "PR Index",
    definition: "Price Return index — reflects price changes only. Dividends are NOT reinvested.",
    detail: "The base index. When a stock goes ex-dividend, the PR index falls by the dividend amount because that value left the company.",
  },
  {
    term: "TR Index",
    definition: "Total Return index — price changes plus gross dividends reinvested on ex-date.",
    detail: "The dividend paid by the company is reinvested into the index on the ex-date. TR is always >= PR on ex-div dates.",
  },
  {
    term: "NTR Index",
    definition: "Net Total Return index — dividends reinvested net of withholding tax.",
    detail: "Used for indices sold to non-domestic investors. NTR is always <= TR due to tax withheld at source.",
  },
  {
    term: "Ex-Date",
    definition: "The first day a security trades without the benefit of the corporate action.",
    detail: "Traders who buy on ex-date do not receive the dividend or rights. Price typically drops by the action value on this date.",
  },
  {
    term: "Cum-Date",
    definition: "The last day a buyer receives the corporate action entitlement.",
    detail: "In T+2 settlement markets, cum-date is 2 business days before the record date.",
  },
  {
    term: "TERP",
    definition: "Theoretical Ex-Rights Price — expected market price after a rights issue is fully subscribed.",
    detail: "Formula: TERP = (OldMktCap + NewShares x SubscriptionPrice) / (OldShares + NewShares). Used by MSCI/S&P to validate whether a rights issue is in-the-money.",
  },
  {
    term: "When-Issuued",
    definition: "Trading of a security before its official distribution date.",
    detail: "Used in spin-offs: when-issued Company B trades before the distribution date. MSCI uses this price for spin-off inclusions.",
  },
  {
    term: "Placeholder",
    definition: "A temporary zero-value line in the index for a spin-off company that has not yet started trading.",
    detail: "MSTAR and S&P use this approach: Company B is added at zero price until it begins trading at a real market price.",
  },
  {
    term: "Grace Period",
    definition: "A window after the ex-date during which a spin-off child is held at a temporary price.",
    detail: "S&P: 20 days. FTSE Russell: 20 business days. Morningstar: 40 days (60 for India). During this period the child is in the index at zero or estimated price.",
  },
  {
    term: "Mandatory Event",
    definition: "A corporate action that is automatically processed because it is confirmed by the company.",
    detail: "Cash dividends, stock splits, mergers (unconditional), bonus issues, spin-offs, return of capital, bankruptcy — all confirmed facts. No discretion by the vendor.",
  },
  {
    term: "Voluntary Event",
    definition: "A corporate action where participation depends on a shareholder decision.",
    detail: "Rights issues (exercise or lapse), tender offers (accept or do not), secondary offerings. Vendor adjusts only if confirmed and above threshold.",
  },
  {
    term: "Primary Offering",
    definition: "Issuance of new shares by a company to raise capital directly for the issuer.",
    detail: "All new shares go to the company. Dilutive to existing shareholders because total shares increase.",
  },
  {
    term: "Secondary Offering",
    definition: "Sale of existing shares by current shareholders to new investors. No new shares issued.",
    detail: "Pure transfer of ownership. No dilution to per-share metrics. May affect free float if a large block is sold.",
  },
  {
    term: "Private Placement",
    definition: "Issuance of new shares to a select group of investors — not publicly offered or immediately tradeable.",
    detail: "Because the event is not fully public and may not complete, most vendors defer adjustment to the next QIR unless the size is material (>=5%). The change in shares outstanding still matters for index weight.",
  },
  {
    term: "Change in Shares Outstanding",
    definition: "A change in the total number of shares a company has issued.",
    detail: "In a private placement, new shares are issued to a small group. Total shares outstanding increase. This changes the company's weight in a market-cap-weighted index.",
  },
  {
    term: "Extraordinary",
    definition: "An event large enough to warrant an immediate out-of-schedule index adjustment.",
    detail: "STOXX and FTSE use extraordinary to mean: applied immediately upon confirmation, not deferred to QIR. Below extraordinary threshold -> deferred to next review.",
  },
  {
    term: "Special Dividend",
    definition: "A dividend outside the normal recurring pattern — often from a one-time event.",
    detail: "Treated differently by most vendors: PAF is applied to the PR index. STOXX uniquely makes NO distinction — special dividends treated identically to ordinary dividends.",
  },
  {
    term: "Return of Capital",
    definition: "A distribution to shareholders from invested capital or asset sales — not from earnings.",
    detail: "Not income. Treated as a special dividend by most vendors. FTSE Russell treats it as a direct price adjustment on the ex-date.",
  },
  {
    term: "Spin-Off",
    definition: "Separation of a subsidiary into a standalone entity distributed to parent shareholders.",
    detail: "Parent price drops by approximately the distribution value on the ex-date. Key divergence: S&P and Morningstar use zero price on ex-date; FTSE uses estimated; MSCI uses when-issued or market price.",
  },
  {
    term: "Highly Dilutive Rights Issue (HDRI)",
    definition: "A rights issue that would increase shares by more than 10%, dramatically reducing the subscription price.",
    detail: "STOXX triggers HDRI safeguards if the impact exceeds 5% of market capitalisation. Creates additional temporary lines to manage pricing discontinuity.",
  },
  {
    term: "Detached Security",
    definition: "MSCI term for a spin-off child distributed but not yet formally added to the index.",
    detail: "MSCI adds the child as detached on the distribution date, carrying it at the when-issued or estimated price. Replaced with actual market price when trading begins.",
  },
  {
    term: "When-Issued Price",
    definition: "The price at which a security trades before it is officially issued or distributed.",
    detail: "In spin-offs, when-issued Company B begins trading before the actual distribution date. Provides a market-determined price for the child before shareholders receive shares.",
  },
  {
    term: "Divisor Adjustment",
    definition: "A change to the index divisor (not price) to maintain index continuity.",
    detail: "Used when market cap changes but price should not be directly adjusted — e.g., mergers, spin-offs, or when a company adds shares without a corresponding price change.",
  },
  {
    term: "Materiality Threshold",
    definition: "A minimum size below which an event is deferred to the next Quarterly Index Review.",
    detail: "Each vendor sets materiality differently. Below threshold = accumulated and applied at QIR. Above = applied immediately (Ongoing). This is the primary source of projection gaps.",
  },
  {
    term: "Effective Date",
    definition: "The date a corporate action is officially processed and reflected in company records.",
    detail: "May differ from ex-date. In a merger, the effective date is when the deal closes and the target is legally absorbed.",
  },
  {
    term: "Announcement Lag",
    definition: "The time between when a company announces an event and when all vendors have received and processed it.",
    detail: "Different vendors have different data feeds and processing speeds. This is a common and legitimate source of temporary projection gaps.",
  },
  {
    term: "Conditional vs Unconditional",
    definition: "Whether a corporate action has received all necessary approvals.",
    detail: "A merger is CONDITIONAL until shareholder approval, regulatory clearance, etc. are complete. When all conditions are met it becomes UNCONDITIONAL — at which point S&P DJI applies the adjustment immediately.",
  },
];

// ─── Glossary tooltip (hover) ────────────────────────────────────────────────

function GlossaryTerm({ term }: { term: string }) {
  const entry = GLOSSARY.find((g) => g.term === term);
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!entry) return <span>{term}</span>;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => {
        timeoutRef.current = setTimeout(() => setShow(true), 200);
      }}
      onMouseLeave={() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShow(false);
      }}
    >
      <span className="cursor-help border-b border-dashed border-amber-400/60 text-amber-400 hover:border-amber-400 hover:bg-amber-400/10">
        {term}
      </span>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-amber-500/40 bg-[oklch(0.15_0.015_260)] p-4 shadow-2xl"
          >
            <div className="mb-1 text-sm font-bold text-amber-300">{entry.term}</div>
            <div className="mb-2 text-xs text-foreground">{entry.definition}</div>
            {entry.detail && (
              <div className="rounded-lg bg-black/20 p-2.5 text-xs leading-relaxed text-muted-foreground">
                {entry.detail}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ─── Event data ───────────────────────────────────────────────────────────────

type ComparisonField = { label: string; values: Record<string, string> };

type EventType = {
  id: string;
  name: string;
  badge: "mandatory" | "voluntary";
  category: string;
  summary: string;
  whyNoAdj?: string;
  whyAdj?: string;
  recognitionTiming: string;
  adjustmentTiming: string;
  thresholds: { vendor: string; value: string; note?: string }[];
  timingFlow: { phase: string; what: string; who: string[] }[];
  keyTerms: string[];
  criticalRule: string;
  comparisonFields: ComparisonField[];
};

const EVENTS: EventType[] = [
  {
    id: "cash-dividend",
    name: "Cash Dividend",
    badge: "mandatory",
    category: "Equity Income",
    summary: "Cash paid by a company to its shareholders, pro-rata to shareholding.",
    whyNoAdj: "The dividend value leaves the company and is paid to shareholders. The company's market cap decreases by exactly the dividend amount — so the index divisor absorbs it. No separate price adjustment is needed in the PR index. The TR/NTR index reinvests the dividend on ex-date.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date (TR/NTR dividend points reinvested — no PAF in PR)",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces dividend: amount, record date, ex-date, pay date", who: ["All vendors monitor"] },
      { phase: "Ex-Date", what: "Price drops by dividend in market. PR: no adjustment. TR/NTR: dividend reinvested.", who: ["All vendors: same treatment"] },
    ],
    keyTerms: ["Ex-Date", "PR Index", "TR Index", "NTR Index", "Divisor"],
    criticalRule: "All vendors treat ordinary cash dividends identically: NO price adjustment in the PR index. This is universal and fundamental — the dividend is already reflected in the price drop on ex-date.",
    comparisonFields: [
      { label: "PR Index", values: { MSCI: "No PAF", "S&P DJI": "No PAF", "FTSE Russell": "No PAF", STOXX: "No PAF", Solactive: "No PAF", Morningstar: "No PAF", VettaFi: "No PAF" } },
      { label: "Divisor Change", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "No" } },
      { label: "TR/NTR Reinvested", values: { MSCI: "Yes (gross/net)", "S&P DJI": "Yes (gross/net)", "FTSE Russell": "Yes (gross/net)", STOXX: "Yes (gross/net)", Solactive: "Yes", Morningstar: "Yes (gross/net)", VettaFi: "Yes" } },
      { label: "Timing", values: { MSCI: "Ongoing", "S&P DJI": "Ongoing", "FTSE Russell": "Ongoing", STOXX: "Ongoing", Solactive: "Ongoing", Morningstar: "Ongoing", VettaFi: "Ongoing" } },
    ],
  },
  {
    id: "special-dividend",
    name: "Special Dividend",
    badge: "mandatory",
    category: "Equity Income",
    summary: "A non-recurring dividend from accumulated profits or a one-time event (e.g., asset sale).",
    whyAdj: "A special dividend is NOT from normal operations. If it is not deducted from the price, an index tracker would hold shares worth less without the adjustment being reflected — creating tracking error. The PAF deducts the distribution value on ex-date.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date (PAF applied to PR if threshold met)",
    thresholds: [
      { vendor: "MSCI", value: ">=5% of market price = special; <5% = ordinary", note: "Threshold avoids adjusting for trivial amounts" },
      { vendor: "S&P DJI", value: "1st and 2nd consecutive = special; 3rd = last special; 4th+ = ordinary", note: "Recurrence-based — rewards consistent special dividends" },
      { vendor: "FTSE Russell", value: "1st-3rd = special; 4th+ consecutive = ordinary", note: "More generous — 3 free passes before treating as ordinary" },
      { vendor: "STOXX", value: "NO distinction — same as ordinary dividends", note: "Unique: STOXX does not differentiate special from ordinary" },
      { vendor: "Morningstar", value: ">=5% of market price = special (from Aug 2024); <5% = ordinary", note: "MSCI-style threshold, introduced Aug 2024" },
      { vendor: "VettaFi", value: "Special dividends applied to PR index — UNIQUE", note: "Only vendor that adjusts PR for special dividends" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Company announces special dividend. Vendor checks threshold and recurrence.", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Price drops by distribution value. PR adjusted if threshold met. TR/NTR always reinvested.", who: ["MSCI, S&P, FTSE, Morningstar: PAF if above threshold. STOXX: same as ordinary. VettaFi: always adjusted."] },
    ],
    keyTerms: ["PAF", "PR Index", "Special Dividend", "Divisor"],
    criticalRule: "STOXX makes NO distinction — special dividends treated identically to ordinary. VettaFi adjusts PR for special dividends, which is unique. FTSE gives 3 free passes before classifying as ordinary.",
    comparisonFields: [
      { label: "Threshold / Rule", values: { MSCI: ">=5% market price", "S&P DJI": "1st-2nd consec.; 3rd = last", "FTSE Russell": "1st-3rd; 4th+ ordinary", STOXX: "No distinction", Solactive: "Case-by-case", Morningstar: ">=5% (Aug 2024+)", VettaFi: "Always adjusted" } },
      { label: "PR Adjusted", values: { MSCI: "Yes if >=5%", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes (same)", Solactive: "Yes", Morningstar: "Yes if >=5%", VettaFi: "Yes + PR" } },
      { label: "Formula", values: { MSCI: "PAF=(CumPx-Div)/CumPx", "S&P DJI": "Standard PAF", "FTSE Russell": "Deducted from price", STOXX: "Same as regular", Solactive: "Per methodology", Morningstar: "PAF=(PxEx-1-GrossSpecDiv)/PxEx-1", VettaFi: "Standard" } },
    ],
  },
  {
    id: "bonus-issue",
    name: "Bonus Issue",
    badge: "mandatory",
    category: "Corporate Structure",
    summary: "Free additional shares issued to all existing shareholders, funded by retained earnings or share premium.",
    whyNoAdj: "No value leaves the company. It is a reclassification of equity: retained earnings become share capital. Total market cap is unchanged. More shares, lower price, same total value. No divisor change needed because market cap per share (price) is maintained proportionally.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces bonus issue ratio and effective date", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Shares increase pro-rata. Price drops proportionally. Market cap unchanged. No divisor change.", who: ["All vendors: identical treatment"] },
    ],
    keyTerms: ["Ex-Date", "Divisor"],
    criticalRule: "Identical across all vendors. Market cap unchanged — only per-share metrics change. No adjustment to price or divisor.",
    comparisonFields: [
      { label: "Price Adjustment", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "N/A" } },
      { label: "Shares", values: { MSCI: "x bonus ratio", "S&P DJI": "x bonus ratio", "FTSE Russell": "x bonus ratio", STOXX: "x bonus ratio", Solactive: "x bonus ratio", Morningstar: "x bonus ratio", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "N/A" } },
    ],
  },
  {
    id: "stock-split",
    name: "Stock Split / Consolidation",
    badge: "mandatory",
    category: "Corporate Structure",
    summary: "A proportional change in shares: split (more shares, lower price) or consolidation (fewer, higher price).",
    whyNoAdj: "Same logic as bonus issue. Total market cap is unchanged. Splitting 1 share into 2 at double the price means the company is worth exactly the same. Pure reclassification. Price adjustment exactly cancels the share increase. Index level stays constant.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces split ratio and effective date", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Shares x split ratio. Price / split ratio. No divisor change.", who: ["All vendors: identical"] },
    ],
    keyTerms: ["Ex-Date", "Divisor"],
    criticalRule: "All vendors apply identically. Shares x ratio, Price / ratio, Divisor unchanged. No tracking error from a split — the math is exact.",
    comparisonFields: [
      { label: "Shares", values: { MSCI: "x split ratio", "S&P DJI": "x split ratio", "FTSE Russell": "x split ratio", STOXX: "x split ratio", Solactive: "x split ratio", Morningstar: "x split ratio", VettaFi: "x split ratio" } },
      { label: "Price", values: { MSCI: "/ split ratio", "S&P DJI": "/ split ratio", "FTSE Russell": "/ split ratio", STOXX: "/ split ratio", Solactive: "/ split ratio", Morningstar: "/ split ratio", VettaFi: "/ split ratio" } },
      { label: "Divisor Change", values: { MSCI: "No", "S&P DJI": "No", "FTSE Russell": "No", STOXX: "No", Solactive: "No", Morningstar: "No", VettaFi: "No" } },
    ],
  },
  {
    id: "rights-issue",
    name: "Rights Issue",
    badge: "voluntary",
    category: "Equity Offerings",
    summary: "Issuance of rights to existing shareholders to subscribe to new shares at a discounted price.",
    whyAdj: "If the rights are in-the-money, their value must be reflected in the parent price on ex-date. An index tracker that does not adjust would see its parent holding lose value (the right expired worthless) without compensation — tracking error.",
    recognitionTiming: "Announcement date (ITM confirmed on ex-date)",
    adjustmentTiming: "Ex-date for ITM; no adjustment for OTM",
    thresholds: [
      { vendor: "MSCI", value: "In-the-money: adjust. Out-of-the-money: no adjustment.", note: "TERP used to determine if sub price < market = in-the-money" },
      { vendor: "S&P DJI", value: "In-the-money: value of rights formula + shares. OTM: no adj.", note: "S&P explicitly assumes rational investors exercise ITM rights" },
      { vendor: "FTSE Russell", value: "If at a discount to market price: adjust. Creates 3 temp lines for nil-paid rights.", note: "FTSE nil-paid rights handling is the most complex of all vendors" },
      { vendor: "STOXX", value: "Standard: adjust. HDRI if >5% market cap impact: special safeguards.", note: "HDRI = Highly Dilutive Rights Issue — >5% mkt cap dilution triggers additional logic" },
      { vendor: "Solactive", value: "In-the-money: adjust. Out-of-the-money: no adjustment.", note: "Consistent with MSCI approach" },
      { vendor: "Morningstar", value: "In-the-money: TERP + shares adjusted. OTM: no adjustment.", note: "Uses TERP to determine ITM/OTM status" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Company announces rights: subscription price, ratio, deadline. Vendor checks TERP.", who: ["All vendors monitor"] },
      { phase: "Ex-Date — ITM Check", what: "Sub price + dividend >= market -> IN-THE-MONEY: all adjust. Below -> OTM: MSCI/S&P/Morningstar no adj.", who: ["MSCI, S&P, Morningstar: OTM = no adj. FTSE: adjust if at discount."] },
      { phase: "Subscription Period", what: "Nil-paid rights trade. FTSE creates 3 temp lines: nil-paid rights, call dummy, new shares.", who: ["FTSE only: most complex handling"] },
      { phase: "Post-Subscription", what: "New shares added. Acquirer shares adjusted. Divisor changes.", who: ["All vendors that adjusted"] },
    ],
    keyTerms: ["In-the-Money (ITM)", "Out-of-the-Money (OTM)", "Nil-Paid Rights", "TERP", "Highly Dilutive Rights Issue (HDRI)", "PAF"],
    criticalRule: "ITM vs OTM is the key test. OTM rights: rational investor lets them lapse — no value is lost. FTSE uniquely adjusts even for OTM if the rights are at a discount. FTSE 3-temp-line approach for nil-paid rights is the most complex treatment.",
    comparisonFields: [
      { label: "ITM Adjustment", values: { MSCI: "PAF + shares", "S&P DJI": "Value of rights formula", "FTSE Russell": "At discount + 3 temp lines", STOXX: "Standard + HDRI safeguard", Solactive: "Per methodology", Morningstar: "TERP + shares", VettaFi: "N/A" } },
      { label: "OTM Adjustment", values: { MSCI: "No adjustment", "S&P DJI": "No adjustment", "FTSE Russell": "Adjust if at discount", STOXX: "No adjustment", Solactive: "No adjustment", Morningstar: "No adjustment", VettaFi: "N/A" } },
      { label: "Temp Lines", values: { MSCI: "None", "S&P DJI": "2 lines", "FTSE Russell": "3 lines — most complex", STOXX: "None", Solactive: "None", Morningstar: "None", VettaFi: "N/A" } },
    ],
  },
  {
    id: "secondary-offering",
    name: "Secondary Offering",
    badge: "voluntary",
    category: "Equity Offerings",
    summary: "Sale of existing shares by current shareholders to new investors. No new shares issued.",
    whyAdj: "Secondary offerings are dilutive to the index weight even without new shares — a large block sold into the market can depress the price. The PAF adjusts the price to reflect the market impact. STOXX uniquely disagrees: they adjust the divisor only, reasoning that the market price impact is self-correcting.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date if above threshold",
    thresholds: [
      { vendor: "MSCI", value: ">=5% of issued shares -> immediate; <5% -> accumulated to QIR", note: "5% is the primary threshold — below it deferred regardless of dollar value" },
      { vendor: "S&P DJI", value: ">=5% of issued shares AND >=USD150M market value — BOTH must be met", note: "Dual threshold: 5% alone insufficient. $150M floor prevents large-price-small-percentage events slipping through" },
      { vendor: "FTSE Russell", value: ">1% cumulative per quarter -> quarterly review. Extraordinary events: immediate.", note: "1% is the lowest threshold — catches more events but defers most to QIR" },
      { vendor: "STOXX", value: "+/-10% extraordinary -> immediate. Below: next quarterly review.", note: "10% threshold is highest — only truly large events trigger immediate. Price adjustment: NO — divisor ONLY" },
      { vendor: "Solactive", value: "Per ex-date announcement. Materiality assessment.", note: "Applied when confirmed per methodology" },
      { vendor: "Morningstar", value: "Materiality assessment. No explicit percentage threshold.", note: "Subjective — leaves room for interpretation" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Company announces offering type and size. Vendor checks thresholds.", who: ["All vendors"] },
      { phase: "Above Threshold", what: "Ex-date: price adjustment applied. Divisor adjusted. Index weight updated.", who: ["MSCI, S&P, FTSE, Solactive, Morningstar: PAF applied. STOXX: divisor ONLY."] },
      { phase: "Below Threshold", what: "Event accumulated to next QIR. No immediate adjustment.", who: ["MSCI, S&P, FTSE, STOXX: QIR. Solactive, Morningstar: varies."] },
    ],
    keyTerms: ["Primary Offering", "Secondary Offering", "Private Placement", "PAF", "QIR", "Divisor Adjustment", "Extraordinary"],
    criticalRule: "STOXX is unique: it adjusts the divisor only and does NOT apply a price adjustment for secondary offerings. S&P requires BOTH >=5% shares AND >=$150M — dual threshold means smaller large-cap secondaries may be deferred.",
    comparisonFields: [
      { label: "Threshold", values: { MSCI: ">=5% of shares", "S&P DJI": ">=5% AND >=$150M", "FTSE Russell": ">1% cumulative quarterly", STOXX: "+/-10% extraordinary", Solactive: "Per announcement", Morningstar: "Materiality", VettaFi: "N/A" } },
      { label: "Price Adjustment", values: { MSCI: "PAF applied", "S&P DJI": "PAF applied", "FTSE Russell": "If decided by committee", STOXX: "NO price adj — divisor only", Solactive: "PAF applied", Morningstar: "PAF applied", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes (primary method)", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
  {
    id: "private-placement",
    name: "Private Placement",
    badge: "voluntary",
    category: "Equity Offerings",
    summary: "Issuance of new shares to a select group of investors — not publicly offered or immediately tradeable.",
    whyAdj: "Private placements are not fully public events. Shares may be subject to lock-up periods and cannot be freely traded. Because the event may not complete, most vendors defer adjustment to the next QIR unless the size is material (>=5% of shares outstanding). The change in shares outstanding still matters because it affects the company's index weight.",
    recognitionTiming: "Announcement or effective date",
    adjustmentTiming: "Next QIR (unless >=5% — then immediate)",
    thresholds: [
      { vendor: "MSCI", value: "Deferred to QIR unless >=5% change in shares outstanding.", note: "The key metric is change in shares outstanding — not percentage of market cap. A placement at premium still changes index weight." },
      { vendor: "S&P DJI", value: "Applied on completion if unconditional. No minimum threshold.", note: "S&P applies immediately on completion — unlike MSCI which defers most private placements to QIR" },
      { vendor: "FTSE Russell", value: "Treated as extraordinary if >=1% cumulative per quarter.", note: "Same as secondary offerings — the 1% threshold catches private placements too" },
      { vendor: "STOXX", value: "Per methodology — extraordinary threshold applies (+/-10% market cap impact).", note: "STOXX 10% extraordinary threshold means most private placements are deferred to quarterly review" },
      { vendor: "Solactive", value: "Per methodology — applied when confirmed.", note: "Consistent with their general approach" },
      { vendor: "Morningstar", value: "Materiality assessment.", note: "Subjective — no explicit threshold documented" },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Private placement announced. Shares issued to select group (not public).", who: ["All vendors: monitoring"] },
      { phase: "Completion", what: "Deal closes. Shares transferred. Change in shares outstanding confirmed.", who: ["All vendors"] },
      { phase: "Threshold Check", what: "Vendor checks if size exceeds immediate adjustment threshold.", who: ["Above: immediate. Below: deferred to QIR."] },
      { phase: "QIR (if below)", what: "Accumulated and applied at next Quarterly Index Review.", who: ["MSCI, FTSE, STOXX defer below-threshold events to QIR."] },
    ],
    keyTerms: ["Private Placement", "Change in Shares Outstanding", "QIR", "Materiality Threshold"],
    criticalRule: "The key metric is change in shares outstanding — not the offering price. A private placement at a premium still increases shares outstanding, which increases the company's index weight. MSCI defers to QIR unless >=5%; S&P applies immediately on completion.",
    comparisonFields: [
      { label: "Immediate Adjustment", values: { MSCI: "Only if >=5% shares outstanding change", "S&P DJI": "Applied on completion if unconditional", "FTSE Russell": "Only if >=1% extraordinary", STOXX: "Only if >=+/-10%", Solactive: "Per methodology", Morningstar: "Materiality", VettaFi: "N/A" } },
      { label: "Deferred to QIR", values: { MSCI: "Yes (below 5%)", "S&P DJI": "No", "FTSE Russell": "Yes (below 1%)", STOXX: "Yes (below +/-10%)", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
  {
    id: "spin-off",
    name: "Spin-Off / Demerger",
    badge: "mandatory",
    category: "Corporate Structure",
    summary: "Separation of a subsidiary into a standalone entity distributed to parent shareholders.",
    whyAdj: "When Company B is spun off, Company A shareholders receive Company B shares. Company A's market cap should drop by approximately Company B's value — the value left the company. The PAF deducts this from the parent on ex-date. The challenge: if Company B has not started trading yet, there is no market price. Different vendors handle this gap differently — which is the primary source of divergence.",
    recognitionTiming: "Announcement date (terms confirmed)",
    adjustmentTiming: "Ex-date for parent; child added after grace period or when trading",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces spin-off: ratio, distribution date, child entity details", who: ["All vendors"] },
      { phase: "Last Cum-Date", what: "Last day parent trades with spin-off entitlement", who: ["All vendors"] },
      { phase: "Ex-Date (Parent)", what: "Parent price drops by distribution value. Child: if eligible and trading -> added.", who: ["Divisor adjustment for parent. Child treatment varies by vendor."] },
      { phase: "Grace Period", what: "Child in index at temporary price. S&P: zero. FTSE: estimated. MSTAR: zero.", who: ["S&P: 20 days. FTSE: 20 business days. Morningstar: 40 days (India: 60)."] },
      { phase: "Distribution Date", what: "Child shares distributed. Real price discovered. Index weight established.", who: ["Divisor finalised. Child at market price."] },
    ],
    keyTerms: ["Spin-Off", "When-Issuued", "Placeholder", "Grace Period", "Divisor Adjustment", "Detached Security"],
    criticalRule: "S&P and Morningstar set the child price to ZERO on ex-date. FTSE uses estimated price. MSCI uses when-issued or market price. The zero-price approach is most conservative — avoids guessing. The grace period determines how long the placeholder sits before being replaced by real trading price.",
    comparisonFields: [
      { label: "Parent Price Adj", values: { MSCI: "Deducted (distribution value)", "S&P DJI": "No adj on ex-date", "FTSE Russell": "Deducted (distribution value)", STOXX: "Spin-off value deducted", Solactive: "Yes", Morningstar: "Deducted (distribution value)", VettaFi: "N/A" } },
      { label: "Child Ex-Date Price", values: { MSCI: "Market or zero", "S&P DJI": "ZERO on ex-date", "FTSE Russell": "Estimated if not trading", STOXX: "Market price", Solactive: "Per methodology", Morningstar: "Zero price", VettaFi: "N/A" } },
      { label: "Grace Period", values: { MSCI: "None (detached)", "S&P DJI": "20 days", "FTSE Russell": "20 business days", STOXX: "None", Solactive: "—", Morningstar: "40 days (India: 60)", VettaFi: "N/A" } },
    ],
  },
  {
    id: "merger",
    name: "Mergers & Acquisitions",
    badge: "mandatory",
    category: "M&A",
    summary: "Acquisition or merger where target is absorbed. Target deleted; acquirer adjusted per exchange terms.",
    whyAdj: "When the target is absorbed, it ceases to exist. Its weight in the index must be removed. The acquirer's shares are adjusted to reflect the new total shares outstanding. The divisor absorbs the market cap change so the index does not jump.",
    recognitionTiming: "When deal becomes unconditional",
    adjustmentTiming: "Effective date (deletion + acquirer adjustment)",
    thresholds: [
      { vendor: "MSCI", value: "Applied when the deal is unconditional — all regulatory and shareholder approvals received.", note: "No fixed percentage threshold — judgment based on deal certainty" },
      { vendor: "S&P DJI", value: "Float <15% OR >=90% shareholder acceptance -> immediate.", note: "Two separate triggers. Float <15% can fire before 90% acceptance — target removed before deal closes" },
      { vendor: "FTSE Russell", value: ">=90% held OR Float <5% -> deleted.", note: ">=90% held: similar to S&P 90% acceptance. Float <5%: independent of deal completion" },
      { vendor: "STOXX", value: ">=85% acquired OR Float <10% -> deleted.", note: "85% is slightly more aggressive than S&P/FTSE. Float <10% is less aggressive than FTSE <5%." },
    ],
    timingFlow: [
      { phase: "Announcement", what: "Deal announced: exchange ratio, conditions, timeline. All vendors monitor.", who: ["All vendors"] },
      { phase: "Conditions Met", what: "Deal becomes unconditional — all approvals received. Vendor checks deletion threshold.", who: ["All vendors apply on effective date"] },
      { phase: "Effective Date", what: "Target deleted at last traded price. Acquirer shares adjusted per exchange ratio. Divisor adjusted.", who: ["All vendors: same conceptual treatment, different thresholds"] },
    ],
    keyTerms: ["Divisor Adjustment", "M&A", "Effective Date", "Conditional vs Unconditional"],
    criticalRule: "S&P Float <15% trigger can delete the target before 90% acceptance — this is aggressive. FTSE requires >=90% held OR Float <5%. STOXX requires >=85% acquired. These different thresholds can cause the same deal to appear in one vendor's projection data before another's.",
    comparisonFields: [
      { label: "Deletion Threshold", values: { MSCI: "Deal unconditional", "S&P DJI": "Float <15% OR >=90% acceptance", "FTSE Russell": ">=90% held OR Float <5%", STOXX: ">=85% acquired OR Float <10%", Solactive: "When effective", Morningstar: "When completed", VettaFi: "N/A" } },
      { label: "Acquirer Adjustment", values: { MSCI: "Per exchange terms", "S&P DJI": "Per exchange terms", "FTSE Russell": "Per exchange terms", STOXX: "Adjusted", Solactive: "Adjusted", Morningstar: "Adjusted", VettaFi: "N/A" } },
    ],
  },
  {
    id: "tender-offer",
    name: "Tender Offers",
    badge: "voluntary",
    category: "M&A",
    summary: "A public offer to buy shares directly from shareholders at a premium, typically to gain control.",
    whyAdj: "When >=75-90% of shares are tendered, the target effectively has a new controlling shareholder. The remaining shares have different liquidity and risk characteristics. Most vendors delete the target when the acceptance threshold is reached.",
    recognitionTiming: "Offer announcement",
    adjustmentTiming: "On completion (threshold met)",
    thresholds: [
      { vendor: "MSCI", value: "Applied on completion of the tender offer.", note: "No specific percentage threshold — applied when offer is completed" },
      { vendor: "S&P DJI", value: ">=75% shareholder acceptance -> target deleted, acquirer added.", note: "75% is a common threshold — enough for control, often triggers mandatory buyout" },
      { vendor: "FTSE Russell", value: "Minimum 2 days notice before deletion.", note: "FTSE requires advance notice — unlike S&P immediate deletion on threshold met" },
    ],
    timingFlow: [
      { phase: "Offer Launch", what: "Acquirer announces tender offer: price, acceptance threshold, deadline.", who: ["All vendors monitor"] },
      { phase: "Threshold Approaching", what: "As acceptance approaches trigger, vendors prepare for deletion.", who: ["MSCI, S&P, FTSE track threshold"] },
      { phase: "Completion", what: "Target deleted at tender price or last traded. Acquirer added. Divisor adjusted.", who: ["All vendors on completion"] },
    ],
    keyTerms: ["Tender Offer", "Voluntary Event"],
    criticalRule: "FTSE requires minimum 2 days notice before deleting — giving index trackers time to adjust. S&P applies immediately when >=75% acceptance is reached. MSCI waits for completion.",
    comparisonFields: [
      { label: "Deletion Trigger", values: { MSCI: "On completion", "S&P DJI": ">=75% acceptance", "FTSE Russell": "Min 2 days notice", STOXX: "Per methodology", Solactive: "Per methodology", Morningstar: "Per methodology", VettaFi: "N/A" } },
      { label: "Acquirer Added", values: { MSCI: "—", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "—", Solactive: "—", Morningstar: "—", VettaFi: "N/A" } },
    ],
  },
  {
    id: "return-of-capital",
    name: "Return of Capital",
    badge: "mandatory",
    category: "Equity Income",
    summary: "A distribution to shareholders from invested capital or asset sales — not from earnings.",
    whyAdj: "Return of capital is not income — it is a return of the original investment. If not deducted from the price, an index tracker would hold shares worth less without the adjustment being reflected — creating tracking error. Most vendors treat this as a special dividend.",
    recognitionTiming: "Announcement date",
    adjustmentTiming: "Ex-date",
    thresholds: [],
    timingFlow: [
      { phase: "Announcement", what: "Company announces return of capital: amount, structure, timing.", who: ["All vendors"] },
      { phase: "Ex-Date", what: "Price adjustment applied. Most vendors treat as special dividend.", who: ["FTSE Russell: direct price adjustment. MSCI/S&P/Morningstar: special dividend line."] },
    ],
    keyTerms: ["Special Dividend", "Return of Capital", "PAF"],
    criticalRule: "FTSE Russell treats return of capital as a direct price adjustment on ex-date rather than creating a dividend line item. Subtle difference in implementation but produces the same index level effect.",
    comparisonFields: [
      { label: "Treatment", values: { MSCI: "Special dividend", "S&P DJI": "Special dividend", "FTSE Russell": "Direct price adj", STOXX: "Price adjustment", Solactive: "Per methodology", Morningstar: "Special dividend if outside normal", VettaFi: "N/A" } },
      { label: "Timing", values: { MSCI: "Ongoing", "S&P DJI": "Ongoing", "FTSE Russell": "Ongoing", STOXX: "Ongoing", Solactive: "Ongoing", Morningstar: "Ongoing", VettaFi: "N/A" } },
    ],
  },
  {
    id: "bankruptcy",
    name: "Bankruptcy / Delisting",
    badge: "mandatory",
    category: "M&A",
    summary: "Company fails or is delisted. Shares removed at zero or near-zero value.",
    whyAdj: "When a company is bankrupt, its shares are worth approximately zero. It must be removed from the index to avoid dragging down the index with worthless securities. The divisor is adjusted to maintain continuity for remaining constituents.",
    recognitionTiming: "Delisting announcement or last trading date",
    adjustmentTiming: "Last trading date or effective delisting",
    thresholds: [],
    timingFlow: [
      { phase: "Last Trading", what: "Security stops trading. Last price recorded as removal value.", who: ["All vendors"] },
      { phase: "Removal", what: "Security deleted. Divisor adjusted. Remaining constituents unaffected.", who: ["All vendors"] },
    ],
    keyTerms: ["Delisting", "Bankruptcy"],
    criticalRule: "STOXX removes at 0.0000001 (not zero) — a technical fix to avoid division-by-zero errors in index calculation. FTSE removes at cash terms if halted. All others use zero or last traded price.",
    comparisonFields: [
      { label: "Removal Price", values: { MSCI: "Zero or last traded", "S&P DJI": "Zero (if no primary price)", "FTSE Russell": "Cash terms if halted", STOXX: "0.0000001 (not zero)", Solactive: "Zero", Morningstar: "Zero or nominal", VettaFi: "N/A" } },
      { label: "Divisor Change", values: { MSCI: "Yes", "S&P DJI": "Yes", "FTSE Russell": "Yes", STOXX: "Yes", Solactive: "Yes", Morningstar: "Yes", VettaFi: "N/A" } },
    ],
  },
];

// ─── Taxonomy tree ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Equity Income", icon: TrendingUpIcon, color: "text-emerald-400" },
  { name: "Corporate Structure", icon: ScaleIcon, color: "text-blue-400" },
  { name: "Equity Offerings", icon: AlertTriangleIcon, color: "text-orange-400" },
  { name: "M&A", icon: CheckCircleIcon, color: "text-red-400" },
];

const VENDORS = ["MSCI", "S&P DJI", "FTSE Russell", "STOXX", "Solactive", "Morningstar", "VettaFi"];

// ─── Components ───────────────────────────────────────────────────────────────

function Badge({ variant }: { variant: "mandatory" | "voluntary" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        variant === "mandatory"
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-orange-500/15 text-orange-400"
      }`}
    >
      {variant === "mandatory" ? (
        <CheckCircleIcon className="h-3 w-3" />
      ) : (
        <AlertTriangleIcon className="h-3 w-3" />
      )}
      {variant}
    </span>
  );
}

function TimingFlow({ flow }: { flow: EventType["timingFlow"] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 h-full w-px bg-border" />
      <div className="space-y-3">
        {flow.map((step, i) => (
          <div key={i} className="relative flex gap-4 pl-20">
            <div className="absolute left-3.5 top-1.5 h-1 w-1 rounded-full bg-primary ring-2 ring-background" />
            <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3">
              <div className="mb-1 text-xs font-semibold text-primary">{step.phase}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">{step.what}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {step.who.map((w) => (
                  <span key={w} className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
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

function ComparisonTable({ fields }: { fields: ComparisonField[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="min-w-[140px] px-4 py-3 text-left font-semibold text-muted-foreground">Field</th>
            {VENDORS.map((v) => (
              <th key={v} className="min-w-[110px] px-3 py-3 text-center font-semibold text-muted-foreground">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((row, ri) => (
            <tr key={row.label} className={`border-b border-border/40 ${ri % 2 === 0 ? "bg-card" : "bg-muted/10"}`}>
              <td className="px-4 py-2.5 font-medium">{row.label}</td>
              {VENDORS.map((v) => {
                const val = row.values[v] ?? "—";
                const isCritical = val.includes("only") || val.includes("divisor only") || val.includes("unique") || val.includes("UNIQUE") || val.includes("No distinction");
                return (
                  <td key={v} className={`px-2 py-2.5 text-center ${isCritical ? "font-semibold text-amber-400" : "text-muted-foreground"}`}>
                    {val === "N/A" ? <span className="text-muted-foreground/50">{val}</span> : val}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VendorDashboard() {
  const [activeId, setActiveId] = useState(EVENTS[0].id);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.name))
  );
  const [showGlossary, setShowGlossary] = useState(false);

  const active = EVENTS.find((e) => e.id === activeId)!;

  const eventsByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    events: EVENTS.filter((e) => e.category === cat.name),
  }));

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeftIcon className="h-4 w-4" />
              Index Vendor Intelligence
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                Home
              </Link>
              <button
                onClick={() => setShowGlossary(!showGlossary)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  showGlossary
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <BookOpenIcon className="h-3.5 w-3.5" />
                Glossary
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Glossary Panel */}
      <AnimatePresence>
        {showGlossary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="mx-auto max-w-7xl px-6 py-6">
              <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                All Glossary Terms — hover any highlighted term in the matrix to see its definition
              </div>
              <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3 lg:grid-cols-4">
                {GLOSSARY.map((g) => (
                  <div key={g.term} className="rounded-xl border border-border bg-card p-3">
                    <div className="mb-1 text-xs font-bold text-amber-400">{g.term}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground">{g.definition}</div>
                    {g.detail && (
                      <div className="mt-2 rounded-lg bg-black/20 p-2 text-[11px] leading-relaxed text-muted-foreground/80">
                        {g.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex gap-8">

          {/* Left Sidebar */}
          <aside className="w-52 shrink-0">
            <div className="sticky top-20">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Event Taxonomy
              </div>
              <div className="space-y-3">
                {eventsByCategory.map((cat) => (
                  <div key={cat.name}>
                    <button
                      onClick={() => toggleCategory(cat.name)}
                      className="mb-1 flex w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
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
                                className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] transition-all ${
                                  activeId === evt.id
                                    ? "bg-primary/20 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                              >
                                <ArrowRightIcon
                                  className={`h-2.5 w-2.5 shrink-0 transition-opacity ${activeId === evt.id ? "opacity-100" : "opacity-0"}`}
                                />
                                {evt.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">

            {/* Event Header */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={active.badge} />
                <span className="text-xs text-muted-foreground">{active.category}</span>
              </div>
              <h2 className="mb-2 text-2xl font-bold">{active.name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{active.summary}</p>
            </div>

            {/* Why No Adjustment */}
            {active.whyNoAdj && (
              <div className="mb-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                  Why is there NO price adjustment?
                </div>
                <p className="text-sm leading-relaxed">{active.whyNoAdj}</p>
              </div>
            )}

            {/* Why Adjustment */}
            {active.whyAdj && (
              <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  Why IS there a price adjustment?
                </div>
                <p className="text-sm leading-relaxed">{active.whyAdj}</p>
              </div>
            )}

            {/* Recognition vs Adjustment */}
            <div className="mb-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  When Vendor Recognises
                </div>
                <div className="text-sm font-medium">{active.recognitionTiming}</div>
              </div>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  When Adjustment Applied
                </div>
                <div className="text-sm font-medium">{active.adjustmentTiming}</div>
              </div>
            </div>

            {/* Thresholds */}
            {active.thresholds.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Threshold Rules</h3>
                <div className="space-y-2">
                  {active.thresholds.map((t) => (
                    <div key={t.vendor} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                      <span className="min-w-[90px] text-xs font-semibold text-muted-foreground">{t.vendor}</span>
                      <span className="flex-1 text-xs leading-relaxed">{t.value}</span>
                      {t.note && (
                        <span className="shrink-0 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
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

            {/* Key Terms with hover tooltips */}
            {active.keyTerms.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Key Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {active.keyTerms.map((term) => {
                    const exists = GLOSSARY.some((g) => g.term === term);
                    if (!exists) return null;
                    return (
                      <span
                        key={term}
                        className="rounded-full border border-amber-500/40 bg-amber-500/5 px-3 py-1 text-xs text-amber-400"
                      >
                        <GlossaryTerm term={term} />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Critical Rule */}
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
                <AlertTriangleIcon className="h-4 w-4" />
                Critical Rule to Watch
              </div>
              <p className="text-sm leading-relaxed">{active.criticalRule}</p>
            </div>

            {/* Vendor Comparison Table */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold">Vendor Comparison</h3>
              <ComparisonTable fields={active.comparisonFields} />
            </div>

            {/* Legend + hover hint */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground mb-8">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Critical — unique or divergent rule
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                Not applicable
              </div>
              <div className="flex items-center gap-1.5">
                Hover any <span className="ml-1 border-b border-dashed border-amber-400 text-amber-400">highlighted term</span> for tooltip definition
              </div>
            </div>

            {/* Source Notes */}
            <div className="space-y-1 border-t border-border pt-5 text-[11px] text-muted-foreground">
              <div className="font-semibold uppercase tracking-wider text-muted-foreground/60">Sources</div>
              <div>FTSE Russell — Corporate Actions and Events Guide v6.8 (Oct 2025)</div>
              <div>STOXX — Calculation Guide (Apr 2026)</div>
              <div>S&P Dow Jones Indices — Equity Indices Policies and Practices (Mar 2026)</div>
              <div>Solactive — GPR Global 100 Index Guideline (Mar 2026)</div>
              <div>Morningstar — Corporate Actions Methodology (Jan 2026)</div>
              <div>VettaFi — Corporate Action Initiators Methodology + Index Maintenance Policy (Apr 2026)</div>
              <div>MSCI — Corporate Events Methodology (2026)</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
