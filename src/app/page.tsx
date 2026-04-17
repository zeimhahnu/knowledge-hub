"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChevronDownIcon,
  CompassIcon,
  ClockIcon,
  FileTextIcon,
  GlobeIcon,
  HelpCircleIcon,
  LightbulbIcon,
  NetworkIcon,
  ZapIcon,
} from "lucide-react";


// ─── Coverage Data (T-5 for all vendors) ───────────────────────────────────

const COVERAGE: Record<string, { coverage: string; asOf: string; coversUntil: string; note: string }> = {
  MSCI: {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "End-of-day snapshot, 5 business day forward coverage",
  },
  "S&P DJI": {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "Includes preliminary constituent projections",
  },
  "FTSE Russell": {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "Open projection data updated daily",
  },
  STOXX: {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "Announced changes effective within 5 business days",
  },
  Solactive: {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "GPR Global 100: semi-annual rebalance (next: Jun 2026)",
  },
  Morningstar: {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "Global Index: daily updates; 40-day grace period on spin-offs",
  },
  VettaFi: {
    coverage: "T-5",
    asOf: "16 Apr 2026 (close)",
    coversUntil: "23 Apr 2026",
    note: "ETF-focused benchmarks",
  },
};

// ─── Decision Tree Types ─────────────────────────────────────────────────────

type Option = {
  label: string;
  sub: string;
  color: string;
  scenarios?: string[];
};

type Step = {
  step: number;
  question: string;
  hint: string;
  options: Option[];
};

// ─── Vendor Coverage Cards ───────────────────────────────────────────────────

function CoverageCard({
  vendor,
  data,
}: {
  vendor: string;
  data: (typeof COVERAGE)[string];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{vendor}</span>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
          {data.coverage}
        </span>
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ClockIcon className="h-3 w-3 shrink-0" />
          <span>As of: {data.asOf}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GlobeIcon className="h-3 w-3 shrink-0" />
          <span>Covers: {data.coversUntil}</span>
        </div>
        <p className="pt-1 leading-relaxed">{data.note}</p>
      </div>
    </div>
  );
}

// ─── Decision Tree Node ──────────────────────────────────────────────────────

function DecisionNode({ step, onSelect }: { step: Step; onSelect: (label: string) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {step.step}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 font-semibold">{step.question}</h3>
          <p className="text-xs text-muted-foreground">{step.hint}</p>
        </div>
      </div>
      <div className={`grid gap-2 px-5 pb-5 ${step.options.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {step.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSelect(opt.label)}
            className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${opt.color}`}
          >
            <div className="mb-1 text-xs font-semibold">{opt.label}</div>
            <div className="text-[11px] opacity-80 leading-relaxed">{opt.sub}</div>
            {opt.scenarios && (
              <div className="mt-2 rounded-lg bg-black/20 p-2">
                {opt.scenarios.map((s) => (
                  <div key={s} className="text-[10px] leading-relaxed opacity-70">
                    • {s}
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Real Scenario Cases ─────────────────────────────────────────────────────

const REAL_CASES = [
  {
    title: "Case 1 — Rights Issue: Only Target in Index",
    event: "Voluntary / Rights Issue",
    setup: "Company B (target) is in the index. Company C (acquirer) is NOT in the index. Company B announces a rights issue to fund an acquisition.",
    steps: [
      {
        q: "Who is in your managed index?",
        a: "Company B (target) is in the index. Company C (acquirer) is NOT in the index.",
        color: "text-amber-400",
      },
      {
        q: "Is Company B eligible for the rights issue?",
        a: "Yes — it announced the rights issue. But it's voluntary: not all shareholders will participate.",
        color: "text-green-400",
      },
      {
        q: "Does it exceed each vendor's threshold?",
        a: "MSCI: Rights issue -> no price adjustment (detached). S&P: No adjustment until ex-date. FTSE: No adjustment if <10% of shares. STOXX: No adjustment — rights are not cash dividends. Only vendors with explicit thresholds above the rights ratio will react.",
        color: "text-orange-400",
      },
      {
        q: "What shows in projection data?",
        a: "Because rights are voluntary and require shareholder action, vendors with low thresholds (FTSE <10%) may show small free-float changes. MSCI and STOXX may show nothing until the subscription results are known.",
        color: "text-blue-400",
      },
    ],
    divergencePoint: "Threshold sensitivity: FTSE monitors free float changes from non-participating shareholders. MSCI and STOXX may ignore until results.",
  },
  {
    title: "Case 2 — M&A: Only Acquirer in Index",
    event: "Mandatory / M&A",
    setup: "Company D (acquirer) is in the index. Company E (target) is NOT in the index. Company D announces acquisition of Company E.",
    steps: [
      {
        q: "Who is in your managed index?",
        a: "Company D (acquirer) is in the index. Company E (target) is NOT in the index.",
        color: "text-amber-400",
      },
      {
        q: "Does the acquirer's share change exceed each vendor's threshold?",
        a: "MSCI: 5%/10%/25% for Standard/Small/Micro caps. S&P: Float <15% OR >=90% acceptance (but E not in index). FTSE: >=90% held OR Float <5%. STOXX: Extraordinary free float adjustment if change ≥5 percentage points.",
        color: "text-green-400",
      },
      {
        q: "What happens to Company D's shares in the index?",
        a: "Adjusted per exchange terms (new shares issued to fund acquisition). Divisor adjusted to absorb market cap change. The adjustment depends on the exchange ratio and whether it's a cash or stock deal.",
        color: "text-blue-400",
      },
      {
        q: "Divergence point?",
        a: "Cash vs stock deal treatment: MSCI adjusts PR for stock-settled deals (new shares issued). S&P adjusts for all M&A. FTSE adjusts per terms. STOXX: extraordinary free float adj if >=5pp change. The divergence is in HOW each vendor measures and applies the share change.",
        color: "text-red-400",
      },
    ],
    divergencePoint: "Share issuance threshold: MSCI/S&P/FTSE/STOXX each measure the acquirer's share change differently. Stock deals trigger bigger adjustments than cash deals.",
  },
  {
    title: "Case 3 — M&A: Target AND Acquirer in Same Index",
    event: "Mandatory / M&A",
    setup: "Both Company F (target) and Company G (acquirer) are in the same index. Company G acquires Company F.",
    steps: [
      {
        q: "Who is in your managed index?",
        a: "Both Company F (target) AND Company G (acquirer) are in the same index.",
        color: "text-amber-400",
      },
      {
        q: "Does the deal meet each vendor's deletion threshold?",
        a: "MSCI: Deal unconditional (no fixed %). S&P: Float <15% OR >=90% acceptance -> target deleted. FTSE: >=90% held OR Float <5% -> deleted. STOXX: >=85% acquired AND Float <10% BOTH must be met. Solactive: Float <15% + deal unconditional.",
        color: "text-green-400",
      },
      {
        q: "Target deleted — what happens to acquirer?",
        a: "Company G's shares are adjusted per exchange ratio. The divisor absorbs the combined market cap change. STOXX: surviving stock replaces largest original stock in Benchmark index.",
        color: "text-blue-400",
      },
      {
        q: "Divergence point?",
        a: "THRESHOLD TIMING: S&P's Float <15% trigger can delete the target BEFORE the 90% acceptance threshold is met. FTSE's Float <5% can fire independently of deal completion. STOXX requires BOTH conditions — the strictest. Same deal, different deletion dates across vendors.",
        color: "text-red-400",
      },
    ],
    divergencePoint: "Deletion threshold: STOXX is strictest (BOTH conditions). S&P is most aggressive (Float <15% alone can trigger). FTSE is binary (>=90% OR Float <5%).",
  },
  {
    title: "Case 4 — Spin-off: One Child Eligible, One Not",
    event: "Mandatory / Spin-off",
    setup: "Company H distributes Company I and Company J to shareholders. Company I is index-eligible. Company J is NOT eligible (wrong sector/domicile).",
    steps: [
      {
        q: "Who is in your managed index?",
        a: "Company H (parent) is in the index. Company I (child) may be eligible. Company J (child) is NOT eligible.",
        color: "text-amber-400",
      },
      {
        q: "What happens to the parent on ex-date?",
        a: "All vendors deduct the spin-off value from the parent price on the ex-date. The divisor reflects the reduced market cap of Company H alone.",
        color: "text-green-400",
      },
      {
        q: "What happens to eligible child Company I?",
        a: "S&P/Morningstar: zero-price placeholder added to projection immediately. FTSE: estimated price placeholder. Solactive: 0.00000001 floor. MSCI: when-issued or zero. STOXX: market price only (no placeholder).",
        color: "text-blue-400",
      },
      {
        q: "What happens to ineligible child Company J?",
        a: "Not added by any vendor — does not appear in projection data at all. The divergence here is between vendors that use placeholder prices (visible in projections) vs. vendors that wait for real trading prices.",
        color: "text-purple-400",
      },
    ],
    divergencePoint: "Placeholder vs. real price: MSTAR/S&P show Company I in projections immediately (zero placeholder). STOXX waits for first trade — may not show Company I for days.",
  },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [started, setStarted] = useState(false);
  const [stepAnswers, setStepAnswers] = useState<Record<number, string>>({});
  const [showCases, setShowCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState<number | null>(null);

  const steps: Step[] = [
    {
      step: 1,
      question: "Who is in your managed index?",
      hint: "The first split. Identify which parties are tracked — the treatment depends entirely on which entities are in your index.",
      options: [
        {
          label: "Only Target",
          sub: "Target is in the index. Acquirer is NOT in the index.",
          color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          scenarios: [
            "→ M&A: target deleted when deal unconditional + float threshold met",
            "→ Rights: target eligible but voluntary — thresholds vary",
            "→ Spin-off: parent in index, child may or may not be added",
          ],
        },
        {
          label: "Only Acquirer",
          sub: "Acquirer is in the index. Target is NOT in the index.",
          color: "bg-blue-500/10 border-blue-500/30 text-blue-400",
          scenarios: [
            "→ M&A: acquirer shares adjusted per exchange terms",
            "→ Threshold: share issuance size triggers divisor adj",
            "→ Cash vs stock deal = different adjustment types",
          ],
        },
        {
          label: "Both Target & Acquirer",
          sub: "Both the target and acquirer are in the same index.",
          color: "bg-green-500/10 border-green-500/30 text-green-400",
          scenarios: [
            "→ M&A: target deleted + acquirer adjusted",
            "→ Divergence: deletion thresholds differ by vendor",
            "→ Both trigger divisor adjustment",
          ],
        },
        {
          label: "Single Company Event",
          sub: "No acquisition involved — stock split, dividend, delisting.",
          color: "bg-muted/20 border-muted text-muted-foreground",
          scenarios: [
            "→ Cash dividend: no price adj on PR; divisor reduces",
            "→ Stock split: price adjusted, divisor unchanged",
            "→ Delisting: removed at last traded or 0.0000001",
          ],
        },
      ],
    },
    {
      step: 2,
      question: "What type of event is it?",
      hint: "Mandatory events are triggered by the company automatically. Voluntary events require shareholder action — which means not all shareholders participate, creating free float uncertainty.",
      options: [
        {
          label: "Mandatory",
          sub: "Cash dividend, Stock split, Merger (unconditional), Bonus issue, Return of capital, Spin-off, Bankruptcy",
          color: "bg-green-500/10 border-green-500/30 text-green-400",
        },
        {
          label: "Voluntary",
          sub: "Rights issue, Tender offer, Secondary offering, Private placement, Partial tender",
          color: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        },
      ],
    },
    {
      step: 3,
      question: "Is the resulting entity or security index-eligible?",
      hint: "If the spin-off child, new shares from a conversion, or shares from a stock distribution fail size, liquidity, sector, or domicile criteria — no vendor will add it. Check each vendor's eligibility rules.",
      options: [
        {
          label: "Eligible",
          sub: "Continue to threshold check",
          color: "bg-green-500/10 border-green-500/30 text-green-400",
        },
        {
          label: "Not eligible",
          sub: "All vendors skip — divergence ends here. Parent price adjusted for distribution value.",
          color: "bg-red-500/10 border-red-500/30 text-red-400",
        },
      ],
    },
    {
      step: 4,
      question: "Does it exceed each vendor's recognition threshold?",
      hint: "This is the most common divergence point. Different vendors have different materiality thresholds. Below-threshold events accumulate to the next Quarterly Index Review (QIR).",
      options: [
        {
          label: "Above all thresholds",
          sub: "All vendors should recognise — check timing (ex-date vs effective date)",
          color: "bg-green-500/10 border-green-500/30 text-green-400",
        },
        {
          label: "Mixed — some above",
          sub: "Divergence is HERE. Check each vendor threshold table on the Vendors page.",
          color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        },
        {
          label: "Below all thresholds",
          sub: "Deferred to QIR. Solactive GPR Global 100 is SEMI-ANNUAL — events can miss an entire cycle.",
          color: "bg-muted/20 border-muted text-muted-foreground",
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <CompassIcon className="h-4 w-4 text-primary" />
              Index Vendor Intelligence — for System Analysts &amp; Data Engineers
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Why does one vendor show it —
              <br className="hidden md:block" />
              <span className="text-primary"> but not the others?</span>
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-muted-foreground">
              Corporate action projection data never matches across all vendors.
              Same event, same security — but one vendor shows it today, another
              shows it next week, and a third ignores it entirely.
              <br />
              <strong className="text-foreground">This tool explains why.</strong>
            </p>

            {/* Coverage Period Banner */}
            <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <ClockIcon className="h-4 w-4" />
                Current Coverage Period — All Vendors
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(COVERAGE).map(([vendor, data]) => (
                  <div key={vendor} className="rounded-lg bg-card border border-border p-2 text-left">
                    <div className="text-[10px] font-semibold text-foreground">{vendor}</div>
                    <div className="text-[10px] text-muted-foreground">{data.asOf}</div>
                    <div className="text-[10px] text-primary font-medium">→ {data.coversUntil}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Data as of close {COVERAGE.MSCI.asOf} covers {COVERAGE.MSCI.coversUntil} (5 business days forward).
                Open constituent projections available at T-5 for all vendors.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setStarted(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
              >
                <ZapIcon className="h-4 w-4" />
                Decision Tree
                <ArrowRightIcon className="h-4 w-4" />
              </button>
              <Link
                href="/vendors/"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
              >
                <BookOpenIcon className="h-4 w-4" />
                Vendor Reference
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Coverage Period Detail ─────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Coverage Period by Vendor</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(COVERAGE).map(([vendor, data]) => (
            <CoverageCard key={vendor} vendor={vendor} data={data} />
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">What does T-5 mean?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            T-5 means the data available on any given day covers the next 5 business days. If today is <strong className="text-foreground">17 April 2026</strong> and you receive open constituent projection data, the data reflects the state as of <strong className="text-foreground">16 April 2026 (market close)</strong>. That snapshot covers all corporate action events scheduled up to and including <strong className="text-foreground">23 April 2026</strong> — 5 business days forward.
          </p>
        </div>
      </section>

      {/* ── Real Cases ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-10 border-t border-border">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Real Scenarios</h2>
            <p className="text-sm text-muted-foreground">Based on cases from Franklin Templeton operations</p>
          </div>
          <button
            onClick={() => setShowCases(!showCases)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold transition-all hover:bg-muted"
          >
            {showCases ? "Hide Cases" : "Show Cases"}
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showCases ? "rotate-180" : ""}`} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showCases && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {REAL_CASES.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCase(selectedCase === i ? null : i)}
                    className={`rounded-2xl border p-5 text-left transition-all hover:scale-[1.01] ${
                      selectedCase === i
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold text-primary">{c.event}</div>
                    <div className="mb-2 text-sm font-bold">{c.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.setup}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                      <LightbulbIcon className="h-3 w-3" />
                      <span>Divergence: {c.divergencePoint}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Expanded Case Detail */}
              <AnimatePresence>
                {selectedCase !== null && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                      <h3 className="mb-4 text-sm font-bold text-primary">
                        {REAL_CASES[selectedCase].title}
                      </h3>
                      <div className="space-y-4">
                        {REAL_CASES[selectedCase].steps.map((s, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border text-xs font-bold">
                              {i + 1}
                            </div>
                            <div>
                              <div className={`text-sm font-semibold ${s.color}`}>{s.q}</div>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.a}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                          <LightbulbIcon className="h-3 w-3" />
                          Divergence Point
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {REAL_CASES[selectedCase].divergencePoint}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Decision Tree ───────────────────────────────────────────────── */}
      {started && (
        <section className="mx-auto max-w-5xl px-6 py-16 border-t border-border">
          {/* Back button */}
          <button
            onClick={() => {
              setStarted(false);
              setStepAnswers({});
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to overview
          </button>

          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold">Find the divergence point</h2>
            <p className="text-sm text-muted-foreground">
              Walk through each step. Your answers identify which scenario applies — and which vendor thresholds matter for your case.
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((s) => (
              <DecisionNode
                key={s.step}
                step={s}
                onSelect={(label) =>
                  setStepAnswers((prev) => ({ ...prev, [s.step]: label }))
                }
              />
            ))}
          </div>

          {/* Next step CTA */}
          {stepAnswers[1] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6"
            >
              <p className="mb-3 text-sm font-semibold text-primary">
                Based on your selection:{" "}
                <span className="text-foreground">{stepAnswers[1]}</span>
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Now check the vendor-specific thresholds on the Vendors page for the exact
                event type. Each vendor&apos;s deletion triggers, grace periods, and adjustment
                formulas are documented there.
              </p>
              <Link
                href="/vendors/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Go to Vendor Thresholds
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </section>
      )}

      {/* ── Quick Links ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-10 border-t border-border">
        <h2 className="mb-6 text-lg font-bold">Quick Reference</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/vendors/"
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <BookOpenIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="text-sm font-semibold mb-1">Vendor Reference</div>
            <p className="text-xs text-muted-foreground">
              Deletion triggers, PAF formulas, and timing for all 12 event types
            </p>
          </Link>
          <Link
            href="/vendors/iso-taxonomy/"
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <NetworkIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="text-sm font-semibold mb-1">ISO Taxonomy</div>
            <p className="text-xs text-muted-foreground">
              ISO 20022 CAEV codes mapped to SWIFT MT564 and vendor terminology
            </p>
          </Link>
          <Link
            href="/vendors/event-extraction/"
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <FileTextIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="text-sm font-semibold mb-1">Event Extraction</div>
            <p className="text-xs text-muted-foreground">
              Detailed parameter extraction from vendor methodology documents
            </p>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-5">
            <HelpCircleIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="text-sm font-semibold mb-1">Need Help?</div>
            <p className="text-xs text-muted-foreground">
              Ask about a specific event type or vendor — include the ticker and event date for fastest response
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
