import { useState } from "react";
import { FileTextIcon } from "lucide-react";

import { leadTimeProvenance } from "@/lib/lookup-verdict";
import type { MatrixRow, TreatmentVariant } from "@/lib/lookup-verdict";
import type { VendorMarkState } from "@/lib/vendor-confirmation";
import type { VendorId } from "@/lib/vendors";

const STATE_META: Record<MatrixRow["state"], { label: string; chip: string }> =
  {
    covered: {
      label: "Covered",
      chip: "border-chart-3/40 bg-chart-3/10 text-chart-3",
    },
    "not-yet-due": {
      label: "Not yet due",
      chip: "border-chart-4/40 bg-chart-4/10 text-chart-4",
    },
    missing: {
      label: "Too late",
      chip: "border-destructive/40 bg-destructive/10 text-destructive",
    },
    "not-checked": {
      label: "Not checked",
      chip: "border-border bg-muted/30 text-muted-foreground",
    },
    "not-assessed": {
      label: "Lead time not configured",
      chip: "border-chart-2/50 bg-chart-2/10 text-chart-2",
    },
    "not-applicable": {
      label: "Not applicable",
      chip: "border-border bg-muted/30 text-muted-foreground",
    },
  };

const DATA_COVERAGE_META: Record<
  MatrixRow["dataCoverage"],
  { label: string; chip: string }
> = {
  "states-treatment": {
    label: "States a treatment",
    chip: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  },
  silent: {
    label: "Silent",
    chip: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  },
  "not-covered": {
    label: "Not covered",
    chip: "border-border bg-muted/30 text-muted-foreground",
  },
};

const vendorDisplayName = (vendor: VendorId): string =>
  vendor === "sp" ? "S&P DJI" : vendor[0]!.toUpperCase() + vendor.slice(1);

function StateBadge({ state }: { state: MatrixRow["state"] }) {
  const meta = STATE_META[state];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}

function DataCoverageCell({ row }: { row: MatrixRow }) {
  const meta = DATA_COVERAGE_META[row.dataCoverage];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}

function WindowCell({ row }: { row: MatrixRow }) {
  if (!row.applicable)
    return <span className="text-muted-foreground/60">—</span>;
  if (row.leadDays === null)
    return <span className="text-muted-foreground/60">—</span>;
  const { label, tone } = leadTimeProvenance(row.source ?? "unset", row.vendor);
  const cls =
    tone === "user"
      ? "border-primary/40 bg-primary/15 text-primary"
      : "border-border bg-muted/60 text-muted-foreground";
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium tabular-nums">{row.leadDays}d</span>
      <span
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
      >
        {label}
      </span>
    </span>
  );
}

function CheckControl({
  row,
  onMarkChange,
}: {
  row: MatrixRow;
  onMarkChange: (vendor: VendorId, state: VendorMarkState) => void;
}) {
  const state = row.confirmation?.state ?? "unchecked";
  const checkedAt = row.confirmation?.checkedAt;
  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor={`vendor-check-${row.vendor}`}>
        Your check for {vendorDisplayName(row.vendor)}
      </label>
      <select
        id={`vendor-check-${row.vendor}`}
        value={state}
        onChange={(event) =>
          onMarkChange(row.vendor, event.target.value as VendorMarkState)
        }
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="unchecked">Not checked</option>
        <option value="confirmed">Confirmed present</option>
        <option value="absent">Checked absent</option>
      </select>
      {checkedAt && (
        <span className="block text-xs text-muted-foreground">
          checked {relativeTime(checkedAt)}
        </span>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(iso).getTime());
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Split a treatment into a short lead (first sentence) and the remainder.
 * The lead is the scan summary; the rest lives behind the row expander. */
function splitTreatment(text: string): { lead: string; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { lead: "", rest: "" };
  const match = /^(.*?[.!?])(?:\s+|$)/.exec(trimmed);
  if (!match) return { lead: trimmed, rest: "" };
  const lead = match[1]!.trim();
  const rest = trimmed.slice(match[1]!.length).trim();
  return { lead, rest };
}

/** Provenance, not prose: a muted secondary line, never read at rule weight. */
function SourceRef({ source }: { source: string }) {
  return (
    <span className="mt-1.5 flex max-w-64 items-center gap-1 text-xs text-muted-foreground/80">
      <FileTextIcon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate" title={source}>
        {source}
      </span>
    </span>
  );
}

/** Progressive disclosure: lead sentence in the cell, full text behind an expander. */
function ProgressiveTreatment({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const { lead, rest } = splitTreatment(text);
  if (!rest)
    return (
      <span className="block text-sm leading-relaxed text-foreground/90">
        {lead}
      </span>
    );
  return (
    <span className="block">
      <span className="text-sm leading-relaxed text-foreground/90">{lead}</span>
      {open && (
        <span className="mt-1.5 block text-sm leading-relaxed text-foreground/90">
          {rest}
        </span>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-xs font-medium text-primary underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? "Show less" : "Show full text"}
      </button>
    </span>
  );
}

function discriminatorLabel(variant: TreatmentVariant): string {
  const parts = variant.indexType !== "*" ? [variant.indexType] : [];
  for (const [key, value] of Object.entries(variant.conditions ?? {})) {
    parts.push(`${key.replaceAll("_", " ")}: ${String(value)}`);
  }
  return parts.join(" · ");
}

function TreatmentBlock({ variant }: { variant: TreatmentVariant }) {
  if (variant.treatment === null)
    return <span className="text-sm text-muted-foreground">Silent</span>;
  return (
    <div className="space-y-1.5">
      {discriminatorLabel(variant) && (
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {discriminatorLabel(variant)}
        </span>
      )}
      <ProgressiveTreatment text={variant.treatment} />
      {variant.sourceRef && <SourceRef source={variant.sourceRef} />}
    </div>
  );
}

function TreatmentCell({ row }: { row: MatrixRow }) {
  if (!row.rulePresent)
    return (
      <span className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Not covered</span> — no
        rule is present in the sourced dataset.
      </span>
    );
  if (!row.treatmentStated)
    return (
      <span className="block text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Silent</span> — this
        methodology does not state a treatment for this event.
        {row.sourceRef && <SourceRef source={row.sourceRef} />}
      </span>
    );
  return (
    <div className="space-y-3">
      {row.treatments.map((variant, index) => (
        <TreatmentBlock
          key={`${variant.indexType}-${index}-${discriminatorLabel(variant)}`}
          variant={variant}
        />
      ))}
    </div>
  );
}

export function CoverageMatrix({
  rows,
  onMarkChange,
}: {
  rows: MatrixRow[];
  onMarkChange: (vendor: VendorId, state: VendorMarkState) => void;
}) {
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No vendors in scope. Add one in the scope row above to grade it.
      </p>
    );
  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Vendor coverage matrix with your checked vendor observations.
          </caption>
          <thead>
            <colgroup>
              <col className="w-24" />
              <col className="w-36" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-40" />
              <col />
            </colgroup>
            <tr className="border-b border-border">
              {[
                "Vendor",
                "Your check",
                "Data coverage",
                "Timing",
                "Publication window",
                "Treatment",
              ].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.vendor}
                className={`border-b border-border/70 align-top last:border-0 ${row.applicable ? "" : "opacity-50"}`}
              >
                <td className="py-3 pr-4 text-sm font-semibold tracking-tight">
                  {vendorDisplayName(row.vendor)}
                </td>
                <td className="py-3 pr-4">
                  <CheckControl row={row} onMarkChange={onMarkChange} />
                </td>
                <td className="py-3 pr-4">
                  <DataCoverageCell row={row} />
                </td>
                <td className="py-3 pr-4">
                  <StateBadge state={row.state} />
                </td>
                <td className="py-3 pr-4">
                  <WindowCell row={row} />
                </td>
                <td className="py-3 max-w-[28rem]">
                  <TreatmentCell row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={row.vendor}
            className={`rounded-2xl border border-border bg-card/60 p-4 shadow-sm ${row.applicable ? "" : "opacity-60"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-tight">
                {vendorDisplayName(row.vendor)}
              </span>
              <StateBadge state={row.state} />
            </div>
            <div className="mt-3">
              <CheckControl row={row} onMarkChange={onMarkChange} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <DataCoverageCell row={row} />
              <WindowCell row={row} />
            </div>
            <div className="mt-3 border-t border-border/70 pt-2">
              <TreatmentCell row={row} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
