"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ClipboardIcon, FileTextIcon, MinusIcon, XIcon } from "lucide-react";

import { VendorEntailmentPanel } from "@/components/lookup/vendor-entailment-panel";
import { TimelineGeometry } from "@/components/lookup/coverage-timeline";
import {
  buildCoverageTimelineModel,
  type CoverageTimelineModel,
  type TimelineRow,
} from "@/lib/coverage-timeline";
import {
  leadTimeProvenance,
  type LookupVerdict,
  type MatrixRow,
} from "@/lib/lookup-verdict";
import type { VendorEntailment } from "@/lib/vendor-entailment";
import type { VendorMarkState } from "@/lib/vendor-confirmation";
import { vendorLabel, type VendorId } from "@/lib/vendors";
import { GlossaryLinkedText } from "@/components/glossary-linked-text";

const GROUP_META = {
  unchecked: {
    label: "Unchecked",
    description: "Start here: record what you found before reading the result.",
  },
  supplied: {
    label: "Supplied",
    description: "You marked this vendor as providing the data.",
  },
  expectedAbsent: {
    label: "Expected but absent",
    description: "The publication window has passed and you found no data.",
  },
  notYetDue: {
    label: "Not yet due",
    description: "Silence is early, not wrong — the window is still open.",
  },
  timingUnassessed: {
    label: "Timing unchecked",
    description: "No publication horizon is configured, so timing is ungraded.",
  },
  notApplicable: {
    label: "Not applicable",
    description: "This vendor is outside the event scope and is excluded from totals.",
  },
} as const;

type VendorGroup = keyof typeof GROUP_META;

type OrderedVendorRow = {
  row: MatrixRow;
  group: VendorGroup;
};

const GROUP_ORDER: VendorGroup[] = [
  "unchecked",
  "supplied",
  "expectedAbsent",
  "notYetDue",
  "timingUnassessed",
  "notApplicable",
];

function relativeTime(iso: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function MarkIcon({ state }: { state: VendorMarkState | "unchecked" }) {
  if (state === "confirmed") return <CheckIcon className="h-3.5 w-3.5" aria-hidden />;
  if (state === "absent") return <XIcon className="h-3.5 w-3.5" aria-hidden />;
  return <MinusIcon className="h-3.5 w-3.5" aria-hidden />;
}

function MarkControl({
  row,
  onMarkChange,
}: {
  row: MatrixRow;
  onMarkChange: (vendor: VendorId, state: VendorMarkState) => void;
}) {
  const state = row.confirmation?.state ?? "unchecked";
  const label = state === "confirmed" ? "Supplied" : state === "absent" ? "Absent" : "Unchecked";
  return (
    <div className="min-w-0 space-y-2">
      <label className="sr-only" htmlFor={`vendor-check-${row.vendor}`}>
        Your observation for {vendorLabel(row.vendor)}
      </label>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border ${
            state === "confirmed"
              ? "border-chart-3/50 bg-chart-3/15 text-chart-3"
              : state === "absent"
                ? "border-destructive/50 bg-destructive/15 text-destructive"
                : "border-border bg-muted/60 text-muted-foreground"
          }`}
          aria-hidden
        >
          <MarkIcon state={state} />
        </span>
        <select
          id={`vendor-check-${row.vendor}`}
          value={state}
          onChange={(event) =>
            onMarkChange(row.vendor, event.target.value as VendorMarkState)
          }
          className="h-8 min-w-0 max-w-full rounded-[4px] border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="unchecked">Not checked</option>
          <option value="confirmed">Confirmed present</option>
          <option value="absent">Checked absent</option>
        </select>
      </div>
      {row.confirmation?.checkedAt && (
        <p className="text-xs text-muted-foreground">
          {label} · checked {relativeTime(row.confirmation.checkedAt)}
        </p>
      )}
    </div>
  );
}

function markMeaning(row: MatrixRow): string {
  const state = row.confirmation?.state ?? "unchecked";
  if (state === "confirmed") return "You say this vendor supplied the data.";
  if (state === "absent") {
    if (row.state === "missing") return "You say no data was supplied after the window closed.";
    return "You say no data was supplied; timing does not call it late.";
  }
  return "Not checked yet.";
}

function variantLabel(variant: MatrixRow["treatments"][number]): string {
  const parts = variant.indexType !== "*" ? [variant.indexType] : [];
  for (const [key, value] of Object.entries(variant.conditions ?? {})) {
    parts.push(`${key.replaceAll("_", " ")}: ${String(value)}`);
  }
  return parts.join(" · ");
}

function Citation({ source }: { source: string }) {
  return (
    <p className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
      <FileTextIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span className="break-words">Citation: {source}</span>
    </p>
  );
}

function TreatmentSummary({ row }: { row: MatrixRow }) {
  if (!row.rulePresent) {
    return (
      <div className="space-y-1.5">
        <p className="text-base font-medium leading-snug text-foreground">{row.leadAnswer}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{row.leadReason}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-base font-medium leading-snug text-foreground">{row.leadAnswer}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{row.leadReason}</p>
      <details className="group rounded-[4px] border border-border/70 bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-border underline-offset-4 group-open:no-underline">Methodology wording</span>
        </summary>
        <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
          {row.treatments.map((variant, index) => (
            <div key={`${variant.indexType}-${index}-${variant.sourceRef ?? "rule"}`} className="space-y-1.5">
              {variantLabel(variant) && <p className="text-[0.65rem] font-mono uppercase tracking-[0.12em] text-muted-foreground">{variantLabel(variant)}</p>}
              {variant.treatment ? (
                <p className="text-sm leading-relaxed text-foreground/90"><GlossaryLinkedText text={variant.treatment} /></p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">No treatment wording is published for this variant.</p>
              )}
              {variant.sourceRef && <Citation source={variant.sourceRef} />}
            </div>
          ))}
        </div>
      </details>
      {row.sourceRef && <Citation source={row.sourceRef} />}
    </div>
  );
}

function PublicationWindow({
  timelineRow,
  model,
}: {
  timelineRow: TimelineRow;
  model: CoverageTimelineModel;
}) {
  const provenance = leadTimeProvenance(
    timelineRow.leadSource,
    timelineRow.vendor,
  );
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-3 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-muted-foreground">
        <span>Today</span>
        <span>Ex-date</span>
      </div>
      <TimelineGeometry row={timelineRow} model={model} />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{timelineRow.status}</span>
        <span aria-hidden>·</span>
        <span>{timelineRow.leadDays === null ? "No lead time" : `${timelineRow.leadDays}-day window`}</span>
        <span className="rounded-[4px] border border-border px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wide">
          {provenance.label}
        </span>
      </div>
    </div>
  );
}

function VendorRow({
  item,
  timelineRow,
  timelineModel,
  propagatedVendors,
  recentlyMarkedVendor,
  markRevision,
  onMarkChange,
}: {
  item: OrderedVendorRow;
  timelineRow: TimelineRow;
  timelineModel: CoverageTimelineModel;
  propagatedVendors: ReadonlySet<VendorId>;
  recentlyMarkedVendor: VendorId | null;
  markRevision: number;
  onMarkChange: (vendor: VendorId, state: VendorMarkState) => void;
}) {
  const { row, group } = item;
  const groupTone = row.applicable ? "" : "opacity-70";
  const rowStateClass = `ca-vendor-row-${row.state}`;
  const propagated = propagatedVendors.has(row.vendor);
  return (
    <li
      data-vendor-row
      data-vendor-id={row.vendor}
      data-propagated={propagated || undefined}
      className={`ca-vendor-row ${rowStateClass} min-w-0 border-t border-border/80 py-5 first:border-t-0 ${groupTone} ${propagated ? "ca-propagation-pulse" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">{GROUP_META[group].label}</span>
        <span className="text-xs text-muted-foreground">{GROUP_META[group].description}</span>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(8rem,0.8fr)_minmax(14rem,1.6fr)_minmax(10rem,0.9fr)_minmax(12rem,1.4fr)] lg:items-start">
        <div className="min-w-0">
          <p className="text-lg font-medium tracking-[-0.03em] text-foreground">{vendorLabel(row.vendor)}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.state === "not-applicable" ? "Outside scope" : "Vendor publication"}</p>
        </div>
        <PublicationWindow timelineRow={timelineRow} model={timelineModel} />
        <MarkControl row={row} onMarkChange={onMarkChange} />
        <div
          key={`${row.state}-${row.confirmation?.state ?? "unchecked"}-${row.confirmation?.checkedAt ?? "none"}-${recentlyMarkedVendor === row.vendor ? markRevision : "stable"}`}
          className={`${recentlyMarkedVendor === row.vendor ? "ca-verdict-cell" : ""} min-w-0 space-y-2`}
        >
          <p className="text-sm leading-relaxed text-foreground/90">{markMeaning(row)}</p>
          <TreatmentSummary row={row} />
        </div>
      </div>
    </li>
  );
}

function FindingCopy({
  ticker,
  eventName,
  verdict,
  unchecked,
}: {
  ticker: string;
  eventName: string;
  verdict: LookupVerdict;
  unchecked: number;
}) {
  const [copied, setCopied] = useState(false);
  const qualification = unchecked > 0
    ? `${unchecked} vendor${unchecked === 1 ? " remains" : "s remain"} unchecked, so this is not a final verdict.`
    : "All applicable vendors have been checked.";
  const note = `${ticker} ${eventName}: ${verdictSummaryForNote(verdict)} ${qualification}`;

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby="what-you-can-say" className="border-t border-border bg-[#f1efe9] px-5 py-8 text-[#151515] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#5b5b58]">Closing note</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h2 id="what-you-can-say" className="ca-section-title">What you can say</h2>
            <p className="mt-3 text-base leading-relaxed text-[#333331]">{note}</p>
          </div>
          <button
            type="button"
            onClick={() => void copyNote()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] bg-black px-4 py-3 text-sm font-medium text-white outline-none transition-colors hover:bg-[#272727] focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1efe9]"
          >
            <ClipboardIcon className="h-4 w-4" aria-hidden />
            {copied ? "Copied" : "Copy to note"}
          </button>
        </div>
      </div>
    </section>
  );
}

function verdictSummaryForNote(verdict: LookupVerdict): string {
  const { totals } = verdict;
  if (totals.applicable === 0) return "No applicable vendor is in scope.";
  const supplied = totals.covered === 1 ? "1 vendor has supplied" : `${totals.covered} vendors have supplied`;
  const absent = totals.missing === 1 ? "1 is past its window without data" : `${totals.missing} are past their windows without data`;
  return `${supplied}; ${absent}.`;
}

export function VendorInvestigationList({
  ticker,
  eventName,
  verdict,
  eventType,
  exDate,
  today,
  groups,
  entailment,
  propagatedVendors,
  recentlyMarkedVendor,
  markRevision,
  onMarkChange,
}: {
  ticker: string;
  eventName: string;
  verdict: LookupVerdict;
  eventType: string;
  exDate: Date;
  today: Date;
  groups: {
    supplied: MatrixRow[];
    expectedAbsent: MatrixRow[];
    notYetDue: MatrixRow[];
    unchecked: MatrixRow[];
    timingUnassessed: MatrixRow[];
    notApplicable: MatrixRow[];
  };
  entailment: VendorEntailment[];
  propagatedVendors: ReadonlySet<VendorId>;
  recentlyMarkedVendor: VendorId | null;
  markRevision: number;
  onMarkChange: (vendor: VendorId, state: VendorMarkState) => void;
}) {
  const timelineModel = useMemo(
    () => buildCoverageTimelineModel({ verdict, eventType, exDate, today }),
    [verdict, eventType, exDate, today],
  );
  const timelineByVendor = useMemo(
    () => new Map(timelineModel.rows.map((row) => [row.vendor, row])),
    [timelineModel],
  );
  const orderedRows = useMemo<OrderedVendorRow[]>(
    () => GROUP_ORDER.flatMap((group) => groups[group].map((row) => ({ row, group }))),
    [groups],
  );

  return (
    <section className="min-w-0 overflow-hidden border border-border bg-card" aria-labelledby="vendor-investigation-heading">
      <div className="border-b border-border px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Step 2 of 6 · investigate coverage</p>
            <h2 id="vendor-investigation-heading" className="ca-section-title mt-2">Read the vendor rows left to right</h2>
          </div>
          <p className="font-mono text-sm uppercase tracking-[0.12em] text-muted-foreground">{verdict.rows.length} vendors in scope</p>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80">Each vendor row answers the adjustment question first. Open the methodology wording when you need the source sentence; on small screens the same row stacks instead of becoming a scrolling table.</p>
        {groups.unchecked.length > 0 && (
          <p role="status" className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {groups.unchecked.length} vendor{groups.unchecked.length === 1 ? " remains" : "s remain"} unchecked, so the observation is still needed before the coverage result can be graded.
          </p>
        )}
        <div className="mt-6 hidden gap-5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground lg:grid lg:grid-cols-[minmax(8rem,0.8fr)_minmax(14rem,1.6fr)_minmax(10rem,0.9fr)_minmax(12rem,1.4fr)]">
          <span>Vendor</span><span>Publication window</span><span>Your mark</span><span>What it means</span>
        </div>
      </div>
      <div className="px-5 sm:px-8">
        <ol className="min-w-0" aria-label="Vendor investigation rows">
          {orderedRows.map((item) => {
            const timelineRow = timelineByVendor.get(item.row.vendor);
            if (!timelineRow) return null;
            return (
              <VendorRow
                key={item.row.vendor}
                item={item}
                timelineRow={timelineRow}
                timelineModel={timelineModel}
                propagatedVendors={propagatedVendors}
                recentlyMarkedVendor={recentlyMarkedVendor}
                markRevision={markRevision}
                onMarkChange={onMarkChange}
              />
            );
          })}
        </ol>
        <VendorEntailmentPanel results={entailment} />
      </div>
      <FindingCopy
        ticker={ticker}
        eventName={eventName}
        verdict={verdict}
        unchecked={verdict.totals.unchecked}
      />
    </section>
  );
}
