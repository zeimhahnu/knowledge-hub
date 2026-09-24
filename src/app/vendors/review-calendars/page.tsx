import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { Eyebrow } from "@/components/ui/design-system";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { VendorReferenceNav } from "@/components/vendor-reference-nav";
import targeted from "@/data/fund-master/targeted-funds.json";
import { nextReviewDate, reviewCalendarFor, vendorProfiles, type ReviewCalendar } from "@/lib/deferral";
import { franklinSnapshot } from "@/lib/fund-master";
import { PROVIDER_VENDOR, VENDOR_IDS, VENDOR_LABELS } from "@/lib/vendors";

export const metadata = {
  title: "Review calendars · Vendor reference",
  description: "When each index applies a deferred share or float change: its quarterly review (QIR) or rebalance date.",
};

// "Next review" moves with the calendar, not with deploys.
export const revalidate = 86400;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function schedule(calendar: ReviewCalendar): string {
  const day = calendar.effective.replace("-", " ").replace(/(monday|tuesday|wednesday|thursday|friday)/, (d) => d[0].toUpperCase() + d.slice(1));
  const months = [...calendar.months].sort((a, b) => a - b).map((m) => MONTHS[m - 1]).join(", ");
  return `${calendar.frequency[0].toUpperCase()}${calendar.frequency.slice(1)} · ${months} · ${day}`;
}

/** The targeted funds' indexes, grouped by vendor: one row per index, its funds alongside. */
function targetedIndexes() {
  const tickers = new Set(targeted.funds.map((fund) => fund.ticker));
  const byIndex = new Map<string, { vendor: string; index: string; funds: string[] }>();
  for (const record of franklinSnapshot.records) {
    const vendor = record.index_provider ? PROVIDER_VENDOR[record.index_provider] : undefined;
    if (!tickers.has(record.ticker) || !vendor || !record.underlying_index) continue;
    const row = byIndex.get(record.underlying_index) ?? { vendor, index: record.underlying_index, funds: [] };
    row.funds.push(record.lifecycle?.status === "closed" ? `${record.ticker} (closed)` : record.ticker);
    byIndex.set(record.underlying_index, row);
  }
  return [...byIndex.values()].sort((a, b) => a.index.localeCompare(b.index));
}

/**
 * Where a deferred change lands, per index.
 *
 * A change below a vendor's intra-quarter test is not applied on the event date;
 * it waits for the index's next scheduled review. The lookup grades a vendor's
 * silence against that date, so this page shows the same calendar the lookup
 * uses: the index's own when sourced, else the vendor-wide cycle, else nothing.
 */
export default function ReviewCalendarsPage() {
  const today = new Date();
  const indexes = targetedIndexes();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Band tone="dark">
        <RouteShell wide className="space-y-8">
          <SectionHeader
            eyebrow="Vendor reference"
            title="Review calendars"
            description="When each index applies a change it deferred: its quarterly index review (QIR) or rebalance. A share or float change below the vendor's intra-quarter test waits for this date, so a vendor's silence before it is expected, not a miss."
          />
          <VendorReferenceNav current="calendars" />
        </RouteShell>
      </Band>

      <Band tone="light" className="min-h-screen">
        <main>
          <RouteShell wide className="space-y-6">
            {VENDOR_IDS.map((vendor) => {
              const rows = indexes.filter((row) => row.vendor === vendor);
              if (rows.length === 0) return null;
              const profile = vendorProfiles.find((candidate) => candidate.vendor === vendor);
              const wide = profile?.review_calendar ?? null;
              return (
                <Surface key={vendor} as="section" aria-labelledby={`cal-${vendor}`} className="p-5 sm:p-6">
                  <h2 id={`cal-${vendor}`} className="text-lg font-semibold">{VENDOR_LABELS[vendor]}</h2>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {wide ? <>Vendor-wide cycle: <span className="text-foreground">{schedule(wide)}</span></> : "No vendor-wide cycle: each index's own rulebook sets its dates."}
                  </p>
                  {wide && <p className="ca-meta mt-1 break-words">{wide.note ? `${wide.note} ` : ""}Source: {wide.source_ref}</p>}

                  <div aria-hidden className="ca-meta mt-4 hidden gap-x-6 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_7rem]">
                    <span>Index · funds</span><span>Review schedule</span><span className="text-right">Next review</span>
                  </div>
                  <ul className="mt-2 divide-y divide-border border-t border-border">
                    {rows.map((row) => {
                      const found = reviewCalendarFor(vendor, row.index);
                      const own = found?.scope === "index" ? found.calendar : null;
                      const next = found ? nextReviewDate(found.calendar, today).toISOString().slice(0, 10) : null;
                      return (
                        <li key={row.index} className="grid gap-x-6 gap-y-1 py-3 md:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_7rem]">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">{row.index}</p>
                            <p className="ca-meta break-words">{row.funds.join(", ")}</p>
                          </div>
                          <div className="min-w-0 text-sm">
                            {own ? (
                              <>
                                <p className="break-words">{schedule(own)}</p>
                                <p className="ca-meta break-words">{own.note ? `${own.note} ` : ""}Source: {own.source_ref}</p>
                              </>
                            ) : found ? (
                              <p className="break-words text-muted-foreground">Vendor-wide cycle; this index&apos;s own rulebook not yet checked</p>
                            ) : (
                              <p className="break-words text-muted-foreground">Not sourced: the lookup cannot date a deferral here</p>
                            )}
                          </div>
                          <div className="text-sm tabular-nums md:text-right">
                            {next ? <><Eyebrow className="md:hidden">Next review</Eyebrow>{next}</> : <span className="text-muted-foreground">-</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Surface>
              );
            })}
            <p className="ca-meta max-w-prose">
              Dates are after the close; weekends are skipped but exchange holidays are not, so a review falling on a holiday moves by a day.
            </p>
          </RouteShell>
        </main>
      </Band>
    </div>
  );
}
