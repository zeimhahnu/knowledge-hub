"use client";

import type { InvestorDividendRow } from "@/lib/investors/types";
import { dividendTrend, formatCurrency } from "@/lib/investors/format";
import { GlossaryTerm } from "@/components/ui/glossary-term";

interface Props {
  dividends: InvestorDividendRow[];
  dividendRate?: number;
  dividendYield?: number;
  payoutRatio?: number;
  fiveYearAvgDividendYield?: number;
  currency?: string;
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
  payoutRatio,
  fiveYearAvgDividendYield,
  currency,
  loading,
}: Props) {
  if (loading) return <SkeletonCard />;

  const hasAny =
    dividends.length > 0 ||
    dividendRate != null ||
    dividendYield != null ||
    payoutRatio != null ||
    fiveYearAvgDividendYield != null;

  const trend = dividendTrend(dividends);
  const trendLabel =
    trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "—" : "—";

  const recent = dividends.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Dividend summary</h3>

      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          No dividend information reported for this security.
        </p>
      ) : (
        <>
          {recent.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent distributions (oldest → newest)
              </p>
              <p className="text-sm tabular-nums text-foreground">
                {[...recent]
                  .reverse()
                  .map((d) => formatCurrency(d.amount, currency))
                  .join(" → ")}
                <span className="ml-2 text-muted-foreground">({trendLabel} cadence)</span>
              </p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {dividendRate != null && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <GlossaryTerm
                    term="Annual dividend rate"
                    definition="Annualized cash dividend per share expected over the next 12 months, as reported by the data source."
                  >
                    Annual rate
                  </GlossaryTerm>
                </dt>
                <dd className="tabular-nums font-medium text-foreground">
                  {formatCurrency(dividendRate, currency)}
                </dd>
              </div>
            )}
            {dividendYield != null && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <GlossaryTerm
                    term="Dividend yield"
                    definition="Annual dividend divided by the latest price, as a percentage. Delayed snapshot — value can swing with price."
                  >
                    Yield
                  </GlossaryTerm>
                </dt>
                <dd className="tabular-nums font-medium text-foreground">
                  {dividendYield.toFixed(2)}%
                </dd>
              </div>
            )}
            {fiveYearAvgDividendYield != null && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <GlossaryTerm
                    term="5-yr average yield"
                    definition="Trailing five-year average of the dividend yield. Useful for spotting how today's yield compares to its own history."
                  >
                    5-yr avg yield
                  </GlossaryTerm>
                </dt>
                <dd className="tabular-nums font-medium text-foreground">
                  {fiveYearAvgDividendYield.toFixed(2)}%
                </dd>
              </div>
            )}
            {payoutRatio != null && (
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <GlossaryTerm
                    term="Payout ratio"
                    definition="Dividends paid as a percentage of earnings. Above 100% means the company is paying more than it currently earns."
                  >
                    Payout ratio
                  </GlossaryTerm>
                </dt>
                <dd className="tabular-nums font-medium text-foreground">
                  {payoutRatio.toFixed(1)}%
                </dd>
              </div>
            )}
          </dl>
        </>
      )}
    </div>
  );
}
