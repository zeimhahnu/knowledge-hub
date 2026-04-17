"use client";

import { motion } from "framer-motion";
import {
  BookOpenIcon,
  CirclePileIcon,
  ClipboardCheckIcon,
  CodeIcon,
  LightbulbIcon,
  ScaleIcon,
  SparklesIcon,
  TableIcon,
} from "lucide-react";

const vendors = [
  { name: "MSCI", color: "bg-blue-500", text: "text-blue-500" },
  { name: "S&P DJI", color: "bg-blue-600", text: "text-blue-600" },
  { name: "FTSE Russell", color: "bg-cyan-500", text: "text-cyan-500" },
  { name: "STOXX", color: "bg-red-500", text: "text-red-500" },
  { name: "Solactive", color: "bg-orange-500", text: "text-orange-500" },
  { name: "Morningstar", color: "bg-green-500", text: "text-green-500" },
  { name: "VettaFi", color: "bg-purple-500", text: "text-purple-500" },
];

const features = [
  {
    icon: TableIcon,
    title: "12 Corporate Action Types",
    description:
      "Cash dividends, special dividends, splits, rights, bonuses, spin-offs, secondaries, free float, M&A, tenders, return of capital, and bankruptcy.",
    accent: "border-blue-500/30",
  },
  {
    icon: ClipboardCheckIcon,
    title: "Threshold & Adjustment Matrix",
    description:
      "Per-vendor: threshold triggers, PAF formulas, divisor changes, ex-date treatment, QIR vs ongoing timing.",
    accent: "border-cyan-500/30",
  },
  {
    icon: ScaleIcon,
    title: "Quick Decision Guide",
    description:
      "At-a-glance rules: STOXX divisor-only secondaries, VettaFi special div → PR index, S&P dual thresholds, FTSE recurring div classification.",
    accent: "border-orange-500/30",
  },
  {
    icon: SparklesIcon,
    title: "VettaFi Special Rules",
    description:
      "Special divs applied to PR + TR/NTR (unique). Three merger approaches. Share offerings at rebalancing only.",
    accent: "border-purple-500/30",
  },
];

const stats = [
  { label: "Vendors Covered", value: "7" },
  { label: "CA Categories", value: "12" },
  { label: "Data Points", value: "200+" },
  { label: "Source Docs", value: "8" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CirclePileIcon className="h-3 w-3" />
              Index Intelligence Platform
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              Knowledge Hub
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
              Comprehensive corporate action methodology reference for index providers.
              Compare treatment rules across MSCI, S&P DJI, FTSE Russell, STOXX,
              Solactive, Morningstar, and VettaFi — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {vendors.map((v) => (
                <span
                  key={v.name}
                  className={`rounded-full ${v.color}/10 px-3 py-1 text-xs font-medium ${v.text}`}
                >
                  {v.name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center gap-1 bg-background px-6 py-8 text-center"
              >
                <span className="text-3xl font-bold md:text-4xl">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — Bento Grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold md:text-3xl">What&apos;s Inside</h2>
          <p className="mt-2 text-muted-foreground">
            Every corporate action type, fully dissected per vendor.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className={`group rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg ${f.accent}`}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Special Rules Alert */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <LightbulbIcon className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Key Differences to Watch</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">STOXX</strong> — No price adjustment for
                secondary offerings. Divisor only. Special dividends treated identically to regular
                dividends.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">VettaFi</strong> — Unique: special dividends
                applied to PR index (in addition to TR/NTR). Merger has 3 approaches.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">S&P DJI</strong> — Dual threshold for
                secondaries: ≥5% + US$150M both required. Spin-off ex-date at zero price.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">FTSE Russell</strong> — Special dividends 1st–3rd
                special, 4th+ ordinary. Rights issues create 3 temporary lines.
              </span>
            </li>
          </ul>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenIcon className="h-4 w-4" />
            Built for Franklin Templeton — Index Data Operations
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CodeIcon className="h-3 w-3" />
              React 19 + Tailwind v4 + Framer Motion
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
