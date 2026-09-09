"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CalendarIcon } from "lucide-react";

import { SymbolTypeahead } from "@/components/home/symbol-typeahead";
import { RouteShell } from "@/components/route-shell";
import { Band } from "@/components/ui/band";
import { Field, fieldControlClassName } from "@/components/ui/field";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { CANONICAL_EVENTS } from "@/lib/event-taxonomy";
import { getStoredInvestigations, type StoredInvestigation } from "@/lib/vendor-confirmation";
import { VENDOR_IDS } from "@/lib/vendors";

const TICKER_RE = /^[A-Za-z0-9.\-^=]{1,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Returns a lookup route for an already-known corporate action. */
export function buildLookupUrl(ticker: string, eventType: string, exDate: string): string | null {
  const normalizedTicker = ticker.trim().toUpperCase();
  const normalizedEventType = eventType.trim();
  const normalizedExDate = exDate.trim();

  if (!TICKER_RE.test(normalizedTicker) || !normalizedEventType || !isValidDate(normalizedExDate)) {
    return null;
  }

  return `/lookup/${encodeURIComponent(normalizedTicker)}?eventType=${encodeURIComponent(normalizedEventType)}&exDate=${encodeURIComponent(normalizedExDate)}`;
}

function validationMessage(ticker: string, eventType: string, exDate: string): string | null {
  if (!ticker.trim()) return "Enter a ticker symbol to continue.";
  if (!TICKER_RE.test(ticker.trim())) return "Use a valid ticker symbol (up to 15 letters, numbers, ., -, ^, or =).";
  if (!eventType) return "Choose the corporate-action type you are reconciling.";
  if (!isValidDate(exDate)) return "Enter a valid ex-date in YYYY-MM-DD format.";
  return null;
}

function findingSoFar(investigation: StoredInvestigation): string {
  const marks = Object.values(investigation.marks);
  const supplied = marks.filter((mark) => mark.state === "confirmed").length;
  const absent = marks.filter((mark) => mark.state === "absent").length;
  const parts: string[] = [];
  if (supplied > 0) parts.push(`${supplied} supplied`);
  if (absent > 0) parts.push(`${absent} absent`);
  if (parts.length === 0) parts.push("No finding recorded yet");
  return `${parts.join(" · ")} · ${marks.length} of ${VENDOR_IDS.length} checked`;
}

function eventLabel(eventType: string): string {
  return CANONICAL_EVENTS.find((event) => event.id === eventType)?.name ?? eventType;
}

export default function Home() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [eventType, setEventType] = useState("");
  const [exDate, setExDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [investigations, setInvestigations] = useState<StoredInvestigation[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
    setInvestigations(getStoredInvestigations());
    setHydrated(true);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = validationMessage(ticker, eventType, exDate);
    const href = buildLookupUrl(ticker, eventType, exDate);
    if (message || !href) {
      setError(message ?? "Check the event details and try again.");
      return;
    }

    setError(null);
    router.push(href);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Band tone="dark" className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:64px_64px]" />
        <RouteShell className="relative">
          <SectionHeader
            eyebrow="Corporate-action validation"
            title="Reconcile a corporate action before it becomes a gap."
            description="Enter the event you already know about. We&apos;ll map expected vendor coverage and cross-check the announcement."
          />

          <Surface className="mt-8 max-w-3xl p-4 sm:p-6">
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2" label="Ticker symbol" htmlFor="ticker" hint="Use the listed security&apos;s ticker, not its fund or index symbol.">
                  <SymbolTypeahead value={ticker} onChange={setTicker} />
                </Field>

                <Field label="Event type" htmlFor="event-type">
                  <select id="event-type" name="eventType" value={eventType} onChange={(event) => setEventType(event.target.value)} className={fieldControlClassName()}>
                    <option value="">Select an event type</option>
                    {CANONICAL_EVENTS.map((corporateAction) => <option key={corporateAction.id} value={corporateAction.id}>{corporateAction.name}</option>)}
                  </select>
                </Field>

                <Field label="Ex-date" htmlFor="ex-date">
                  <div className="relative">
                    <CalendarIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <input id="ex-date" name="exDate" type="date" value={exDate} onChange={(event) => setExDate(event.target.value)} className={fieldControlClassName("py-2 pl-11 pr-4")} />
                  </div>
                </Field>
              </div>

              {error && <p role="alert" className="mt-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

              <Button type="submit" className="mt-6 min-h-12 w-full px-5 py-3 text-base">
                Validate corporate action
                <ArrowRightIcon className="h-5 w-5" aria-hidden />
              </Button>
            </form>
          </Surface>
        </RouteShell>
      </Band>

      <Band tone="light">
        <RouteShell>
          <p className="ca-eyebrow">Workbench</p>
          <h2 className="ca-section-title mt-2">Open investigations</h2>
          <p className="ca-body-copy mt-4 max-w-prose">Pick up where you left off. Your observations stay in this browser; nothing is invented when the list is empty.</p>

          {!hydrated ? (
            <div aria-hidden className="ca-surface mt-8 h-28 animate-pulse bg-muted/30" />
          ) : investigations.length === 0 ? (
            <Surface className="mt-8 max-w-3xl border-dashed p-6">
              <p className="font-medium text-foreground">No open investigations yet.</p>
              <p className="ca-body-copy mt-2">Start with the framing form above. Once you check a vendor, the investigation will appear here.</p>
            </Surface>
          ) : (
            <div className="mt-8 max-w-4xl space-y-3">
              {investigations.map((investigation) => (
                <Link key={`${investigation.ticker}-${investigation.eventType}-${investigation.exDate}`} href={buildLookupUrl(investigation.ticker, investigation.eventType, investigation.exDate) ?? "/"} className="block rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Surface className="grid gap-4 p-5 transition-colors hover:border-accent sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_auto] sm:items-center">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{investigation.ticker}</p>
                      <p className="mt-1 text-sm text-foreground">Ex-date {investigation.exDate}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{eventLabel(investigation.eventType)}</p>
                      <p className="ca-meta mt-1">{findingSoFar(investigation)}</p>
                    </div>
                    <span className="text-sm font-medium text-accent sm:text-right">Continue →</span>
                  </Surface>
                </Link>
              ))}
            </div>
          )}

          <nav aria-label="Reference links" className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link href="/vendors/" className="font-medium text-accent underline-offset-4 hover:underline">Vendor reference</Link>
            <Link href="/vendors/iso-taxonomy/" className="font-medium text-accent underline-offset-4 hover:underline">ISO taxonomy</Link>
            <Link href="/upload/" className="font-medium text-accent underline-offset-4 hover:underline">Screen a methodology</Link>
          </nav>
        </RouteShell>
      </Band>
    </main>
  );
}
