"use client";

import { useMemo } from "react";

import { SurfaceSection } from "@/components/surface-section";
import {
  buildCoverageTimelineModel,
  type CoverageTimelineModel,
  type TimelineRow,
  type TimelineRowState,
} from "@/lib/coverage-timeline";
import type { LookupVerdict } from "@/lib/lookup-verdict";

const ROW_STYLES: Record<TimelineRowState, { band: string; marker: string; rule: string }> = {
  published: {
    band: "border-chart-3 bg-chart-3/80",
    marker: "border-chart-3 bg-chart-3",
    rule: "border-chart-3/30",
  },
  overdue: {
    band: "border-destructive bg-destructive/10",
    marker: "border-destructive bg-background",
    rule: "border-destructive/30",
  },
  "not-yet-due": {
    band: "border-chart-4 border-dashed bg-chart-4/10",
    marker: "border-chart-4 bg-background",
    rule: "border-chart-4/30",
  },
  "no-horizon": {
    band: "border-muted-foreground/40 bg-transparent",
    marker: "border-muted-foreground bg-background",
    rule: "border-muted-foreground/30",
  },
  "not-checked": {
    band: "border-border border-dashed bg-muted/20",
    marker: "border-border bg-background",
    rule: "border-border",
  },
  "not-applicable": {
    band: "border-border/50 bg-transparent",
    marker: "border-border/50 bg-background",
    rule: "border-border/50",
  },
};

function AxisMarker({
  label,
  date,
  percent,
  emphasis,
}: {
  label: string;
  date: string;
  percent: number;
  emphasis: "today" | "ex-date";
}) {
  return (
    <div
      className="absolute inset-y-0 -translate-x-1/2"
      style={{ left: `${percent}%` }}
    >
      <div
        className={`h-full border-l ${emphasis === "today" ? "border-primary/60" : "border-foreground/40"}`}
        aria-hidden
      />
      <span
        className={`absolute top-0 whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-wide ${emphasis === "today" ? "-translate-x-1/2 text-primary" : "-translate-x-1/2 text-foreground"}`}
      >
        {label}
      </span>
      <span className="absolute top-4 -translate-x-1/2 whitespace-nowrap text-[0.65rem] tabular-nums text-muted-foreground">
        {date}
      </span>
    </div>
  );
}

function TimelineRowView({ row, model }: { row: TimelineRow; model: CoverageTimelineModel }) {
  const styles = ROW_STYLES[row.state];
  const isNoHorizon = row.state === "no-horizon";
  const isClosed = row.state === "overdue";

  return (
    <li
      className="grid gap-x-3 gap-y-2 border-t border-border/70 py-3 first:border-t-0 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(11rem,auto)] sm:items-center"
      aria-label={`${row.label}: ${row.status}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight">{row.label}</p>
        <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground">
          {row.leadDays === null ? "lead time unset" : `${row.leadDays} day${row.leadDays === 1 ? "" : "s"} resolved`}
        </p>
      </div>

      <div className="relative h-8 min-w-0" aria-hidden="true">
        <div className={`absolute inset-x-0 top-1/2 border-t ${styles.rule}`} />
        <div
          className="absolute inset-y-0 border-l border-primary/30"
          style={{ left: `${model.axis.todayPercent}%` }}
        />
        <div
          className="absolute inset-y-0 border-l border-foreground/20"
          style={{ left: `${model.axis.exDatePercent}%` }}
        />

        {isNoHorizon ? (
          <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-muted-foreground/40" />
        ) : row.band ? (
          <div
            className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-sm border-2 ${styles.band} ${isClosed ? "border-solid" : ""}`}
            style={{ left: `${row.band.startPercent}%`, width: `${row.band.widthPercent}%` }}
          />
        ) : null}

        {row.markerPercent !== null && (
          <span
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${styles.marker} ${row.state === "published" ? "shadow-[0_0_0_2px_theme(colors.card)]" : ""}`}
            style={{ left: `${row.markerPercent}%` }}
          />
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground sm:text-right">
        <span className="font-medium text-foreground">{row.status}</span>
        {row.state === "not-yet-due" && (
          <span className="block">The marker is before the open window.</span>
        )}
        {row.state === "overdue" && (
          <span className="block">The marker is at or beyond the closed window.</span>
        )}
      </p>
    </li>
  );
}

export function CoverageTimeline({
  verdict,
  eventType,
  exDate,
  today,
}: {
  verdict: LookupVerdict;
  eventType: string;
  exDate: Date;
  today: Date;
}) {
  const model = useMemo(
    () => buildCoverageTimelineModel({ verdict, eventType, exDate, today }),
    [verdict, eventType, exDate, today],
  );

  if (model.rows.length === 0) return null;

  return (
    <SurfaceSection className="space-y-4" padding="compact">
      <figure>
        <figcaption className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Publication horizon</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Each band is the vendor&apos;s resolved publication window before the ex-date. The marker is today&apos;s observation; geometry is anchored to the ex-date, not to a status colour.
          </p>
          <p className="text-xs text-muted-foreground">
            Today is <time dateTime={model.todayLabel}>{model.todayLabel}</time>; ex-date is <time dateTime={model.exDateLabel}>{model.exDateLabel}</time>.
          </p>
        </figcaption>

        <div className="mt-5 grid gap-x-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(11rem,auto)]" aria-hidden="true">
          <span className="sr-only">Shared timeline axis</span>
          <div className="relative col-start-2 h-9 min-w-0">
            <AxisMarker label="Today" date={model.todayLabel} percent={model.axis.todayPercent} emphasis="today" />
            <AxisMarker label="Ex-date" date={model.exDateLabel} percent={model.axis.exDatePercent} emphasis="ex-date" />
          </div>
        </div>

        <ul className="mt-1" aria-label="Vendor publication horizon rows">
          {model.rows.map((row) => <TimelineRowView key={row.vendor} row={row} model={model} />)}
        </ul>
      </figure>
    </SurfaceSection>
  );
}
