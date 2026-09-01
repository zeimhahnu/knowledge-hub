import Link from "next/link";

import type { MatrixRow } from "@/lib/lookup-verdict";
import { leadTimeProvenance } from "@/lib/lookup-verdict";
import type { VendorId } from "@/lib/vendors";

/**
 * Coverage matrix (§7a-i + §7a-ii) — one row per IN-SCOPE vendor, columns
 * Vendor / Coverage / Publication window / Treatment. Presentational only:
 * rows come pre-computed from `computeLookupVerdict`; the five states render
 * distinctly with the design system's semantic tokens.
 *
 * The two rules that carry the whole point of the tool:
 *  - a not-assessed vendor (no lead time set) shows a "set it" affordance
 *    and NO verdict;
 *  - a not-applicable vendor is visibly de-emphasised and is NEVER counted
 *    in the verdict totals (that exclusion happens in the verdict helper).
 */

const STATE_META: Record<MatrixRow["state"], { label: string; chip: string }> = {
  covered: {
    label: "Covered",
    chip: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  },
  "not-yet-due": {
    label: "Not yet due",
    chip: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  },
  missing: {
    label: "Missing",
    chip: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  "not-assessed": {
    label: "Not assessed",
    chip: "border-chart-2/50 bg-chart-2/10 text-chart-2",
  },
  "not-applicable": {
    label: "Not applicable",
    chip: "border-border bg-muted/30 text-muted-foreground",
  },
};

function StateBadge({ state }: { state: MatrixRow["state"] }) {
  const meta = STATE_META[state];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}

/** D3 provenance chip — mirrors the settings page's ProvenanceChip: a
 * user-typed number must never render identically to a documented one. */
function ProvenanceChip({ row }: { row: MatrixRow }) {
  if (!row.applicable) return null;
  if (row.source === null) return null;
  const { label, tone } = leadTimeProvenance(row.source, row.vendor);

  const toneClass =
    tone === "user"
      ? "border-primary/40 bg-primary/15 text-primary"
      : tone === "stated"
        ? "border-border bg-muted/60 text-muted-foreground"
        : "border-dashed border-border bg-transparent text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}

function WindowCell({ row }: { row: MatrixRow }) {
  if (!row.applicable) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      {row.leadDays !== null && (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {row.leadDays}d
        </span>
      )}
      <ProvenanceChip row={row} />
    </span>
  );
}

function SetItAffordance({ vendor }: { vendor: VendorId }) {
  return (
    <Link
      href="/settings"
      aria-label={`Set ${vendor === "sp" ? "S&P DJI" : vendor[0]!.toUpperCase() + vendor.slice(1)} lead time in Coverage settings`}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary underline-offset-4 outline-none transition-colors hover:bg-primary/10 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      set it
    </Link>
  );
}

function CoverageCell({ row }: { row: MatrixRow }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StateBadge state={row.state} />
      {row.state === "not-assessed" && <SetItAffordance vendor={row.vendor} />}
      {row.state === "not-applicable" && (
        <span className="text-xs text-muted-foreground/70">uninvolved</span>
      )}
    </span>
  );
}

function TreatmentCell({ row }: { row: MatrixRow }) {
  if (!row.applicable) {
    return <span className="text-sm text-muted-foreground/60">—</span>;
  }
  if (row.treatment === null) {
    return (
      <span className="text-sm italic text-muted-foreground">
        No rule extracted for this vendor + event yet.
      </span>
    );
  }
  return (
    <span className="block">
      <span className="text-sm leading-relaxed text-foreground/90">{row.treatment}</span>
      {row.sourceRef && (
        <span className="mt-1 block text-xs text-muted-foreground">{row.sourceRef}</span>
      )}
    </span>
  );
}

const vendorDisplayName = (vendor: VendorId): string =>
  vendor === "sp" ? "S&P DJI" : vendor[0]!.toUpperCase() + vendor.slice(1);

export function CoverageMatrix({ rows }: { rows: MatrixRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No vendors in scope. Add one in the scope row above to grade it.
      </p>
    );
  }
  return (
    <div>
      {/* Desktop: real table, WCAG-friendly. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Vendor coverage matrix — one row per in-scope vendor: coverage
            state, publication window with its source, and treatment rule.
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Vendor
              </th>
              <th scope="col" className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Coverage
              </th>
              <th scope="col" className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Publication window
              </th>
              <th scope="col" className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Treatment
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.vendor}
                className={`border-b border-border/70 align-top last:border-0 ${
                  row.applicable ? "" : "opacity-50"
                }`}
              >
                <td className="py-3 pr-4">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    {vendorDisplayName(row.vendor)}
                  </span>
                  {!row.applicable && (
                    <span className="mt-1 block text-xs text-muted-foreground/70">
                      out of scope
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <CoverageCell row={row} />
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

      {/* Mobile: stacked cards — no horizontal scroll for a core path. */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={row.vendor}
            className={`rounded-2xl border border-border bg-card/60 p-4 shadow-sm ${
              row.applicable ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {vendorDisplayName(row.vendor)}
              </span>
              {!row.applicable && (
                <span className="rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  out of scope
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StateBadge state={row.state} />
              {row.state === "not-assessed" && <SetItAffordance vendor={row.vendor} />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {row.applicable && row.leadDays !== null && (
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {row.leadDays}d
                </span>
              )}
              <ProvenanceChip row={row} />
            </div>
            <div className="mt-2 border-t border-border/70 pt-2">
              <TreatmentCell row={row} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}