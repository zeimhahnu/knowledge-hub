"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CircleDotIcon,
  CompassIcon,
  LightbulbIcon,
  MinusIcon,
  SearchIcon,
  TrendingUpIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";

// ─── Real example: Spin-Off differential ───────────────────────────────────

type DiffOutcome = {
  vendor: string;
  result: string;
  reason: string;
  status: "showed" | "missed" | "pending";
};

type DiffStep = {
  question: string;
  explanation: string;
  outcomes: DiffOutcome[];
};

const SPINOFF_DIFF: DiffStep[] = [
  {
    question: "Is Company B eligible for the index?",
    explanation:
      "Before any vendor reacts, the spin-off company must qualify for index inclusion. If Company B fails size, liquidity, domicile, or sector criteria — it won't be added by any vendor, regardless of spin-off treatment.",
    outcomes: [
      { vendor: "MSCI", result: "Added if eligible", reason: "Uses when-issued price when available", status: "pending" },
      { vendor: "S&P DJI", result: "Added if eligible", reason: "Zero price placeholder, 20-day grace", status: "pending" },
      { vendor: "FTSE Russell", result: "Added if eligible", reason: "Estimated price, 20 business days grace", status: "pending" },
      { vendor: "Solactive", result: "Added if eligible", reason: "Per methodology — semi-annual rebalance window", status: "pending" },
      { vendor: "Morningstar", result: "Added — PLACEHOLDER ACTIVE", reason: "Zero price placeholder, 40-day grace period — showing in projections now", status: "showed" },
    ],
  },
  {
    question: "Has the spin-off been formally announced and confirmed?",
    explanation:
      "Vendors only react to confirmed events. A rumour or unconfirmed report doesn't trigger adjustment. The key date is when terms are formally announced. If MSTAR received the announcement earlier than FTSE or Solactive — that alone explains the projection gap.",
    outcomes: [
      { vendor: "MSCI", result: "Confirmed", reason: "Applied on effective or ex-date", status: "pending" },
      { vendor: "S&P DJI", result: "Confirmed", reason: "Applied on effective date", status: "pending" },
      { vendor: "FTSE Russell", result: "Pending confirmation", reason: "May not have received or processed the announcement yet", status: "missed" },
      { vendor: "Solactive", result: "Pending confirmation", reason: "Semi-annual schedule — announcement may not have reached them yet", status: "missed" },
      { vendor: "Morningstar", result: "Confirmed — ACTIVE", reason: "Data feed has processed and published the confirmed event", status: "showed" },
    ],
  },
  {
    question: "Does it exceed each vendor's recognition threshold?",
    explanation:
      "Even confirmed events can be deferred if below materiality thresholds. MSTAR's 40-day grace period with zero placeholder means it publishes to projection feeds immediately. FTSE and Solactive may be processing the same confirmed event but haven't yet published it to their projection outputs.",
    outcomes: [
      { vendor: "MSCI", result: "Above threshold", reason: "Eligible — but child treated as detached until distribution date", status: "pending" },
      { vendor: "S&P DJI", result: "Above threshold", reason: "Grace period active — below radar until 20 days", status: "pending" },
      { vendor: "FTSE Russell", result: "Pending", reason: "May be awaiting confirmed spin-off terms before publishing", status: "missed" },
      { vendor: "Solactive", result: "Semi-annual only", reason: "GPR Global 100 is semi-annual — event falls between rebalance windows", status: "missed" },
      { vendor: "Morningstar", result: "Confirmed — PUBLISHED", reason: "Zero-price placeholder now active in projection data", status: "showed" },
    ],
  },
];

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DiffOutcome["status"] }) {
  if (status === "showed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
        <CheckCircleIcon className="h-3 w-3" /> Showing in projection data
      </span>
    );
  if (status === "missed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
        <XCircleIcon className="h-3 w-3" /> Not yet published
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <MinusIcon className="h-3 w-3" /> Pending
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [started, setStarted] = useState(false);

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
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
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
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Corporate action projection data never matches across all vendors.
              Same event, same security — but one vendor shows it today, another
              shows it next week, and a third ignores it entirely.
              <br />
              <strong className="text-foreground">This tool explains why.</strong>
            </p>

            {/* Real example teaser */}
            <div className="mx-auto mb-10 max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-left">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
                <LightbulbIcon className="h-4 w-4" />
                Real example — Spin-Off Event
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Company A distributes Company B</strong> to
                shareholders on April 23. Morningstar shows Company B in projection data as of today.
                FTSE Russell and Solactive show nothing.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Likely causes:</strong> Solactive GPR Global 100
                rebalances semi-annually — the event falls between reviews. FTSE Russell may be awaiting
                confirmed terms. MSTAR uses a 40-day grace period with a zero-price placeholder —
                making it visible in projections immediately.
              </p>
            </div>

            <button
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              Investigate an Event
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Decision Tree ───────────────────────────────────────────────── */}
      {started && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold">Find the divergence point</h2>
            <p className="text-sm text-muted-foreground">
              Walk through the decision tree. At each step, check which vendors show the event
              and which do not — the split point tells you exactly where the difference originates.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: 1,
                question: "What category does this event fall in?",
                hint: "The first split — mandatory vs voluntary — determines how soon a vendor will react.",
                options: [
                  {
                    label: "Mandatory Events",
                    sub: "Cash dividend, Stock split, Merger (unconditional), Bonus issue, Return of capital, Spin-off, Bankruptcy",
                    color: "bg-green-500/10 border-green-500/30 text-green-400",
                  },
                  {
                    label: "Voluntary Events",
                    sub: "Rights issue, Tender offer, Secondary offering, Private placement",
                    color: "bg-orange-500/10 border-orange-500/30 text-orange-400",
                  },
                ],
              },
              {
                step: 2,
                question: "Has the event been formally confirmed?",
                hint: "Unconfirmed events appearing in one vendor's feed but not another's — a common source of projection gaps.",
                options: [
                  {
                    label: "Confirmed by company",
                    sub: "All vendors should recognise — check if announcement lag is the issue",
                    color: "bg-green-500/10 border-green-500/30 text-green-400",
                  },
                  {
                    label: "Unconfirmed / Pending",
                    sub: "One vendor processed early — not an error, just different announcement tracking",
                    color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
                  },
                ],
              },
              {
                step: 3,
                question: "Is the resulting security index-eligible?",
                hint: "If the spin-off child or new shares fail eligibility — no vendor adds it. Check size, liquidity, sector, geography rules per vendor.",
                options: [
                  {
                    label: "Eligible",
                    sub: "Continue to threshold check",
                    color: "bg-green-500/10 border-green-500/30 text-green-400",
                  },
                  {
                    label: "Not eligible",
                    sub: "All vendors will skip — divergence ends here",
                    color: "bg-red-500/10 border-red-500/30 text-red-400",
                  },
                ],
              },
              {
                step: 4,
                question: "Does it exceed each vendor's threshold?",
                hint: "This is the most common divergence point. Different vendors use different materiality thresholds — one may be above threshold while another is below.",
                options: [
                  {
                    label: "Above all thresholds",
                    sub: "All vendors should show — check timing",
                    color: "bg-green-500/10 border-green-500/30 text-green-400",
                  },
                  {
                    label: "Mixed — some above, some below",
                    sub: "The divergence is HERE. Check each vendor threshold table.",
                    color: "bg-amber-500/10 border-amber-500/30 text-amber-400",
                  },
                  {
                    label: "Below all thresholds",
                    sub: "Deferred to QIR — may never appear in projections",
                    color: "bg-muted/20 border-muted text-muted-foreground",
                  },
                ],
              },
              {
                step: 5,
                question: "What is the QIR schedule for below-threshold events?",
                hint: "Below-threshold events accumulate to the next Quarterly Index Review. Solactive GPR Global 100 is SEMI-ANNUAL — events can sit for months before appearing.",
                options: [
                  {
                    label: "MSCI / S&P / FTSE",
                    sub: "Quarterly — Mar, Jun, Sep, Dec",
                    color: "bg-blue-500/10 border-blue-500/30 text-blue-400",
                  },
                  {
                    label: "STOXX",
                    sub: "Quarterly — Mar, Jun, Sep, Dec",
                    color: "bg-red-500/10 border-red-500/30 text-red-400",
                  },
                  {
                    label: "Solactive GPR Global 100",
                    sub: "SEMI-ANNUAL — events can miss an entire cycle",
                    color: "bg-orange-500/10 border-orange-500/30 text-orange-400",
                    highlight: true,
                  },
                ],
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-start gap-4 p-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {s.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-semibold">{s.question}</h3>
                    <p className="text-xs text-muted-foreground">{s.hint}</p>
                  </div>
                </div>
                <div className={`grid gap-2 px-5 pb-5 ${s.options.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  {s.options.map((opt) => (
                    <div
                      key={opt.label}
                      className={`rounded-xl border p-3 ${opt.color} ${opt.highlight ? "ring-2 ring-amber-400/50" : ""}`}
                    >
                      <div className="mb-0.5 text-xs font-semibold">{opt.label}</div>
                      <div className="text-[11px] opacity-80">{opt.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Next step CTA */}
          <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUpIcon className="h-5 w-5 text-primary" />
              <span className="font-semibold">Once you know where the divergence is — go deep</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The decision tree narrows it to a specific step. Then use the full{" "}
              <a href="/vendors" className="text-primary underline">Vendor Methodology Matrix</a>{" "}
              to see exactly which rule differs at that step — threshold values, timing,
              grace periods, and adjustment formulas — all compared side by side.
            </p>
            <a
              href="/vendors"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Open Vendor Methodology Matrix
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}

      {/* ── Live Example: Spin-off Differential ──────────────────────────── */}
      {!started && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-400">
              <ZapIcon className="h-4 w-4" />
              Live Example
            </div>
            <h2 className="mb-2 text-2xl font-bold">Spin-Off Differential Diagnosis</h2>
            <p className="text-sm text-muted-foreground">
              Company A distributes Company B on April 23. MSTAR shows Company B in projections today.
              FTSE and Solactive show nothing. Here is exactly where the divergence originates.
            </p>
          </div>

          <div className="space-y-6">
            {SPINOFF_DIFF.map((diff, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className={`rounded-2xl border overflow-hidden ${
                  i === 0 ? "border-amber-500/30" : "border-border"
                }`}
              >
                <div className={`flex items-start gap-4 p-5 ${i === 0 ? "bg-amber-500/5" : "bg-card"}`}>
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0 ? "bg-amber-500/20 text-amber-400" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-semibold text-lg">{diff.question}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{diff.explanation}</p>
                  </div>
                </div>

                <div className="border-t border-border bg-muted/20">
                  <div className="grid gap-px">
                    {diff.outcomes.map((o, oi) => (
                      <div
                        key={o.vendor}
                        className={`flex items-center gap-4 px-5 py-3 ${oi % 2 === 0 ? "bg-card" : "bg-muted/10"}`}
                      >
                        <div className="w-28 shrink-0 text-xs font-semibold text-muted-foreground">
                          {o.vendor}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="mb-0.5">
                            <StatusBadge status={o.status} />
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{o.reason}</div>
                        </div>
                        <div className="hidden md:block text-xs text-muted-foreground text-right max-w-[200px]">
                          {o.result}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Conclusion */}
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
            <div className="mb-2 text-sm font-bold text-amber-300">
              Why MSTAR shows it — but FTSE and Solactive do not
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                <span>
                  <strong className="text-foreground">MSTAR:</strong> 40-day grace period with
                  zero-price placeholder — active in projection data from ex-date
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span>
                  <strong className="text-foreground">FTSE Russell:</strong> 20 business day grace —
                  but may be awaiting confirmed spin-off terms before publishing to projection feeds
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span>
                  <strong className="text-foreground">Solactive:</strong> Semi-annual rebalance — the
                  event likely falls between GPR Global 100 review dates
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Key insight:</strong> MSTAR&apos;s longer grace
              period (40 days vs 20) and zero-price placeholder approach means it publishes
              spin-offs to projection feeds earlier than other vendors. This is not an error — it
              is a design choice. FTSE and Solactive may still add the event when confirmed — it
              just has not reached their projection feeds yet.
            </div>
          </div>
        </section>
      )}

      {/* ── Three Key Questions ──────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            The three questions that solve every divergence
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                num: "01",
                q: "Is it above threshold?",
                a: "Most projection gaps start here. Different vendors use different materiality thresholds. STOXX extraordinary threshold is 10% — catching less than MSCI at 5%. FTSE accumulates below 1% to quarterly review. Solactive only acts at semi-annual rebalance. These differences alone explain most gaps.",
                icon: TrendingUpIcon,
                color: "border-orange-500/30",
              },
              {
                num: "02",
                q: "What is their QIR schedule?",
                a: "Below-threshold events accumulate to the next Quarterly Index Review. But Solactive GPR Global 100 is semi-annual — an event can sit for 6 months before the next review window. If Solactive shows nothing, check whether the event falls between their March and September rebalance dates.",
                icon: CircleDotIcon,
                color: "border-blue-500/30",
              },
              {
                num: "03",
                q: "When did they receive the announcement?",
                a: "Vendors do not all get corporate action notices at the same time. MSTAR data feeds may have processed an announcement that FTSE has not yet received. Announcement lag is a common and legitimate source of temporary projection gaps — not an error.",
                icon: SearchIcon,
                color: "border-green-500/30",
              },
            ].map((card) => (
              <motion.div
                key={card.num}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`rounded-2xl border bg-card p-6 ${card.color}`}
              >
                <div className="mb-4 text-4xl font-bold text-muted-foreground/30">{card.num}</div>
                <h3 className="mb-3 font-semibold text-lg">{card.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold">Go deeper on any event type</h2>
        <p className="mb-8 text-muted-foreground">
          Full vendor comparison for all 13 corporate action types — thresholds, timing,
          grace periods, adjustment formulas — with inline glossary.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/vendors"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
          >
            <BookOpenIcon className="h-4 w-4" />
            Vendor Methodology Matrix
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              Sources: FTSE Russell v6.8 (Oct 2025) · STOXX Apr 2026 · S&P DJI Mar 2026 · Solactive Mar 2026 · Morningstar Jan 2026 · VettaFi Apr 2026
            </div>
            <div>Built with React 19 · Tailwind v4 · Framer Motion</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
