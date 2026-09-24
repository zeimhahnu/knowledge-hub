/**
 * Vendor rule table — used by the simulator engine to produce concrete,
 * vendor-named explanations. Rules mirror the curated 13-event matrix in
 * `src/data/rules.json` and the treatment cards shown on `/vendors/`.
 */

import type { CanonicalEventId } from "@/lib/event-taxonomy";
import { VENDOR_IDS, type VendorId } from "@/lib/vendors";

export type Trigger =
  | "always" // vendor publishes/adjusts unconditionally for this event
  | "threshold-size" // depends on a size / materiality threshold
  | "threshold-recurrence" // depends on consecutive-occurrence rule
  | "threshold-float" // depends on free-float % of target/issuer
  | "threshold-acceptance" // depends on tender / acceptance %
  | "itm-only" // only adjusts in-the-money rights
  | "completion-gate" // waits for unconditional / completion confirmation
  | "scheduled-review" // batched into QIR / semi-annual review
  | "placeholder-immediate" // adds child immediately at a placeholder
  | "wait-real-trade" // waits for first real market price
  | "estimated-price" // adds at an estimated price
  | "direct-price-adj" // direct price adjustment, no separate line
  | "notice-required" // requires N trading-day advance notice
  | "no-coverage"; // not documented for this vendor

export type Citation = string;

export type VendorRule = {
  /** Short headline shown in the simulator card. Must read as a definite rule. */
  rule: string;
  /** Trigger mechanism — used by the engine to decide which numeric hint to evaluate. */
  trigger: Trigger;
  /** Numeric threshold in %, where applicable (free float, size, acceptance). */
  thresholdPct?: number;
  /** Consecutive-occurrence cap, where applicable (e.g. S&P 2 = 1st-2nd free passes). */
  recurrenceFreePasses?: number;
  /** Notice period in trading days, where applicable. */
  noticeDays?: number;
  /** Plain-language sentence the engine inserts into hypotheses verbatim. */
  reason: string;
  /** Methodology citation (section number from the canonical source). */
  citation?: Citation;
};

type EventRuleSet = Partial<Record<VendorId, VendorRule>>;

export const VENDOR_RULES: Record<CanonicalEventId, EventRuleSet> = {
  // ─── §1 Cash Dividend (Regular) ────────────────────────────────────────────
  "cash-dividend": {
    msci: {
      rule: "Ex-date — TR/NTR reinvested, no PR adjustment",
      trigger: "always",
      reason:
        "MSCI applies regular cash dividends on ex-date with no PR adjustment; TR/NTR reinvest gross/net of withholding tax.",
      citation: "MSCI Corporate Events §1",
    },
    sp: {
      rule: "Ex-date — TR/NTR reinvested, no PR adjustment",
      trigger: "always",
      reason:
        "S&P DJI applies regular cash dividends on ex-date with no PR adjustment; TR/NTR reinvest.",
      citation: "S&P Equity Indices Policies §1",
    },
    ftse: {
      rule: "Ex-date — TR/NTR reinvested, no PR adjustment",
      trigger: "always",
      reason:
        "FTSE Russell applies regular cash dividends on ex-date with no PR adjustment; TR/NTR reinvest.",
      citation: "FTSE CA Guide §1",
    },
    stoxx: {
      rule: "GR/NTR reinvested via padj formula — PR not adjusted",
      trigger: "always",
      reason:
        "STOXX uses padj = pt-1 - Divt for GR and pt-1 - Divt × (1-τ) for NTR; the PR series is not adjusted for regular cash dividends.",
      citation: "STOXX Calc Guide §8.1",
    },
    solactive: {
      rule: "PR neglects regular cash; GTR/NTR reinvest",
      trigger: "always",
      reason:
        "Solactive v1.20 neglects regular Cash Dividends in Price Return and reinvests Cash and Special Dividends in Gross and Net Total Return branches.",
      citation: "Solactive Equity Index Methodology v1.20 §2.1.1 (p.13)",
    },
    morningstar: {
      rule: "Ex-date — TR/NTR reinvested, no PR adjustment",
      trigger: "always",
      reason:
        "Morningstar applies regular cash dividends on ex-date with no PR adjustment.",
      citation: "Morningstar CA §1",
    },
    vettafi: {
      rule: "PR none; GTR/NTR reinvest",
      trigger: "always",
      reason:
        "VettaFi applies regular cash dividends on the ex-date to Total Return and Net Total Return variants, with no Price Return adjustment.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §9 (p.3)",
    },
  },

  // ─── §2 Special Cash Dividend ──────────────────────────────────────────────
  "special-dividend": {
    msci: {
      rule: "PR adjusted only if ≥5% of price",
      trigger: "threshold-size",
      thresholdPct: 5,
      reason:
        "MSCI classifies a cash dividend as special only when it is ≥5% of market price; below 5% it is treated as ordinary and the PR index is not adjusted.",
      citation: "MSCI Corporate Events §2",
    },
    sp: {
      rule: "1st-2nd consecutive free; 4th+ becomes ordinary",
      trigger: "threshold-recurrence",
      recurrenceFreePasses: 2,
      reason:
        "S&P DJI gives the first two consecutive specials a free pass, treats the third as the last special, and then reclassifies the fourth onwards as ordinary — so the same cash distribution can appear special at one issuer and ordinary at another.",
      citation: "S&P Equity Indices Policies §2",
    },
    ftse: {
      rule: "1st-3rd consecutive free; 4th+ becomes ordinary",
      trigger: "threshold-recurrence",
      recurrenceFreePasses: 3,
      reason:
        "FTSE Russell is the most generous: three consecutive specials before a recurring one is treated as ordinary.",
      citation: "FTSE CA Guide §2",
    },
    stoxx: {
      rule: "PR ALWAYS adjusted — no threshold",
      trigger: "always",
      reason:
        "STOXX is the unique outlier: it applies padj = pt-1 - Divt × (1-τ) to PR for every special dividend, regardless of size or recurrence — so STOXX shows price-return adjustments others suppress.",
      citation: "STOXX Calc Guide §8.1.1",
    },
    solactive: {
      rule: "PR special; GTR/NTR reinvest",
      trigger: "completion-gate",
      reason:
        "Solactive v1.20 includes Special Dividends in Price Return and reinvests them in Gross and Net Total Return branches; product Index Guidelines may supersede this framework.",
      citation: "Solactive Equity Index Methodology v1.20 §2.1.1 (p.13)",
    },
    morningstar: {
      rule: "PR adjusted only if ≥5% of price (since Aug 2024)",
      trigger: "threshold-size",
      thresholdPct: 5,
      reason:
        "Morningstar moved to a 5% size threshold in August 2024; below 5% the special is treated as ordinary and the PR index is not adjusted.",
      citation: "Morningstar CA §2",
    },
    vettafi: {
      rule: "Weighting-specific proceeds treatment",
      trigger: "always",
      reason:
        "VettaFi adjusts special dividends in Price, Total Return, and Net Total Return variants; market-cap-weighted indexes redistribute proceeds, while non-market-cap-weighted indexes reinvest them into the payer.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §§11.1–11.2 (p.4)",
    },
  },

  // ─── §3 Stock Dividend ─────────────────────────────────────────────────────
  "stock-dividend": {
    msci: {
      rule: "Treated identically to a stock split",
      trigger: "always",
      reason:
        "MSCI uses the split formula padj = pt-1 × A/(A+B); there is no distinction from bonus.",
      citation: "MSCI §3",
    },
    sp: {
      rule: "Treated identically to a stock split",
      trigger: "always",
      reason:
        "S&P DJI applies padj = pt-1 / split_ratio — no separate stock-dividend formula.",
      citation: "S&P §3",
    },
    ftse: {
      rule: "Distinct formula: shares before ÷ shares after",
      trigger: "always",
      reason:
        "FTSE keeps stock dividend distinct from bonus and uses an explicit share-ratio PAF.",
      citation: "FTSE §3",
    },
    stoxx: {
      rule: "Four sub-types, four PAF formulas (§8.1.5)",
      trigger: "always",
      reason:
        "STOXX splits stock dividends into Ordinary, Treasury Stock, Redeemable Shares, and Shares-of-Another-Company — each with its own PAF; only Treasury Stock changes the divisor.",
      citation: "STOXX §8.1.5",
    },
    solactive: {
      rule: "PAF = 1 + stock terms; no divisor change",
      trigger: "completion-gate",
      reason:
        "Solactive v1.20 increases shares and lowers the theoretical price proportionally, with no Divisor change.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.2–2.1.2.1 (pp.19–20)",
    },
    morningstar: {
      rule: "Absolute share-count ratio — distinct from bonus",
      trigger: "always",
      reason:
        "Morningstar uses pre-event total shares ÷ post-event total shares, distinct from bonus issue.",
      citation: "Morningstar §3",
    },
    vettafi: {
      rule: "Shares and price move proportionally",
      trigger: "completion-gate",
      reason: "VettaFi’s supplied policy increases shares and decreases price proportionally for stock dividends, leaving weight unchanged.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §6 (p.2)",
    },
  },

  // ─── §4 Bonus Issue ────────────────────────────────────────────────────────
  "bonus-issue": {
    msci: {
      rule: "Identical across vendors — shares × ratio, no divisor change",
      trigger: "always",
      reason:
        "MSCI applies the bonus ratio to shares; market cap is unchanged so no price or divisor adjustment is needed.",
      citation: "§4",
    },
    sp: {
      rule: "Identical across vendors — shares × ratio, no divisor change",
      trigger: "always",
      reason: "S&P DJI applies the bonus identically to MSCI.",
      citation: "§4",
    },
    ftse: {
      rule: "Identical across vendors — shares × ratio, no divisor change",
      trigger: "always",
      reason: "FTSE Russell applies the bonus identically to MSCI.",
      citation: "§4",
    },
    stoxx: {
      rule: "Identical across vendors — shares × ratio, no divisor change",
      trigger: "always",
      reason: "STOXX applies the bonus identically to MSCI.",
      citation: "§4",
    },
    solactive: {
      rule: "Mapped to stock-dividend treatment",
      trigger: "always",
      reason: "Solactive v1.20 has no separate Bonus Issue section; this app maps a pro-rata no-charge share distribution to its Stock Dividend treatment.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.2–2.1.2.1 (pp.19–20)",
    },
    morningstar: {
      rule: "Identical across vendors — shares × ratio, no divisor change",
      trigger: "always",
      reason: "Morningstar applies the bonus identically to MSCI.",
      citation: "§4",
    },
    vettafi: {
      rule: "Mapped to stock-dividend formula",
      trigger: "completion-gate",
      reason: "VettaFi does not publish a separate Bonus Issue section; this app maps the pro-rata no-charge distribution to the stock-dividend formula.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §§6, III.6 (pp.2,8–9)",
    },
  },

  // ─── §5 Stock Split / Consolidation ────────────────────────────────────────
  "stock-split": {
    msci: {
      rule: "padj = pt-1 × A/(A+B); divisor unchanged",
      trigger: "always",
      reason: "MSCI applies the standard split PAF; divisor unchanged.",
      citation: "§5",
    },
    sp: {
      rule: "padj = pt-1 / split_ratio; divisor unchanged",
      trigger: "always",
      reason: "S&P DJI applies a ratio PAF; divisor unchanged.",
      citation: "§5",
    },
    ftse: {
      rule: "Shares before ÷ after; divisor unchanged",
      trigger: "always",
      reason: "FTSE applies a share-ratio PAF; divisor unchanged.",
      citation: "§5",
    },
    stoxx: {
      rule: "Same PAF — but divisor INCREASES (unique)",
      trigger: "always",
      reason:
        "STOXX uniquely adjusts the divisor on a split; for STOXX the index level is held flat while other vendors let it drop with price.",
      citation: "§5",
    },
    solactive: {
      rule: "Shares and price move proportionally",
      trigger: "always",
      reason: "Solactive v1.20 treats Stock Splits and Reverse Stock Splits as proportional share and price changes that preserve market capitalization.",
      citation: "Solactive Equity Index Methodology v1.20 §2.1.3 (pp.20–21)",
    },
    morningstar: {
      rule: "Pre/post share count PAF; divisor unchanged",
      trigger: "always",
      reason: "Morningstar applies a share-ratio PAF; divisor unchanged.",
      citation: "§5",
    },
    vettafi: {
      rule: "Split and reverse split are weight-neutral",
      trigger: "always",
      reason: "VettaFi changes shares and price proportionally for splits and reverse splits while leaving constituent weight unchanged.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §§6–7, III.4 (pp.2–3,8)",
    },
  },

  // ─── §6 Spin-off / Demerger ────────────────────────────────────────────────
  "spin-off": {
    msci: {
      rule: "Detached security at when-issued price, else zero",
      trigger: "placeholder-immediate",
      reason:
        "MSCI adds the child as a detached security on the distribution date using the when-issued price if available, otherwise zero.",
      citation: "§6",
    },
    sp: {
      rule: "Zero placeholder, max 20-day grace",
      trigger: "placeholder-immediate",
      reason:
        "S&P DJI adds the child at zero on ex-date and holds the placeholder for up to 20 calendar days before requiring real prices.",
      citation: "§6",
    },
    ftse: {
      rule: "Estimated price until real trade",
      trigger: "estimated-price",
      reason:
        "FTSE adds the child at an estimated price (parent-difference method) and switches to market price once the child trades.",
      citation: "§6",
    },
    stoxx: {
      rule: "Waits for first real trade — no placeholder (unique)",
      trigger: "wait-real-trade",
      reason:
        "STOXX is the unique vendor that does NOT use a placeholder — the child is only added once it has a real market price, which is why STOXX projection lines for spin-offs lag others.",
      citation: "§6",
    },
    solactive: {
      rule: "Adds at 0.00000001 floor on effective date",
      trigger: "placeholder-immediate",
      reason:
        "Solactive uses a 0.00000001 price floor on the effective date and switches to official prices when trading begins; Swedish redemption shares are excluded — only the final form of the security is added.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.6–2.1.6.3 (pp.24–26)",
    },
    morningstar: {
      rule: "Zero placeholder — 40-day grace (60 in India)",
      trigger: "placeholder-immediate",
      reason:
        "Morningstar uses the longest grace window (40 calendar days, 60 in India), which is why MSTAR projection feeds typically show spin-off children before competitors.",
      citation: "§6",
    },
    vettafi: {
      rule: "Weighting-specific spin-off treatment",
      trigger: "always",
      reason: "VettaFi documents separate market-cap and non-market-cap spin-off branches, including a zero-price fallback when value is unknown.",
    },
  },

  // ─── §7 Rights Issue ───────────────────────────────────────────────────────
  "rights-issue": {
    msci: {
      rule: "Adjusts ITM rights only — uses TERP / when-issued price",
      trigger: "itm-only",
      reason:
        "MSCI checks TERP; only in-the-money rights are adjusted. OTM rights are ignored because no rational investor exercises them.",
      citation: "§7",
    },
    sp: {
      rule: "Adjusts ITM rights only — value-of-rights formula",
      trigger: "itm-only",
      reason:
        "S&P DJI adjusts when subscription price is below market; OTM rights are ignored.",
      citation: "§7",
    },
    ftse: {
      rule: "Adjusts at any discount — creates 3 nil-paid temp lines",
      trigger: "always",
      reason:
        "FTSE is the most aggressive: it adjusts whenever the rights are at a discount and uniquely creates three temporary lines (nil-paid rights, call dummy, new shares) — so FTSE often shows nil-paid lines that other feeds do not carry.",
      citation: "§7",
    },
    stoxx: {
      rule: "Standard PAF; HDRI safeguard if >5% mkt-cap impact",
      trigger: "itm-only",
      reason:
        "STOXX applies a standard PAF for ITM rights and triggers HDRI safeguards when dilution exceeds 5% of market cap.",
      citation: "§7",
    },
    solactive: {
      rule: "Adjusts only when subscription price < prior close",
      trigger: "itm-only",
      reason:
        "Solactive v1.20 implements a Rights Issue only when the subscription price is below the stock close on the day before the ex-date; it provides Standard and Divisor formulas.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.4–2.1.4.2 (pp.21–23)",
    },
    morningstar: {
      rule: "Adjusts ITM rights only — TERP-based",
      trigger: "itm-only",
      reason: "Morningstar uses TERP and only adjusts ITM rights.",
      citation: "§7",
    },
    vettafi: {
      rule: "ITM only; weighting branch differs",
      trigger: "itm-only",
      reason: "VettaFi exercises rights only when subscription price is below the prior close, with market-cap and non-market-cap share treatments documented separately.",
    },
  },

  // ─── §8 Secondary Offering ─────────────────────────────────────────────────
  "secondary-offering": {
    msci: {
      rule: "Event-time update at ≥5% / 10% / 25% by cap tier",
      trigger: "threshold-size",
      thresholdPct: 5,
      reason:
        "MSCI applies secondary offerings and block sales at the event with two full business days advance notice when the change meets the Standard, Small Cap, or Micro Cap threshold; smaller changes are deferred to the next Index Review.",
      citation: "MSCI Corporate Events §4.1–§4.2",
    },
    sp: {
      rule: "BOTH ≥5% of shares AND ≥USD 150M required",
      trigger: "threshold-size",
      thresholdPct: 5,
      reason:
        "S&P DJI uses a dual gate for public offerings, including block sales and spot secondaries: both 5% of pre-event shares and a USD 150M floor must be met, unless the event is at least USD 1B.",
      citation: "S&P Equity Indices Policies §Non-Mandatory Share and IWF Updates",
    },
    ftse: {
      rule: "Intra-quarter at US$1bn or 5% + US$250m",
      trigger: "threshold-size",
      thresholdPct: 5,
      reason:
        "FTSE uses the same two materiality routes for secondary offerings and block sales: a US$1bn investable market-cap change, or 5% index shares plus US$250m. Qualifying previously restricted shares can change free float intra-quarter; smaller or late-discovered events go to the quarterly review.",
      citation: "FTSE Russell CA Guide §5.2",
    },
    stoxx: {
      rule: "Intra-quarter at ±10% shares or ±5pp free float",
      trigger: "threshold-size",
      thresholdPct: 10,
      reason:
        "STOXX applies the same extraordinary-adjustment thresholds to secondary offerings as to other share/free-float changes: at least ±10% free-float-adjusted shares or ±5 percentage points in the free-float factor; otherwise the quarterly underlying-data schedule applies.",
      citation: "STOXX Calculation Guide §8.2",
    },
    solactive: {
      rule: "No dedicated secondary-offering rule; framework discretion",
      trigger: "completion-gate",
      reason:
        "Solactive v1.20 does not publish a dedicated secondary-offering treatment; its generic corporate-actions framework and product Guidelines govern uncovered cases.",
      citation: "Solactive Equity Index Methodology v1.20 §2.1 (p.12)",
    },
    morningstar: {
      rule: "Materiality assessment — no fixed % stated",
      trigger: "threshold-size",
      reason:
        "Morningstar treats secondary offerings as nonmandatory and uses a materiality assessment; the methodology publishes no quantitative threshold, so below-materiality changes are deferred to scheduled rebalance.",
      citation: "Morningstar CA Methodology §Nonmandatory Corporate Action Methodology (p.37)",
    },
    vettafi: {
      rule: "Scheduled rebalancing only",
      trigger: "scheduled-review",
      reason:
        "VettaFi groups share offerings with tenders and buybacks and implements share-count changes at rebalancing; the policy states no accelerated path regardless of size.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §4 (p.2)",
    },
  },

  // ─── §9 Private Placement ──────────────────────────────────────────────────
  "private-placement": {
    msci: {
      rule: "Deferred to QIR unless ≥5% change in shares outstanding",
      trigger: "threshold-size",
      thresholdPct: 5,
      reason:
        "MSCI defers private placements to QIR unless the change in shares outstanding is ≥5% — so most private placements never appear in the open-constituents projection between reviews.",
      citation: "§9",
    },
    sp: {
      rule: "Applied on completion if unconditional — no minimum threshold",
      trigger: "completion-gate",
      reason:
        "S&P DJI applies the placement immediately upon unconditional completion regardless of size, so S&P typically shows the line before MSCI.",
      citation: "§9",
    },
    ftse: {
      rule: "Extraordinary if ≥1% cumulative per quarter",
      trigger: "threshold-size",
      thresholdPct: 1,
      reason:
        "FTSE applies the same 1% cumulative quarterly trigger it uses for secondaries.",
      citation: "§9",
    },
    stoxx: {
      rule: "Extraordinary only at ±10% market-cap impact",
      trigger: "threshold-size",
      thresholdPct: 10,
      reason:
        "STOXX defers all sub-±10% private placements to the quarterly review, so smaller deals will not appear in projections between reviews.",
      citation: "§9",
    },
    solactive: {
      rule: "No dedicated private-placement rule; framework discretion",
      trigger: "completion-gate",
      reason:
        "Solactive v1.20 does not publish a dedicated private-placement treatment; undescribed or exceptional actions may be handled by discretion and announced before effectiveness.",
      citation: "Solactive Equity Index Methodology v1.20 §2.1 (p.12)",
    },
    morningstar: {
      rule: "Materiality assessment — no fixed % stated",
      trigger: "completion-gate",
      reason:
        "Morningstar uses a subjective materiality test — same deal, different timing.",
      citation: "§9",
    },
    vettafi: {
      rule: "No separate private-placement rule",
      trigger: "completion-gate",
      reason: "VettaFi’s supplied policy does not separately address private placements; its broad share-offering wording must not be treated as a private-placement-specific rule.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §4 (p.2)",
    },
  },

  // ─── §10 Return of Capital ────────────────────────────────────────────────
  "return-of-capital": {
    msci: {
      rule: "Treated as a special-dividend line",
      trigger: "always",
      reason: "MSCI books return of capital as a special-dividend line on ex-date.",
      citation: "§10",
    },
    sp: {
      rule: "Treated as a special-dividend line",
      trigger: "always",
      reason: "S&P DJI books return of capital as a special-dividend line.",
      citation: "§10",
    },
    ftse: {
      rule: "Direct price adjustment — no separate dividend line (unique)",
      trigger: "direct-price-adj",
      reason:
        "FTSE Russell is the unique vendor that posts return of capital as a direct price adjustment on ex-date rather than a dividend line, so the line will not show in FTSE’s dividend feed even though the price adjustment is identical in effect.",
      citation: "§10",
    },
    stoxx: {
      rule: "Price adjustment via §8.1.6 formula",
      trigger: "always",
      reason:
        "STOXX uses padj = [pt-1 - capital_return × (1-τ)] × A/B with a share consolidation component.",
      citation: "STOXX §8.1.6",
    },
    solactive: {
      rule: "Special dividend unless repetitive ordinary pattern",
      trigger: "always",
      reason: "Solactive v1.20 treats return of capital as a special dividend free of withholding tax unless its amount/frequency is repetitive and it replaces a regular Cash Dividend; no numeric threshold is stated.",
      citation: "Solactive Equity Index Methodology v1.20 §2.1.1.3.7 (p.16)",
    },
    morningstar: {
      rule: "Special dividend if outside normal cadence",
      trigger: "always",
      reason: "Morningstar treats return of capital as a special dividend when outside normal cadence.",
      citation: "§10",
    },
    vettafi: {
      rule: "No separate return-of-capital rule",
      trigger: "no-coverage",
      reason: "VettaFi’s supplied policy is silent on a distinct return-of-capital treatment; silence is not a contrary treatment.",
    },
  },

  // ─── §11 Mergers & Acquisitions ───────────────────────────────────────────
  merger: {
    msci: {
      rule: "Deletes target when deal is unconditional (no fixed %)",
      trigger: "completion-gate",
      reason:
        "MSCI relies on deal certainty rather than a fixed %; the target is removed once the deal is unconditional. Acquirer share-count threshold: 5%/10%/25% by Standard/Small/Micro cap.",
      citation: "§11",
    },
    sp: {
      rule: "Float <15% OR ≥90% acceptance — either trigger fires",
      trigger: "threshold-float",
      thresholdPct: 15,
      reason:
        "S&P DJI fires on EITHER Float <15% OR ≥90% acceptance, so the float trigger can delete the target before acceptance reaches 90% — typically the earliest deletion of the major vendors.",
      citation: "§11",
    },
    ftse: {
      rule: "≥90% held OR Float <5% — either trigger fires",
      trigger: "threshold-float",
      thresholdPct: 5,
      reason:
        "FTSE Russell deletes when either ≥90% is held or free float falls below 5%; Float <5% is independent of deal completion.",
      citation: "§11",
    },
    stoxx: {
      rule: "Both ≥85% acquired AND Float <10% required (strictest)",
      trigger: "threshold-float",
      thresholdPct: 10,
      reason:
        "STOXX is the strictest: BOTH conditions must be met (≥85% acquired AND remaining free float <10%) — if only one is met, deletion is deferred to the next quarterly review.",
      citation: "STOXX §8.3.1",
    },
    solactive: {
      rule: "Cash/stock terms branch; product Guideline may supersede",
      trigger: "completion-gate",
      reason: "Solactive v1.20 removes the target on the effective date and distributes cash consideration or increases surviving shares according to the component/non-component and cash/stock terms branches. An Index Guideline supersedes this framework when different.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.7–2.1.7.2 (pp.26–32)",
    },
    morningstar: {
      rule: "Removed on deal completion",
      trigger: "completion-gate",
      reason: "Morningstar removes the target on deal completion.",
      citation: "§11",
    },
    vettafi: {
      rule: "Approach 1/2/3 is index-specific",
      trigger: "completion-gate",
      reason: "VettaFi does not establish a universal merger approach: 1.0, 2.0, and 3.0 depend on weighting and the Appendix/product index.",
    },
  },

  // ─── §12 Tender Offers ────────────────────────────────────────────────────
  "tender-offer": {
    msci: {
      rule: "Deletes when offer is formally completed (no % threshold)",
      trigger: "completion-gate",
      reason:
        "MSCI waits for formal completion rather than a numeric acceptance %, so MSCI typically appears later than S&P for the same tender.",
      citation: "§12",
    },
    sp: {
      rule: "Immediate deletion at ≥75% acceptance — no notice",
      trigger: "threshold-acceptance",
      thresholdPct: 75,
      reason:
        "S&P DJI is the most aggressive: immediate deletion the moment acceptance reaches 75%, with no advance notice.",
      citation: "§12",
    },
    ftse: {
      rule: "Minimum 2 trading days notice required (unique)",
      trigger: "notice-required",
      noticeDays: 2,
      reason:
        "FTSE is the only vendor that mandates a two-trading-day notice before deletion, which is why FTSE often lags S&P by exactly two days on the same tender.",
      citation: "§12",
    },
    stoxx: {
      rule: "Same M&A rule: ≥85% acquired AND Float <10%",
      trigger: "threshold-acceptance",
      thresholdPct: 85,
      reason:
        "STOXX has no separate tender methodology — it applies the M&A double gate, so a tender at <85% acceptance is deferred to QIR.",
      citation: "STOXX §8.3.1.1",
    },
    solactive: {
      rule: "Mapped to takeover-offer M&A timing",
      trigger: "completion-gate",
      reason: "Solactive v1.20 maps takeover offers to its M&A timing: deletion can follow delisting, squeeze-out, or a successful unconditional offer with free float below 15%, with at least two Business Days notice. Product Guidelines may supersede this framework.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.7–2.1.7.2 (pp.26–32)",
    },
    morningstar: {
      rule: "Deletes on offer completion (no % threshold)",
      trigger: "completion-gate",
      reason: "Morningstar deletes when the tender offer formally completes.",
      citation: "§12",
    },
    vettafi: {
      rule: "Rebalance for tender share-count changes",
      trigger: "completion-gate",
      reason: "VettaFi explicitly groups Tenders with share offerings and buybacks: share-count changes are implemented at rebalancing, with no separate universal acceptance threshold stated.",
      citation: "VettaFi Index Maintenance Policy v1.1.8 §4 (p.2)",
    },
  },

  // ─── §13 Bankruptcy / Delisting ───────────────────────────────────────────
  bankruptcy: {
    msci: {
      rule: "Immediate announcement, 2-day implementation; last traded or 0.0000001 if none",
      trigger: "always",
      reason:
        "MSCI announces immediately and implements in two days, removing at last traded price or 0.0000001 if none exists.",
      citation: "§13",
    },
    sp: {
      rule: "Removed at last traded / M&A terms on delisting",
      trigger: "always",
      reason: "S&P DJI removes at market price or M&A terms upon delisting / bankruptcy.",
      citation: "§13",
    },
    ftse: {
      rule: "Removed on effective date at last traded or M&A terms",
      trigger: "always",
      reason: "FTSE Russell removes on the effective date.",
      citation: "§13",
    },
    stoxx: {
      rule: "10 consecutive suspension days OR bankruptcy filing → 2-day implementation",
      trigger: "always",
      reason:
        "STOXX deletes after 10 consecutive suspension days or a bankruptcy filing; the floor price is 0.0000001, not zero, to avoid division-by-zero in index math.",
      citation: "§13",
    },
    solactive: {
      rule: "Last/alternative price; 0.00000001 if none",
      trigger: "notice-required",
      noticeDays: 2,
      reason: "Solactive v1.20 removes bankrupt or insolvent components with at least two Business Days notice, using last close or an official alternative-market price; if none is robust, 0.00000001 is used and weight is redistributed only when a determined price exists.",
      citation: "Solactive Equity Index Methodology v1.20 §§2.1.10–2.1.10.2 (pp.35–36)",
    },
    morningstar: {
      rule: "Removed at market price upon event",
      trigger: "always",
      reason: "Morningstar removes at market price upon the event.",
      citation: "§13",
    },
    vettafi: {
      rule: "Delisting/bankruptcy removal with price fallback",
      trigger: "always",
      reason: "VettaFi documents removal for delisting and bankruptcy, alternate-market pricing, and a 0.01 local-currency fallback when a security is worthless or too illiquid.",
    },
  },
};

// Primary offerings have their own sourced timing semantics; they are not an
// alias for secondary offerings because FTSE defers primary free-float changes.
VENDOR_RULES["primary-offering"] = {
  msci: {
    rule: "Close of first trading day at ≥5% / 10% / 25% by cap tier",
    trigger: "threshold-size",
    thresholdPct: 5,
    reason: "MSCI implements qualifying primary offerings and debt-to-equity swaps at the close of the first trading day of the new shares; smaller changes are deferred to the next Index Review.",
    citation: "MSCI Corporate Events §4.1–§4.2",
  },
  sp: {
    rule: "Accelerated at ≥5% + US$150M, or ≥US$1B",
    trigger: "threshold-size",
    thresholdPct: 5,
    reason: "S&P DJI accelerates public-offering share issuance when both the 5% share and US$150M thresholds are met, or when the event is at least US$1B; otherwise it waits for quarterly rebalancing.",
    citation: "S&P Equity Indices Policies §Non-Mandatory Share and IWF Updates",
  },
  ftse: {
    rule: "Shares intra-quarter; free float at quarterly review",
    trigger: "threshold-size",
    thresholdPct: 5,
    reason: "FTSE applies its US$1bn or 5% + US$250m materiality routes to primary share-count updates, but a primary offering does not move free float intra-quarter.",
    citation: "FTSE Russell CA Guide §5.2",
  },
  stoxx: {
    rule: "Intra-quarter at ±10% shares or ±5pp free float",
    trigger: "threshold-size",
    thresholdPct: 10,
    reason: "STOXX applies its extraordinary share/free-float thresholds to primary offerings; smaller changes follow the quarterly underlying-data schedule.",
    citation: "STOXX Calculation Guide §8.2",
  },
  morningstar: {
    rule: "Materiality assessment — no fixed % stated",
    trigger: "threshold-size",
    reason: "Morningstar covers primary offerings as public offerings under its nonmandatory policy and publishes no quantitative materiality threshold; below materiality is deferred to scheduled rebalance.",
    citation: "Morningstar CA Methodology §Corporate Action Category (p.5); §Nonmandatory Corporate Action Methodology (p.37)",
  },
  solactive: {
    rule: "No dedicated primary-offering rule; framework discretion",
    trigger: "no-coverage",
    reason: "Solactive v1.20 does not publish a dedicated primary-offering treatment; its generic corporate-actions framework and product Guidelines govern uncovered cases.",
    citation: "Solactive Equity Index Methodology v1.20 §2.1 (p.12)",
  },
  vettafi: {
    rule: "Scheduled rebalancing only",
    trigger: "scheduled-review",
    reason: "VettaFi groups share offerings with tenders and buybacks and implements share-count changes at rebalancing; the policy states no accelerated path regardless of size.",
    citation: "VettaFi Index Maintenance Policy v1.1.8 §4 (p.2)",
  },
};

const NOT_NAMED: VendorRule = {
  rule: "Not named in the methodology",
  trigger: "no-coverage",
  reason: "The vendor's methodology does not name this event; its general discretion or rebalance policy decides.",
};
VENDOR_RULES["forward-sale-agreement"] = Object.fromEntries(VENDOR_IDS.map((v) => [v, NOT_NAMED]));
VENDOR_RULES["share-buyback"] = {
  ...VENDOR_RULES["forward-sale-agreement"],
  solactive: {
    rule: "Capital Decrease: fixed-price offer above prior close",
    trigger: "completion-gate",
    reason: "Solactive implements a fixed-price buyback offer (its Capital Decrease) only when the offer price is above the prior close; open-market buybacks are not described.",
    citation: "Solactive Equity Index Methodology v1.20 §2.1.5 (p.23)",
  },
  vettafi: {
    rule: "Implemented at the rebalancing",
    trigger: "scheduled-review",
    reason: "VettaFi implements buy-backs that change shares outstanding at the rebalancing, never intra-quarter.",
    citation: "VettaFi Index Maintenance Policy v1.1.8 §4 (p.2)",
  },
};

/** Look up the rule for a (vendor, event) pair, with `undefined` if missing. */
export function getVendorRule(
  event: CanonicalEventId,
  vendor: VendorId,
): VendorRule | undefined {
  return VENDOR_RULES[event]?.[vendor];
}
