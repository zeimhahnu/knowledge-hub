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
  dateEnd,
}: {
  label: string;
  term: string;
  definition: string;
  date?: string;
  dateEnd?: string;
}) {
  const display =
    date && dateEnd && dateEnd !== date ? `${date} → ${dateEnd}` : date;
  const d = daysUntil(date);
  return (
    <div className="flex flex-wrap items-baseline gap-2 text-sm">
      <CalendarIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <GlossaryTerm term={term} definition={definition}>
        <span className="font-medium text-foreground">{label}</span>
      </GlossaryTerm>
      <span className="text-muted-foreground">:</span>
      {display ? (
        <>
          <span className="tabular-nums text-foreground">{display}</span>
          {d != null && (
            <span className="text-xs text-muted-foreground">
              ({d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`})
            </span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">Not announced</span>
      )}
    </div>
  );
}

export function UpcomingEventsCard({ calendar, loading }: Props) {
  if (loading) return <SkeletonCard />;

  const hasAny =
    calendar?.exDividendDate != null || calendar?.earningsDate != null;

  return (
    <div className="rounded-xl border border-border bg-card/80 p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Upcoming events</h3>
      {!hasAny ? (
        <p className="text-sm text-muted-foreground">
          No scheduled ex-dividend or earnings dates reported.
        </p>
      ) : (
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
            definition="When the company is scheduled to report quarterly results. Yahoo sometimes gives a window (start → end) rather than a single day."
            date={calendar?.earningsDate}
            dateEnd={calendar?.earningsDateEnd}
          />
        </div>
      )}
    </div>
  );
}
