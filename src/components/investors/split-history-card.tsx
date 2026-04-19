"use client";

import type { InvestorSplitRow } from "@/lib/investors/types";
import { GlossaryTerm } from "@/components/ui/glossary-term";

interface Props {
  splits: InvestorSplitRow[];
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card/60 p-6">
      <div className="mb-4 h-4 w-36 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted/70" />
        <div className="h-3 w-[66%] rounded bg-muted/70" />
      </div>
    </div>
  );
}

export function SplitHistoryCard({ splits, loading }: Props) {
  if (loading) return <SkeletonCard />;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        <GlossaryTerm
          term="Stock split"
          definition="Company increases share count and reduces price by a set ratio (e.g. 4:1 = four shares for each old share at one-quarter the price)."
        >
          Stock splits
        </GlossaryTerm>
      </h3>
      {splits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No splits in chart range.</p>
      ) : (
        <ul className="space-y-2 text-sm tabular-nums text-foreground">
          {splits.map((s) => (
            <li key={`${s.date}-${s.ratio}`}>
              <span className="text-muted-foreground">{s.date}</span>
              <span className="mx-2 text-border">—</span>
              <span className="font-medium">{s.ratio}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
