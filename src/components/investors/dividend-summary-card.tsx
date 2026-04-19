"use client";

import type { InvestorDividendRow } from "@/lib/investors/types";
import { dividendTrend, formatUsd } from "@/lib/investors/format";
import { GlossaryTerm } from "@/components/ui/glossary-term";

interface Props {
  dividends: InvestorDividendRow[];
  dividendRate?: number;
  dividendYield?: number;
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card/60 p-6">
      <div className="mb-4 h-4 w-40 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted/70" />
        <div className="h-3 w-[80%] rounded bg-muted/70" />
      </div>
    </div>
  );
}

export function DividendSummaryCard({
  dividends,
  dividendRate,
  dividendYield,
  loading,
}: Props) {
  if (loading) return <SkeletonCard />;

  const trend = dividendTrend(dividends);
  const trendLabel =
    trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "—" : "—";

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Dividend history</h3>
      {dividends.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent dividends in range.</p>
      ) : (
        <>
          <p className="mb-3 text-sm tabular-nums text-foreground">
            {dividends
              .map((d) => formatUsd(d.amount))
              .join(" → ")}
            <span className="ml-2 text-muted-foreground">({trendLabel} cadence)</span>
          </p>
          <div className="flex flex-wrap gap-4 text-sm tabular-nums">
            {dividendRate != null && (
              <span className="text-muted-foreground">
                <GlossaryTerm
                  term="Dividend rate"
                  definition="Annualized cash dividend per share, when reported by the data source."
                >
                  Rate
                </GlossaryTerm>
                :{" "}
                <span className="font-medium text-foreground">{formatUsd(dividendRate)}/yr</span>
              </span>
            )}
            {dividendYield != null && (
              <span className="text-muted-foreground">
                <GlossaryTerm
                  term="Dividend yield"
                  definition="Annual dividend divided by the latest price, as a percentage. Delayed snapshot."
                >
                  Yield
                </GlossaryTerm>
                :{" "}
                <span className="font-medium text-foreground">{dividendYield.toFixed(2)}%</span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
