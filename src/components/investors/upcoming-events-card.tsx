"use client";

import type { InvestorCalendar } from "@/lib/investors/types";
import { daysUntil } from "@/lib/investors/format";
import { GlossaryTerm } from "@/components/ui/glossary-term";
import { CalendarIcon } from "lucide-react";

interface Props {
  calendar?: InvestorCalendar;
  loading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card/60 p-6">
      <div className="mb-4 h-4 w-44 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted/70" />
    </div>
  );
}

function Row({
  label,
  term,
  definition,
  date,
}: {
  label: string;
  term: string;
  definition: string;
  date?: string;
}) {
  const d = daysUntil(date);
  return (
    <div className="flex flex-wrap items-baseline gap-2 text-sm">
      <CalendarIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <GlossaryTerm term={term} definition={definition}>
        <span className="font-medium text-foreground">{label}</span>
      </GlossaryTerm>
      <span className="text-muted-foreground">:</span>
      {date ? (
        <>
          <span className="tabular-nums text-foreground">{date}</span>
          {d != null && (
            <span className="text-xs text-muted-foreground">({d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`})</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function UpcomingEventsCard({ calendar, loading }: Props) {
  if (loading) return <SkeletonCard />;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Upcoming</h3>
      <div className="space-y-3">
        <Row
          label="Ex-dividend"
          term="Ex-dividend date"
          definition="First date the stock trades without the declared dividend; buyers on or after this date do not receive that payment."
          date={calendar?.exDividendDate}
        />
        <Row
          label="Earnings"
          term="Earnings date"
          definition="When the company is scheduled to report quarterly results, if provided by the data source."
          date={calendar?.earningsDate}
        />
      </div>
    </div>
  );
}
