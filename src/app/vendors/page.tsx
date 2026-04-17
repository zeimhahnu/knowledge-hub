"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon,
  ChevronDownIcon,
  InfoIcon,
  TableIcon,
  ScaleIcon,
  ZapIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,

} from "lucide-react";

// ─── Sources / Footnotes ───────────────────────────────────────────────────

const SOURCES: Array<{
  vendor: string;
  doc: string;
  version: string;
  date?: string;
}> = [
  {
    vendor: "FTSE Russell",
    doc: "Corporate Actions and Events Guide for Market Capitalisation Weighted Indices",
    version: "v6.8",
    date: "October 2025",
  },
  {
    vendor: "STOXX",
    doc: "STOXX Calculation Guide",
    version: "April 2026",
  },
  {
    vendor: "S&P Dow Jones Indices",
    doc: "Equity Indices Policies & Practices",
    version: "March 2026",
  },
  {
    vendor: "Solactive",
    doc: "GPR Global 100 Index Guideline",
    version: "Mar 2026",
  },
  {
    vendor: "Morningstar",
    doc: "Corporate Actions Methodology",
    version: "Jan 2026",
  },
  {
    vendor: "VettaFi",
    doc: "Corporate Action Initiators Methodology + Index Maintenance Policy",
    version: "Apr 2026",
  },
  {
    vendor: "MSCI",
    doc: "MSCI Corporate Events Methodology",
    version: "2026",
  },
];

// ─── Category definitions ──────────────────────────────────────────────────

type CAField = {
  key: string;
  label: string;
  sortable?: boolean;
  critical?: boolean;
};

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  fields: CAField[];
  rows: Record<string, string>;
};

const VENDORS = ["MSCI", "S&P DJI", "FTSE Russell", "STOXX", "Solactive", "Morningstar", "VettaFi"] as const;

// ─── Cell renderer ─────────────────────────────────────────────────────────

type CellVariant = "text" | "critical" | "ok" | "warn" | "none" | "partial";

function getCell(vendor: string, key: string, value: string): { content: string; variant: CellVariant; note?: string } {
  const v = value.trim();

  if (v === "—" || v === "N/A" || v === "")
    return { content: "—", variant: "none" };

  // Critical flags
  const criticalPhrases = [
    "NO distinction",
    "divisor only",
    "zero on ex-date",
    "zero price",
    "applied to PR + TR/NTR",
    "NO price adj",
  ];
  for (const phrase of criticalPhrases) {
    if (v.toLowerCase().includes(phrase.toLowerCase())) {
      const note =
        phrase === "NO distinction" || phrase === "same as regular"
          ? `⚠️ ${vendor} treats this identically to regular cash dividends`
          : phrase === "divisor only"
          ? `⚠️ ${vendor} adjusts divisor only — NO price adjustment`
          : phrase === "zero on ex-date" || phrase === "zero price"
          ? `⚠️ ${vendor} sets ex-date price to zero`
          : phrase === "applied to PR + TR/NTR"
          ? `⚠️ UNIQUE: ${vendor} applies special dividends to PR index`
          : phrase === "NO price adj"
          ? `⚠️ ${vendor} does NOT adjust price for this event`
          : undefined;
      return { content: v, variant: "critical", note };
    }
  }

  // Warning for thresholds
  const warnPhrases = ["≥5%", ">5%", "≥5", "<5%", "≥10%", "≥90%", "≥85%", "≥75%", "≤5%"];
  if (warnPhrases.some((p) => v.includes(p)) && (v.includes("%") || v.includes("threshold"))) {
    return { content: v, variant: "warn" };
  }

  if (v.toLowerCase().includes("yes") && !v.toLowerCase().includes("no"))
    return { content: v, variant: "ok" };
  if (v.toLowerCase().includes("no") && !v.toLowerCase().includes("not"))
    return { content: v, variant: "none" };

  return { content: v, variant: "text" };
}

// ─── Data ──────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: "cash-div",
    label: "Cash Dividends",
    icon: ScaleIcon,
    color: "border-blue-500/30",
    fields: [
      { key: "Price Adj (PR)", label: "Price Adjustment (PR)" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "Ex-Date Treatment", label: "Ex-Date Treatment" },
      { key: "TR/NTR Reinvest", label: "TR/NTR Reinvested" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "Price Adj (PR)": "None — No PAF — None — None — None — None — None",
      "Divisor Change": "No — No — No — No — No — No — No",
      "Ex-Date Treatment": "PAF not applied — PAF not applied — PAF not applied — PAF not applied — PAF not applied — PAF not applied — None",
      "TR/NTR Reinvest": "Yes (gross/net) — Yes (gross/net) — Yes (gross/net) — Yes (gross/net) — Yes — Yes (gross/net) — Yes",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing",
    },
  },
  {
    id: "special-div",
    label: "Special Dividends",
    icon: ZapIcon,
    color: "border-amber-500/30",
    fields: [
      { key: "Threshold", label: "Threshold Rule" },
      { key: "Price Adj (PR)", label: "Price Adjustment" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "Formula", label: "Formula / Method" },
      { key: "Ex-Date Treatment", label: "Ex-Date Treatment" },
      { key: "Special Div → PR Index", label: "Special Div → PR Index" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      Threshold: "≥5% market price — 3rd consecutive = ordinary — 1st–3rd = special; 4th+ = ordinary — NO distinction — Case-by-case — ≥5% market price (from Aug 2024) — N/A",
      "Price Adj (PR)": "Yes — PAF applied — Yes — deducted from price — Yes — same as regular — Yes — N/A",
      "Divisor Change": "No — No — No — No — No — No — N/A",
      Formula: "PAF=(CumPx−Div)/CumPx — Standard PAF — Deducted — Same as regular — Per methodology — PAF=(PxExDate−1−GrossSpecDiv)/PxExDate−1 — N/A",
      "Ex-Date Treatment": "Ex-date drop — Ex-date drop — Ex-date drop — Same as ordinary — Per methodology — Ex-date drop — N/A",
      "Special Div → PR Index": "No — No — No — No — No — No — YES — applied to PR + TR/NTR ⚠️",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "splits",
    label: "Stock Splits",
    icon: TableIcon,
    color: "border-green-500/30",
    fields: [
      { key: "Split Shares", label: "Shares Adjusted" },
      { key: "Price", label: "Price Adjusted" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "Ex-Date Treatment", label: "Ex-Date Treatment" },
      { key: "Reverse Split", label: "Reverse Split" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "Split Shares": "×Split ratio — ×Split ratio — ×Split ratio — ×Split ratio — ×Split ratio — ×Split ratio — ×Split ratio",
      Price: "÷Split ratio — ÷Split ratio — ÷Split ratio — ÷Split ratio — ÷Split ratio — ÷Split ratio — ÷Split ratio",
      "Divisor Change": "No — No — No — No — No — No — No",
      "Ex-Date Treatment": "Adjusted — Adjusted — Adjusted — Adjusted — Adjusted — Adjusted — Adjusted",
      "Reverse Split": "÷Ratio (price ×) — ÷Ratio (price ×) — ÷Ratio (price ×) — ÷Ratio (price ×) — ÷Ratio (price ×) — ÷Ratio (price ×) — ÷Ratio (price ×)",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing",
    },
  },
  {
    id: "rights",
    label: "Rights Issues",
    icon: AlertTriangleIcon,
    color: "border-orange-500/30",
    fields: [
      { key: "In-the-Money", label: "In-the-Money" },
      { key: "Out-of-Money", label: "Out-of-Money" },
      { key: "Price Adj Method", label: "Price Adjustment" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "New Shares Not Entitled", label: "New Shares — Not Entitled" },
      { key: "Highly Dilutive (>10:1)", label: "Highly Dilutive (>10:1)" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "In-the-Money": "Sub < Market → adjust — Sub < Market → adjust — At discount → adjust — Standard — Adjust — Sub < Market → adjust — N/A",
      "Out-of-Money": "No adj — No adj — No adj — No adj — No adj — No adj — N/A",
      "Price Adj Method": "TERP calculated — Value of rights formula — Value of rights deducted — Price adj — Per methodology — TERP calculated — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes — Yes — Yes — N/A",
      "New Shares Not Entitled": "Price adj reflects div in sub price — Same — 3 temp lines (nil-paid, call dummy, new shares) — — — — N/A",
      "Highly Dilutive (>10:1)": "Special safeguards — 2 temp lines (rights value + sub cash) — 3 temp lines — HDRI if >5% mkt cap — Per methodology — — N/A",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "spin-offs",
    label: "Spin-offs",
    icon: CheckCircleIcon,
    color: "border-cyan-500/30",
    fields: [
      { key: "Parent Price Adj", label: "Parent Price Adjustment" },
      { key: "Child Added", label: "Child Security Added" },
      { key: "Child Ex-Date Price", label: "Child Ex-Date Price" },
      { key: "Grace Period", label: "Grace Period" },
      { key: "Ineligible Child", label: "Ineligible Child Treatment" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "Parent Price Adj": "Yes — deducted by distribution value — No adj on ex-date — Yes — deducted by distribution value — Yes — deducted by distribution value — Yes — N/A",
      "Child Added": "If eligible — Yes — If eligible — If eligible — If eligible — Yes — N/A",
      "Child Ex-Date Price": "Market/zero — Zero on ex-date — Estimated if not trading — Market price — — Zero price — N/A",
      "Grace Period": "— — 20 consecutive trading days — 20 business days — — 40 days (India: 60) — N/A",
      "Ineligible Child": "— — Replaces lowest ranked — Added ex-date, deleted at mkt price — Replaces lowest ranked — — — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes — Yes — Yes — N/A",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "secondaries",
    label: "Secondary Offerings",
    icon: AlertTriangleIcon,
    color: "border-purple-500/30",
    fields: [
      { key: "Threshold", label: "Threshold" },
      { key: "Price Adjustment", label: "Price Adjustment" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "Intra-Quarter", label: "Intra-Quarter" },
      { key: "Below Threshold", label: "Below Threshold" },
      { key: "Exception", label: "Exception" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      Threshold: "≥5% of issued shares — ≥5% + US$150M (BOTH) — >1% cumulative per quarter — ±10% = extraordinary — Per ex-date — Materiality — N/A",
      "Price Adjustment": "PAF applied — PAF applied — If decided by committee — NO price adj — divisor only ⚠️ — PAF applied — PAF applied — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes (primary method) — Yes — Yes — N/A",
      "Intra-Quarter": "Immediate — Immediate if ≥5%+$150M — Immediate if ≥USD1bn cap impact — ±10% → immediate +2 days — Per ex-date — Immediate — N/A",
      "Below Threshold": "Accumulated QIR — Accumulated QIR — Quarterly review — Next quarterly review — — — N/A",
      Exception: "— — US$1B → immediate even if <5% — — — — N/A",
      "QIR vs Ongoing": "Ongoing (≥5%); QIR (<5%) — Ongoing (≥5%+$150M); QIR (below) — QIR (>1% cum); Ongoing (intra-qtr) — Ongoing (>±10%); QIR (below) — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "mergers",
    label: "Mergers & Acquisitions",
    icon: CheckCircleIcon,
    color: "border-red-500/30",
    fields: [
      { key: "Target Deletion", label: "Target Deletion Threshold" },
      { key: "Notice", label: "Notice Period" },
      { key: "Acquirer Shares", label: "Acquirer Shares Adjusted" },
      { key: "M&A Minimum", label: "M&A Minimum Size" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "Target Deletion": "When deal unconditional — Float <15% or ≥90% acceptance — ≥90% held or Float <5% — ≥85% acquired or Float <10% — When effective — When completed — N/A",
      Notice: "— — 1–2 business days — Min T+2 — +2 trading days — — — N/A",
      "Acquirer Shares": "Increased per terms — Increased per terms — Increased per terms — Adjusted — Adjusted — Adjusted — N/A",
      "M&A Minimum": "No minimum — No minimum — Per terms — — — — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes — Yes — Yes — N/A",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "free-float",
    label: "Free Float / IWF",
    icon: TableIcon,
    color: "border-teal-500/30",
    fields: [
      { key: "Trigger", label: "Trigger" },
      { key: "Notice", label: "Notice" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "Price Adjustment", label: "Price Adjustment" },
      { key: "Implementation", label: "Implementation" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      Trigger: "PIF methodology — ≥5% total shares + IWF change ≥5 — >3pp (>15% float); >1pp (5–15%); >0.25pp (≤5%) — ≥5pp free float factor — Per methodology — Significant changes — N/A",
      Notice: "Per schedule — Quarterly — Min 2 trading days — Announced +2 trading days — — — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes — Yes — Yes — N/A",
      "Price Adjustment": "No — No — No — No — No — No — N/A",
      Implementation: "Per schedule — Quarterly (Mar/Jun/Sep/Dec) — Per schedule — Extraordinary (≥5pp) — Per methodology — Per methodology — N/A",
      "QIR vs Ongoing": "QIR — QIR (≥5%+IWF≥5); Annual (below) — Ongoing (extraordinary); QIR (below) — Ongoing (extraordinary); QIR (below) — QIR — QIR — N/A",
    },
  },
  {
    id: "tenders",
    label: "Tender Offers",
    icon: AlertTriangleIcon,
    color: "border-yellow-500/30",
    fields: [
      { key: "Replacement Threshold", label: "Replacement Threshold" },
      { key: "Acquirer Added", label: "Acquirer Added" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "Replacement Threshold": "On completion — ≥75% acceptance — Min 2 days notice — — — — N/A",
      "Acquirer Added": "— — Yes — Yes — — — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes — Yes — Yes — N/A",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "return-cap",
    label: "Return of Capital",
    icon: ScaleIcon,
    color: "border-emerald-500/30",
    fields: [
      { key: "Treatment", label: "Treatment" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      Treatment: "Special dividend — Special dividend — Price adj on ex-date — Price adj — Per methodology — Special dividend if outside normal pattern — N/A",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
  {
    id: "bankruptcy",
    label: "Bankruptcy / Delisting",
    icon: XCircleIcon,
    color: "border-rose-500/30",
    fields: [
      { key: "Removal Price", label: "Removal Price" },
      { key: "Divisor Change", label: "Divisor Change" },
      { key: "QIR vs Ongoing", label: "Timing" },
    ],
    rows: {
      "Removal Price": "Zero or last traded — Zero (if no primary price) — Cash terms if halted — Traded > OTC > 0.0000001 — Zero — Zero/nominal — N/A",
      "Divisor Change": "Yes — Yes — Yes — Yes — Yes — Yes — N/A",
      "QIR vs Ongoing": "Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — Ongoing — N/A",
    },
  },
];

// ─── Cell Component ─────────────────────────────────────────────────────────

function Cell({ content, variant, note }: { content: string; variant: CellVariant; note?: string }) {
  const base =
    "px-3 py-2 text-xs leading-relaxed break-words max-w-[200px]";

  if (variant === "none")
    return <span className={`${base} text-muted-foreground`}>{content}</span>;
  if (variant === "critical")
    return (
      <span
        className={`${base} font-semibold text-amber-400 bg-amber-500/10 rounded-md block`}
        title={note}
      >
        {content}
      </span>
    );
  if (variant === "warn")
    return <span className={`${base} text-orange-400`}>{content}</span>;
  if (variant === "ok")
    return <span className={`${base} text-green-400`}>{content}</span>;
  return <span className={`${base}`}>{content}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VendorDashboard() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSources, setShowSources] = useState(false);
  const [showDecision, setShowDecision] = useState(false);

  const cat = CATEGORIES.find((c) => c.id === activeCategory)!;

  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return cat.fields;
    const q = searchQuery.toLowerCase();
    return cat.fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        cat.rows[f.key]?.toLowerCase().includes(q)
    );
  }, [cat, searchQuery]);

  const criticalFields = useMemo(() => {
    return cat.fields.filter((f) => {
      const vals = cat.rows[f.key]?.split(" — ") ?? [];
      return vals.some((v) =>
        ["no distinction", "divisor only", "zero on ex-date", "zero price",
          "applied to pr + tr/ntr", "no price adj"].some((p) =>
          v.toLowerCase().includes(p)
        )
      );
    });
  }, [cat]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Vendor Methodology Matrix
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Corporate action treatment across 7 index providers — interactive reference
              </p>
            </div>
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
            >
              <InfoIcon className="h-4 w-4" />
              Sources &amp; Footnotes
            </button>
          </div>
        </div>
      </header>

      {/* Sources Panel */}
      <AnimatePresence>
        {showSources && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-border bg-muted/10"
          >
            <div className="mx-auto max-w-7xl px-6 py-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Document Sources &amp; Versions
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {SOURCES.map((s) => (
                  <div
                    key={s.vendor}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="mb-1 text-sm font-semibold">{s.vendor}</div>
                    <div className="text-xs text-muted-foreground">{s.doc}</div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {s.version}
                      {s.date && <span className="text-muted-foreground">· {s.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Critical callouts */}
      {criticalFields.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-500">
              <AlertTriangleIcon className="h-4 w-4" />
              Critical Rules in This Category
            </div>
            <div className="flex flex-wrap gap-2">
              {criticalFields.map((f) => (
                <span
                  key={f.key}
                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400"
                >
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === c.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <c.icon className="h-3.5 w-3.5 shrink-0" />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter rows…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mx-auto max-w-7xl px-6 pb-12">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="min-w-[180px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Field
                </th>
                {VENDORS.map((v) => (
                  <th
                    key={v}
                    className="min-w-[160px] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-muted-foreground">{v}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFields.map((field, fi) => {
                const values = (cat.rows[field.key] ?? "").split(" — ");
                return (
                  <tr
                    key={field.key}
                    className={`border-b border-border/50 ${
                      fi % 2 === 0 ? "bg-card" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {field.label}
                    </td>
                    {VENDORS.map((v, vi) => {
                      const { content, variant, note } = getCell(
                        v,
                        field.key,
                        values[vi] ?? "—"
                      );
                      return (
                        <td
                          key={v}
                          className="px-2 py-2 text-center"
                          title={note}
                        >
                          <Cell
                            content={content}
                            variant={variant}
                            note={note}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {filteredFields.length === 0 && (
                <tr>
                  <td
                    colSpan={VENDORS.length + 1}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No matching rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Critical rule — unique or divergent
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
            Threshold or numeric detail
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
            Confirmed / adjusted
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
            Not applicable / no change
          </div>
        </div>

        {/* Quick Decision Guide */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Decision Guide
            </h3>
            <button
              onClick={() => setShowDecision(!showDecision)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showDecision ? "Hide" : "Show"}
              <ChevronDownIcon
                className={`h-3 w-3 transition-transform ${showDecision ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <AnimatePresence>
            {showDecision && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-6 font-mono text-xs leading-relaxed">
                  <div>
                    <div className="mb-1 font-semibold text-amber-400">SPECIAL DIVIDEND?</div>
                    <pre className="rounded-lg bg-muted/50 p-3 text-muted-foreground">{`├─ STOXX → Same as ordinary (NO distinction) ⚠️
├─ MSCI → ≥5% = special; <5% = ordinary
├─ Morningstar → ≥5% = special; <5% = ordinary
├─ S&P DJI → 1st-2nd special; 3rd = last special; 4th+ = ordinary
├─ FTSE Russell → 1st-3rd special; 4th+ = ordinary
└─ Solactive → Case-by-case`}</pre>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-amber-400">SECONDARY OFFERING?</div>
                    <pre className="rounded-lg bg-muted/50 p-3 text-muted-foreground">{`├─ STOXX → Divisor ONLY (NO price adjustment) ⚠️
├─ S&P DJI → ≥5% + US$150M BOTH required
├─ MSCI → ≥5%
├─ FTSE Russell → >1% cumulative = quarterly
└─ Solactive/Morningstar → Per ex-date / materiality`}</pre>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-amber-400">SPIN-OFF EX-DATE PRICE?</div>
                    <pre className="rounded-lg bg-muted/50 p-3 text-muted-foreground">{`├─ S&P DJI → ZERO
├─ Morningstar → Zero
├─ FTSE Russell → Estimated
└─ STOXX/MSCI → Market price`}</pre>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-amber-400">SPECIAL DIVIDEND → PRICE RETURN INDEX?</div>
                    <pre className="rounded-lg bg-muted/50 p-3 text-muted-foreground">{`├─ VettaFi → YES (to PR + TR/NTR) ⚠️ UNIQUE
└─ All others → No (only to TR/NTR)`}</pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>
            Last updated: 2026-04-16 · Sources: FTSE v6.8 · STOXX Apr 2026 · S&P Mar 2026 ·
            Solactive Mar 2026 · Morningstar Jan 2026 · VettaFi Apr 2026 · MSCI 2026
          </div>
          <div>Built with React 19 + Tailwind v4 + Framer Motion</div>
        </div>
      </div>
    </div>
  );
}
