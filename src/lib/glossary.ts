/**
 * The shared corporate-action glossary.
 *
 * It used to live inside app/vendors/page.tsx, which made Glossary a piece of
 * that page's local state rather than a place: it existed only while you were on
 * the event-taxonomy tab and vanished the moment you opened ISO CAEV Taxonomy or
 * Event Parameters. Reference material the practitioner reaches for mid-lookup
 * needs an address, so the data lives here and /vendors/glossary/ renders it.
 *
 * It also backs the automatic term-wrapping in the taxonomy page, so both the
 * page and the route read one definition of a term.
 */
import {
  eventNamesSentence,
  mandatoryEventCount,
  voluntaryEventCount,
} from "@/lib/event-taxonomy";

const GLOSSARY_MANDATORY_TYPE_LIST = `${mandatoryEventCount()} mandatory types: ${eventNamesSentence("mandatory")}`;
const GLOSSARY_VOLUNTARY_TYPE_LIST = `${voluntaryEventCount()} voluntary types: ${eventNamesSentence("voluntary")}`;

// ─── Glossary with tooltips ─────────────────────────────────────────────────

export type GEntry = { term: string; definition: string; detail?: string };

export const GLOSSARY: GEntry[] = [
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
    detail: "Below-threshold events may accumulate until a scheduled review, but the applicable schedule is product-specific. Solactive’s v1.20 framework does not make the former GPR Global 100 cadence universal.",
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
    term: "When-Issued",
    definition: "Trading of a security before its official distribution date.",
    detail: "Used in spin-offs: when-issued Company B trades before the distribution date. MSCI uses this price for spin-off inclusions.",
  },
  {
    term: "Placeholder",
    definition: "A temporary floor price used when the spin-off child has not yet started trading.",
    detail: "S&P and Morningstar use zero. Solactive uses 0.00000001 (not zero — avoids division-by-zero in index math). FTSE uses an estimated price. The placeholder is replaced with real market price once trading begins.",
  },
  {
    term: "Grace Period",
    definition: "A window after the ex-date during which a spin-off child is held at a temporary price.",
    detail: "S&P: 20 days. FTSE Russell: 20 business days. Morningstar: 40 days (60 for India). During this period the child is in the index at zero or estimated price.",
  },
  {
    term: "Mandatory Event",
    definition: "A corporate action that is automatically processed because it is confirmed by the company.",
    detail: `${GLOSSARY_MANDATORY_TYPE_LIST}. All are confirmed facts once terms are set — no shareholder opt-in. Vendor applies per methodology without discretion over whether the event exists.`,
  },
  {
    term: "Voluntary Event",
    definition: "A corporate action where participation depends on a shareholder decision.",
    detail: `${GLOSSARY_VOLUNTARY_TYPE_LIST}. Vendor treatment often depends on thresholds, participation outcomes, or classification rules.`,
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
    term: "Swedish Redemption Share",
    definition: "A temporary line of security issued in some Swedish corporate actions — redeemed to receive another line rather than parent company stock.",
    detail: "Solactive does NOT add Swedish redemption shares to the index. Only the final form of the spun-off security is added. This prevents index contamination with temporary instruments that have no independent economic value. Version 1.4 of the Solactive ECA Guideline (Oct 2024) added this rule explicitly.",
  },
  {
    term: "Return of Capital",
    definition: "A distribution to shareholders from invested capital or asset sales — not from earnings.",
    detail: "Not income. Treated as a special dividend by most vendors. FTSE Russell treats it as a direct price adjustment on the ex-date.",
  },
  {
    term: "Spin-Off",
    definition: "Separation of a subsidiary into a standalone entity distributed to parent shareholders.",
    detail: "Five vendors, five approaches to the same problem: S&P and Morningstar use ZERO on ex-date; Solactive uses 0.00000001 floor; FTSE uses estimated price; MSCI uses when-issued or market price; STOXX waits until real trading begins. Swedish redemption shares (temporary lines) are excluded by Solactive — only the final form enters the index.",
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
