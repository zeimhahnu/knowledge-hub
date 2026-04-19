"use client";

import type { InvestorQuote } from "@/lib/investors/types";
import {
  formatCompact,
  formatCurrency,
  formatInteger,
  formatPct,
} from "@/lib/investors/format";

interface Props {
  ticker: string;
  quote?: InvestorQuote;
  loading?: boolean;
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card/60 p-5">
      <div className="mb-2 h-6 w-40 rounded bg-muted" />
      <div className="mb-4 h-4 w-56 rounded bg-muted/80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-muted/70" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value?: string | null;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-500"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`truncate text-sm font-medium tabular-nums ${toneClass}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

export function InvestorQuoteStrip({ ticker, quote, loading }: Props) {
  if (loading) return <Skeleton />;

  const currency = quote?.currency;
  const price = quote?.price != null ? formatCurrency(quote.price, currency) : undefined;
  const prevClose =
    quote?.previousClose != null
      ? formatCurrency(quote.previousClose, currency)
      : undefined;
  const dayRange =
    quote?.dayLow != null && quote?.dayHigh != null
      ? `${formatCurrency(quote.dayLow, currency)} – ${formatCurrency(quote.dayHigh, currency)}`
      : undefined;
  const yearRange =
    quote?.yearLow != null && quote?.yearHigh != null
      ? `${formatCurrency(quote.yearLow, currency)} – ${formatCurrency(quote.yearHigh, currency)}`
      : undefined;
  const marketCap = formatCompact(quote?.marketCap, currency);
  const volume = formatInteger(quote?.volume);
  const avgVolume = formatInteger(quote?.avgVolume);
  const pe =
    quote?.peTrailing != null && Number.isFinite(quote.peTrailing)
      ? quote.peTrailing.toFixed(2)
      : undefined;
  const beta =
    quote?.beta != null && Number.isFinite(quote.beta)
      ? quote.beta.toFixed(2)
      : undefined;
  const eps =
    quote?.epsTrailing != null && Number.isFinite(quote.epsTrailing)
      ? formatCurrency(quote.epsTrailing, currency)
      : undefined;

  const tone =
    quote?.changePct != null
      ? quote.changePct > 0
        ? "positive"
        : quote.changePct < 0
          ? "negative"
          : "default"
      : "default";

  return (
    <div className="rounded-xl border border-border bg-card/80 p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          {ticker}
        </span>
        {quote?.name && (
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {quote.name}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {price && (
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {price}
          </span>
        )}
        {quote?.changeAbs != null && (
          <span
            className={
              "tabular-nums " +
              (tone === "positive"
                ? "text-emerald-500"
                : tone === "negative"
                  ? "text-destructive"
                  : "text-muted-foreground")
            }
          >
            {quote.changeAbs > 0 ? "+" : ""}
            {formatCurrency(quote.changeAbs, currency)}
          </span>
        )}
        {quote?.changePct != null && (
          <span
            className={
              "tabular-nums " +
              (tone === "positive"
                ? "text-emerald-500"
                : tone === "negative"
                  ? "text-destructive"
                  : "text-muted-foreground")
            }
          >
            ({formatPct(quote.changePct)})
          </span>
        )}
        {currency && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {currency}
          </span>
        )}
        {quote?.marketState && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {quote.marketState.toLowerCase()}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {quote?.exchange && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            {quote.exchange}
          </span>
        )}
        {quote?.quoteType && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {quote.quoteType}
          </span>
        )}
        {quote?.country && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            {quote.country}
          </span>
        )}
        {quote?.sector && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            {quote.sector}
          </span>
        )}
        {quote?.industry && (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            {quote.industry}
          </span>
        )}
      </div>

      {(prevClose ||
        dayRange ||
        yearRange ||
        marketCap ||
        volume ||
        avgVolume ||
        pe ||
        beta ||
        eps) && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 sm:grid-cols-3 md:grid-cols-4">
          <Stat label="Prev close" value={prevClose} />
          <Stat label="Day range" value={dayRange} />
          <Stat label="52-wk range" value={yearRange} />
          <Stat label="Market cap" value={marketCap} />
          <Stat label="Volume" value={volume} />
          <Stat label="Avg volume" value={avgVolume} />
          <Stat label="P/E (ttm)" value={pe} />
          <Stat label="EPS (ttm)" value={eps} />
          <Stat label="Beta" value={beta} />
        </div>
      )}
    </div>
  );
}
