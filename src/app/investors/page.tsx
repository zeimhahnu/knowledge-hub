"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftIcon, LineChartIcon } from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { InvestorSearchBar } from "@/components/investors/investor-search-bar";
import { InvestorQuoteStrip } from "@/components/investors/investor-quote-strip";
import { DividendSummaryCard } from "@/components/investors/dividend-summary-card";
import { SplitHistoryCard } from "@/components/investors/split-history-card";
import { UpcomingEventsCard } from "@/components/investors/upcoming-events-card";
import { InvestorDataWarnings } from "@/components/investors/investor-data-warnings";
import type { InvestorTickerResponse } from "@/lib/investors/types";

const EXAMPLE_TICKERS: Array<{ symbol: string; label: string }> = [
  { symbol: "AAPL", label: "AAPL · Apple" },
  { symbol: "MSFT", label: "MSFT · Microsoft" },
  { symbol: "0005.HK", label: "0005.HK · HSBC" },
  { symbol: "7203.T", label: "7203.T · Toyota" },
  { symbol: "VOD.L", label: "VOD.L · Vodafone" },
  { symbol: "SAP.DE", label: "SAP.DE · SAP" },
  { symbol: "BHP.AX", label: "BHP.AX · BHP" },
];

export default function InvestorsPage() {
  const reduceMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const [activeTicker, setActiveTicker] = useState("");
  const [data, setData] = useState<InvestorTickerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (ticker: string) => {
    const t = ticker.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    setData(null);
    setActiveTicker(t);
    try {
      const res = await fetch(
        `/api/investors/quote/?ticker=${encodeURIComponent(t)}`,
        { cache: "no-store", method: "GET" },
      );
      const json = (await res.json()) as InvestorTickerResponse & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Request failed");
        return;
      }
      setData(json);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Back to hub
          </Link>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <LineChartIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
            Investor snapshot
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">Investor intelligence</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Search any company or symbol covered by Yahoo Finance — US, Europe,
            Hong Kong, Japan, Australia, emerging markets, ADRs, and ETFs. Type a
            name (<em>Apple</em>, <em>Toyota</em>, <em>HSBC</em>) or a symbol with
            suffix (<code>0005.HK</code>, <code>7203.T</code>, <code>VOD.L</code>).
            Data is third-party and delayed — not advice. For{" "}
            <Link href="/vendors/" className="text-primary underline-offset-4 hover:underline">
              index vendor methodology
            </Link>
            , use the vendor reference.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <SurfaceSection padding="comfortable" className="mb-8">
          <InvestorSearchBar
            value={input}
            onChange={setInput}
            onSubmit={(symbol) => {
              setInput(symbol);
              void runSearch(symbol);
            }}
            loading={loading}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {EXAMPLE_TICKERS.map((t) => (
              <button
                key={t.symbol}
                type="button"
                className="rounded-full border border-border bg-background/60 px-2.5 py-1 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
                onClick={() => {
                  setInput(t.symbol);
                  void runSearch(t.symbol);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </SurfaceSection>

        {error && (
          <div
            role="alert"
            className="mb-8 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {(loading || data) && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="space-y-6"
          >
            <InvestorQuoteStrip
              ticker={data?.ticker ?? activeTicker.toUpperCase()}
              quote={data?.quote}
              loading={loading}
            />
            {data && data.warnings.length > 0 && (
              <InvestorDataWarnings key={data.ticker} warnings={data.warnings} />
            )}
            <div className="grid gap-6 md:grid-cols-1">
              <DividendSummaryCard
                dividends={data?.dividends ?? []}
                dividendRate={data?.metrics?.dividendRate}
                dividendYield={data?.metrics?.dividendYield}
                payoutRatio={data?.metrics?.payoutRatio}
                fiveYearAvgDividendYield={data?.metrics?.fiveYearAvgDividendYield}
                currency={data?.quote?.currency}
                loading={loading}
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <SplitHistoryCard splits={data?.splits ?? []} loading={loading} />
                <UpcomingEventsCard calendar={data?.calendar} loading={loading} />
              </div>
            </div>
          </motion.div>
        )}

        <footer className="mt-12 border-t border-border pt-8 text-xs text-muted-foreground">
          <p className="max-w-prose leading-relaxed">
            Quotes and events are aggregated from public market data feeds and may be
            incomplete or delayed. Coverage depends on Yahoo Finance — most global
            exchanges are supported via suffixes (<code>.HK</code>, <code>.T</code>,
            <code>.L</code>, <code>.DE</code>, <code>.TO</code>, <code>.AX</code>,
            …). This page is for orientation only.
          </p>
        </footer>
      </div>
    </main>
  );
}
