import { leadTimeProvenance } from "@/lib/lookup-verdict";
import type { MatrixRow } from "@/lib/lookup-verdict";
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
        {row.sourceRef && (
          <span className="mt-1 block text-xs">{row.sourceRef}</span>
        )}
      </span>
    );
  return (
    <span className="block">
      <span className="text-sm leading-relaxed text-foreground/90">
        {row.treatment}
      </span>
      {row.sourceRef && (
        <span className="mt-1 block text-xs text-muted-foreground">
          {row.sourceRef}
        </span>
      )}
    </span>
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
                <td className="py-3">
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
