"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ProjectionGapSimulator } from "@/components/projection-gap-simulator";
import { buildDecisionTreeStep2, METHODOLOGY_T5_COVERAGE } from "@/lib/event-taxonomy";
import { SurfaceSection } from "@/components/surface-section";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CompassIcon,
  GitBranchIcon,
  GlobeIcon,
  HelpCircleIcon,
  LightbulbIcon,
  LineChartIcon,
  NetworkIcon,
} from "lucide-react";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const heroActionClassName =
  "motion-safe:transition-transform motion-safe:hover:scale-[1.02] inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-12 sm:px-5 sm:py-3.5 sm:text-base";

// ─── Real Scenarios ──────────────────────────────────────────────────────────

const REAL_CASES = [
  {
    title: "Rights Issue — Only Target in Index",
    event: "Voluntary / Rights Issue",
    color: "text-orange-400",
    border: "border-orange-500/30",
    setup: "Company B (target) is in the index. Company C (acquirer) is NOT. Company B announces a rights issue to fund an acquisition.",
    divergence: "FTSE monitors free float changes from non-participating shareholders. MSCI and STOXX may ignore until subscription results are known.",
    steps: [
      { q: "Who is in the index?", a: "Company B (target) only. Company C (acquirer) is NOT in the index." },
      { q: "Does it exceed threshold?", a: "MSCI: Rights issue — no price adj (detached). S&P: No adj until ex-date. FTSE: No adj if <10% of shares affected. STOXX: No adj — not a cash dividend." },
      { q: "Divergence?", a: "FTSE <10% free float threshold may trigger a small adjustment. MSCI/STOXX show nothing until results. One vendor shows it, others don't." },
    ],
  },
  {
    title: "M&A — Only Acquirer in Index",
    event: "Mandatory / M&A",
    color: "text-blue-400",
    border: "border-blue-500/30",
    setup: "Company D (acquirer) is in the index. Company E (target) is NOT. Company D announces acquisition of Company E.",
    divergence: "Stock deals trigger bigger share adjustments than cash deals. Divergence is in HOW each vendor measures and applies the acquirer's share change.",
    steps: [
      { q: "Who is in the index?", a: "Company D (acquirer) only. Company E (target) is NOT in the index." },
      { q: "What triggers adjustment?", a: "MSCI: 5%/10%/25% for cap tier. S&P: Per exchange terms. FTSE: Free float change >=5pp. STOXX: Extraordinary float adj if >=5pp change." },
      { q: "Divergence?", a: "Cash vs stock deal = different adjustment types. Same deal, different divisor impact across vendors." },
    ],
  },
  {
    title: "M&A — Both Target & Acquirer in Same Index",
    event: "Mandatory / M&A",
    color: "text-green-400",
    border: "border-green-500/30",
    setup: "Both Company F (target) AND Company G (acquirer) are in the same index. Company G acquires Company F.",
    divergence: "STOXX is strictest (BOTH >=85% acquired AND Float <10%). S&P is most aggressive (Float <15% alone triggers). Same deal — different deletion dates.",
    steps: [
      { q: "Who is in the index?", a: "Both Company F (target) AND Company G (acquirer) are in the same index." },
      { q: "What triggers target deletion?", a: "MSCI: Deal unconditional. S&P: Float <15% OR >=90% acceptance. FTSE: >=90% held OR Float <5%. STOXX: BOTH >=85% acquired AND Float <10%." },
      { q: "Divergence?", a: "S&P Float <15% can delete target BEFORE 90% acceptance. STOXX needs BOTH conditions. Same deal, different deletion dates." },
    ],
  },
  {
    title: "Spin-off — One Child Eligible, One Not",
    event: "Mandatory / Spin-off",
    color: "text-purple-400",
    border: "border-purple-500/30",
    setup: "Company H distributes Company I and Company J. Company I is index-eligible. Company J is NOT (wrong sector/domicile).",
    divergence: "MSTAR/S&P show Company I in projections immediately (zero placeholder). STOXX waits for first trade. Ineligible Company J never appears.",
    steps: [
      { q: "Who is in the index?", a: "Company H (parent) is in the index. Company I (child) may be added. Company J (child) is NOT eligible." },
      { q: "How does each vendor handle the eligible child?", a: "S&P/Morningstar: zero placeholder added immediately. FTSE: estimated price. Solactive: 0.00000001 floor. MSCI: when-issued or zero. STOXX: market price only (no placeholder)." },
      { q: "Divergence?", a: "STOXX waits for real trading — may not show Company I for days after S&P/MSTAR already show it. Same event, different projection dates." },
    ],
  },
];

// ─── Coverage Data ────────────────────────────────────────────────────────────

const COVERAGE = [
  { vendor: "MSCI", coverage: "T-5" },
  { vendor: "S&P DJI", coverage: "T-5" },
  { vendor: "FTSE Russell", coverage: "T-5" },
  { vendor: "STOXX", coverage: "T-5" },
  { vendor: "Solactive", coverage: "T-5" },
  { vendor: "Morningstar", coverage: "T-5" },
  { vendor: "VettaFi", coverage: "T-5" },
];

// ─── Decision Tree ───────────────────────────────────────────────────────────

const TREE_STEPS = [
  {
    step: 1,
    question: "Who is in your managed index?",
    hint: "The first split — treatment depends entirely on which parties are tracked.",
    options: [
      { label: "Only Target", sub: "Acquirer not in index", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
      { label: "Only Acquirer", sub: "Target not in index", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
      { label: "Both Target & Acquirer", sub: "Same index", color: "bg-green-500/10 border-green-500/30 text-green-400" },
      { label: "Single Company Event", sub: "Split, dividend, delisting", color: "bg-muted/20 border-muted text-muted-foreground" },
    ],
  },
  buildDecisionTreeStep2(),
  {
    step: 3,
    question: "Is the resulting entity INDEX-ELIGIBLE?",
    hint: "This checks if the spin-off child, new shares, or distributed security is ALLOWED in the index at all — size, liquidity, sector, domicile. If NOT eligible: no vendor adds it. Divergence ends.",
    options: [
      { label: "Eligible", sub: "Could be added — continue to Step 4", color: "bg-green-500/10 border-green-500/30 text-green-400" },
      { label: "Not eligible", sub: "No vendor adds it — divergence ends here", color: "bg-red-500/10 border-red-500/30 text-red-400" },
    ],
  },
  {
    step: 4,
    question: "Does it exceed each vendor's MATERIALITY threshold?",
    hint: "Different from Step 3. Step 3 = can this entity be in the index at all? Step 4 = is this event BIG enough to trigger adjustment NOW? Below threshold = deferred to QIR. This is the most common divergence point.",
    options: [
      { label: "Above all thresholds", sub: "All vendors recognise — check timing", color: "bg-green-500/10 border-green-500/30 text-green-400" },
      { label: "Mixed — some above, some below", sub: "Divergence is HERE — check each vendor threshold table", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
      { label: "Below all thresholds", sub: "Deferred to QIR. Solactive GPR Global 100 is semi-annual — events can miss an entire cycle", color: "bg-muted/20 border-muted text-muted-foreground" },
    ],
  },
  {
    step: 5,
    question: "Is it within each vendor's coverage window?",
    hint: `${METHODOLOGY_T5_COVERAGE} If the event falls within that forward window, vendors send projection data. If outside the window, it may not appear until the next update cycle.`,
    options: [
      { label: "Within coverage window", sub: "T-5 coverage — vendor sends projection data", color: "bg-green-500/10 border-green-500/30 text-green-400" },
      { label: "Outside coverage window", sub: "Not yet in projection data — watch for next update cycle", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
    ],
  },
  {
    step: 6,
    question: "When does each vendor actually process it?",
    hint: "Projection data ≠ effective adjustment. The ex-date and effective date may differ from when vendors first publish the event. Check the timing flow on the Vendors page for each event type.",
    options: [
      { label: "Check vendor timing flow", sub: "Ex-date vs effective date — each vendor handles differently", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
      { label: "Timeline is aligned", sub: "All vendors show at same time — no timing divergence", color: "bg-muted/20 border-muted text-muted-foreground" },
    ],
  },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [stepAnswers, setStepAnswers] = useState<Record<number, string>>({});

  return (
    <main className="min-h-screen bg-background text-foreground">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <div className="relative mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] xl:items-start xl:gap-12">
            <div className="min-w-0 text-center xl:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm xl:mx-0">
                  <CompassIcon className="h-4 w-4 text-primary" />
                  Vendor Corp. Action Intelligence
                </div>
                <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  Why does one vendor show it —
                  <br className="hidden md:block" />
                  <span className="text-primary"> but not the others?</span>
                </h1>
                <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground xl:mx-0">
                  Same event, same security, different projection data. Use the simulator
                  for a quick hypothesis, or walk the full decision tree — then check vendor
                  thresholds in the reference.
                </p>

                <div className="grid grid-cols-2 gap-3 sm:max-w-xl xl:max-w-none">
                  <Link href="/vendors/" className={heroActionClassName}>
                    <BookOpenIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    Vendor thresholds
                  </Link>
                  <Link href="/investors/" className={heroActionClassName}>
                    <LineChartIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    Investor snapshot
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToId("decision-tree")}
                    className={heroActionClassName}
                  >
                    <GitBranchIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    Find divergence point
                    <ArrowDownIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId("real-scenarios")}
                    className={heroActionClassName}
                  >
                    <LightbulbIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    Real scenarios
                    <ArrowDownIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  </button>
                </div>
              </motion.div>
            </div>
            <div className="flex min-w-0 w-full max-w-full flex-col gap-6 xl:self-start">
              <ProjectionGapSimulator />
              <div className="rounded-xl border border-border bg-card/60 px-4 py-4 sm:px-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Related tools
                </p>
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
                  <Link
                    href="/vendors/"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md outline-none"
                  >
                    <BookOpenIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Vendor thresholds
                  </Link>
                  <span className="hidden text-border sm:inline" aria-hidden>
                    ·
                  </span>
                  <Link
                    href="/investors/"
                    className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md outline-none"
                  >
                    <LineChartIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Investor snapshot
                  </Link>
                  <span className="hidden text-border sm:inline" aria-hidden>
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollToId("decision-tree")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md text-left text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background outline-none sm:min-h-0"
                  >
                    <CompassIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Find divergence point
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Real Scenarios ─────────────────────────────────────────────── */}
      <section id="real-scenarios" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-8">
        <SurfaceSection padding="comfortable">
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-bold">Real Scenarios from Operations</h2>
          <p className="text-sm text-muted-foreground">
            These are the cases that actually cause projection gaps. Click to expand each one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {REAL_CASES.map((c, i) => (
            <button
              key={i}
              onClick={() => setSelectedCase(selectedCase === i ? null : i)}
              className={`rounded-2xl border p-5 text-left transition-all hover:scale-[1.01] ${
                selectedCase === i
                  ? `border-primary bg-primary/10`
                  : `border-border bg-card hover:border-primary/50`
              }`}
            >
              <div className={`mb-1 text-xs font-semibold ${c.color}`}>{c.event}</div>
              <div className="mb-2 text-sm font-bold">{c.title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.setup}</p>
              <div className={`mt-3 flex items-center gap-1 text-xs ${c.color}`}>
                <LightbulbIcon className="h-3 w-3" />
                <span>{c.divergence}</span>
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
              className="overflow-hidden rounded-2xl border border-primary/30 bg-primary/5"
            >
              <div className="p-6">
                <div className={`mb-1 text-xs font-semibold ${REAL_CASES[selectedCase].color}`}>
                  {REAL_CASES[selectedCase].event}
                </div>
                <div className="mb-4 text-sm font-bold">{REAL_CASES[selectedCase].title}</div>
                <div className="space-y-4">
                  {REAL_CASES[selectedCase].steps.map((s, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border text-xs font-bold">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{s.q}</div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </SurfaceSection>
      </section>

      {/* ── Decision Tree ───────────────────────────────────────────────── */}
      <section id="decision-tree" className="mx-auto max-w-6xl border-t border-border px-6 py-16">
        <SurfaceSection padding="comfortable">
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-bold">Find the Divergence Point</h2>
          <p className="text-sm text-muted-foreground">
            Walk through each step. Your answers identify which scenario applies and which vendor thresholds matter.
          </p>
        </div>

        <div className="space-y-6">
          {TREE_STEPS.map((s) => (
            <div key={s.step} className="overflow-hidden rounded-xl border border-border bg-background/40">
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {s.step}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-semibold">{s.question}</h3>
                  <p className="text-xs text-muted-foreground">{s.hint}</p>
                </div>
              </div>
              <div className={`grid gap-2 px-5 pb-5 ${s.options.length === 4 ? "grid-cols-2 lg:grid-cols-4" : s.options.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                {s.options.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setStepAnswers((prev) => ({ ...prev, [s.step]: opt.label }))}
                    className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${opt.color}`}
                  >
                    <div className="mb-1 text-xs font-semibold">{opt.label}</div>
                    <div className="text-[11px] opacity-80 leading-relaxed">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA after completing tree */}
        {stepAnswers[1] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6"
          >
            <p className="mb-3 text-sm">
              <span className="font-semibold text-primary">Selected: </span>
              <span className="text-foreground">{stepAnswers[1]}</span>
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Now check the exact vendor thresholds, timing flow, and coverage window on the Vendors page.
            </p>
            <Link
              href="/vendors/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Go to Vendor Thresholds &amp; Timing
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </motion.div>
        )}

        {/* ── Event Timeline ──────────────────────────────────────────── */}
        <div className="mt-12 rounded-xl border border-border bg-background/40 p-6">
          <h3 className="mb-4 text-sm font-semibold">How a Corporate Action Moves Through the System</h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-5">
              {[
                {
                  phase: "1. Announcement",
                  desc: "Company announces the event: terms, ratio, distribution date. All vendors receive and monitor.",
                  vendors: "All vendors",
                  icon: "📢",
                },
                {
                  phase: "2. Coverage Window (T-5)",
                  desc: `${METHODOLOGY_T5_COVERAGE} This is what appears in your projection feed when the event falls inside the window.`,
                  vendors: "All vendors: T-5 window",
                  icon: "📡",
                },
                {
                  phase: "3. Projection Data Sent",
                  desc: "Vendor sends the event to your projection feed. Some vendors (MSCI, MSTAR) may publish earlier due to longer grace periods. Others wait for confirmed terms.",
                  vendors: "MSCI, S&P, FTSE, STOXX, Solactive, Morningstar, VettaFi",
                  icon: "📤",
                },
                {
                  phase: "4. Ex-Date",
                  desc: "First day the security trades without the dividend/right/entitlement. Price adjustment applied to parent. Spin-off child begins transition. Vendor-specific grace periods active.",
                  vendors: "All vendors apply on ex-date (with vendor-specific logic)",
                  icon: "📅",
                },
                {
                  phase: "5. Effective / Completion Date",
                  desc: "Deal closes, spin-off distribution completes, shares settled. Target deleted. Acquirer adjusted. Divisor finalised. All remaining placeholder prices resolved.",
                  vendors: "All vendors finalise on effective date",
                  icon: "✅",
                },
              ].map((item, i) => (
                <div key={i} className="relative flex items-start gap-4 pl-10">
                  <div className="absolute left-2.5 top-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[10px]">
                    {i + 1}
                  </div>
                  <div>
                    <div className="mb-0.5 text-xs font-semibold text-foreground">{item.phase}</div>
                    <p className="mb-1 text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                    <div className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{item.vendors}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </SurfaceSection>
      </section>

      {/* ── Coverage Period (supplementary) ───────────────────────────── */}
      <section className="mx-auto max-w-6xl border-t border-border px-6 py-12">
        <SurfaceSection padding="compact">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Supplementary — Coverage Period</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">All vendors: T-5 coverage period</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
            {METHODOLOGY_T5_COVERAGE} Example: if you receive files on Tuesday, the snapshot reflects Monday&apos;s close and includes corporate actions scheduled through the end of the same five-business-day window.
          </p>
          <div className="flex flex-wrap gap-2">
            {COVERAGE.map((c) => (
              <div key={c.vendor} className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1">
                <span className="text-[11px] font-semibold">{c.vendor}</span>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">{c.coverage}</span>
              </div>
            ))}
          </div>
        </div>
        </SurfaceSection>
      </section>

      {/* ── Quick Links ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl border-t border-border px-6 py-12">
        <SurfaceSection padding="compact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/vendors/"
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <BookOpenIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="mb-1 text-sm font-semibold">Vendor Reference</div>
            <p className="text-xs text-muted-foreground">
              Deletion triggers, PAF formulas, and timing for all event types
            </p>
          </Link>
          <Link
            href="/vendors/iso-taxonomy/"
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <NetworkIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="mb-1 text-sm font-semibold">ISO Taxonomy</div>
            <p className="text-xs text-muted-foreground">
              ISO 20022 CAEV codes mapped to SWIFT MT564 and vendor terminology
            </p>
          </Link>
          <Link
            href="/investors/"
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <GlobeIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="mb-1 text-sm font-semibold">Investor snapshot</div>
            <p className="text-xs text-muted-foreground">
              Dividends, splits, and calendar hints by ticker (delayed data)
            </p>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-5">
            <HelpCircleIcon className="mb-3 h-5 w-5 text-primary" />
            <div className="mb-1 text-sm font-semibold">Need Help?</div>
            <p className="text-xs text-muted-foreground">
              Include ticker and event date for fastest response
            </p>
          </div>
        </div>
        </SurfaceSection>
      </section>
    </main>
  );
}
