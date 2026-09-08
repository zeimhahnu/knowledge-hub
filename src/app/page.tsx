"use client";

import { FormEvent, useState } from "react";
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

/**
 * Returns a lookup route for an already-known corporate action, or null when
 * the input cannot satisfy the /lookup/[ticker] route contract.
 */
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

export default function Home() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [eventType, setEventType] = useState("");
  const [exDate, setExDate] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      <Band className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <div className="relative mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <SectionHeader
            className="mx-auto max-w-2xl text-center"
            eyebrow="Corporate-action validation"
            title="Reconcile a corporate action before it becomes a gap."
            description="Enter the event you already know about. We&apos;ll map expected vendor coverage and cross-check the announcement."
          />

          <Surface className="mx-auto mt-8 max-w-3xl p-4 sm:p-6">
            <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 md:grid-cols-2">
              <Field className="md:col-span-2" label="Ticker symbol" htmlFor="ticker" hint="Use the listed security&apos;s ticker, not its fund or index symbol.">
                <SymbolTypeahead value={ticker} onChange={setTicker} />
              </Field>

              <Field label="Event type" htmlFor="event-type">
                <select
                  id="event-type"
                  name="eventType"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  className={fieldControlClassName()}
                >
                  <option value="">Select an event type</option>
                  {CANONICAL_EVENTS.map((corporateAction) => (
                    <option key={corporateAction.id} value={corporateAction.id}>
                      {corporateAction.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Ex-date" htmlFor="ex-date">
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    id="ex-date"
                    name="exDate"
                    type="date"
                    value={exDate}
                    onChange={(event) => setExDate(event.target.value)}
                    className={fieldControlClassName("py-2 pl-11 pr-4")}
                  />
                </div>
              </Field>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="mt-6 min-h-12 w-full px-5 py-3 text-base"
            >
              Validate corporate action
              <ArrowRightIcon className="h-5 w-5" aria-hidden />
            </Button>
            </form>
          </Surface>
        </div>
      </Band>

      <RouteShell className="py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/vendors/"
            className="block rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Surface className="p-5 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <h2 className="text-lg font-semibold">Vendor reference</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Review methodology, timing, and treatment rules across index vendors.</p>
            </Surface>
          </Link>
          <Link
            href="/vendors/iso-taxonomy/"
            className="block rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Surface className="p-5 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <h2 className="text-lg font-semibold">ISO taxonomy</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Match corporate-action types to ISO 20022 CAEV classifications.</p>
            </Surface>
          </Link>
          <Link
            href="/upload/"
            className="block rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Surface className="p-5 transition-colors hover:border-primary/50 hover:bg-muted/50">
              <h2 className="text-lg font-semibold">Screen a methodology</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Check a vendor methodology PDF before the ingestion service is configured.</p>
            </Surface>
          </Link>
        </div>
      </RouteShell>
    </main>
  );
}
