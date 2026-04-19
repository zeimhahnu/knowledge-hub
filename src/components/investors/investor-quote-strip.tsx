"use client";

import type { InvestorQuote } from "@/lib/investors/types";
import { formatPct, formatUsd } from "@/lib/investors/format";

interface Props {
  ticker: string;
  quote?: InvestorQuote;
  loading?: boolean;
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-2 h-6 w-32 rounded bg-muted" />
      <div className="h-4 w-48 rounded bg-muted/80" />
    </div>
  );
}

export function InvestorQuoteStrip({ ticker, quote, loading }: Props) {
  if (loading) return <Skeleton />;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-4">
      <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{ticker}</span>
        {quote?.name && (
          <span className="text-sm text-muted-foreground">· {quote.name}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm tabular-nums">
        {quote?.price != null && (
          <span className="font-medium text-foreground">{formatUsd(quote.price)}</span>
        )}
        {quote?.changePct != null && (
          <span
            className={
              quote.changePct > 0
                ? "text-emerald-500"
                : quote.changePct < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }
          >
            {formatPct(quote.changePct)}
          </span>
        )}
        {quote?.sector && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {quote.sector}
          </span>
        )}
        {quote?.exchange && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            {quote.exchange}
          </span>
        )}
      </div>
    </div>
  );
}
