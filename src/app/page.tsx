"use client";

import { FormEvent, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CalendarIcon, SearchIcon } from "lucide-react";

import { SymbolTypeahead } from "@/components/home/symbol-typeahead";
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
  const prefersReducedMotion = useReducedMotion();
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
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:64px_64px]"
        />
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16"
        >
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              <SearchIcon className="h-4 w-4 text-primary" aria-hidden />
              Corporate-action validation
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Reconcile a corporate action before it becomes a gap.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Enter the event you already know about. We&apos;ll map expected vendor coverage and cross-check the announcement.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-6"
            noValidate
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="ticker" className="mb-2 block text-sm font-semibold">
                  Ticker symbol
                </label>
                <SymbolTypeahead value={ticker} onChange={setTicker} />
                <p id="ticker-help" className="mt-2 text-xs text-muted-foreground">
                  Use the listed security&apos;s ticker, not its fund or index symbol.
                </p>
              </div>

              <div>
                <label htmlFor="event-type" className="mb-2 block text-sm font-semibold">
                  Event type
                </label>
                <select
                  id="event-type"
                  name="eventType"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select an event type</option>
                  {CANONICAL_EVENTS.map((corporateAction) => (
                    <option key={corporateAction.id} value={corporateAction.id}>
                      {corporateAction.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ex-date" className="mb-2 block text-sm font-semibold">
                  Ex-date
                </label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    id="ex-date"
                    name="exDate"
                    type="date"
                    value={exDate}
                    onChange={(event) => setExDate(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-border bg-background py-2 pl-11 pr-4 text-base outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Validate corporate action
              <ArrowRightIcon className="h-5 w-5" aria-hidden />
            </button>
          </form>
        </motion.div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/vendors/"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h2 className="text-lg font-semibold">Vendor reference</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Review methodology, timing, and treatment rules across index vendors.
            </p>
          </Link>
          <Link
            href="/vendors/iso-taxonomy/"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h2 className="text-lg font-semibold">ISO taxonomy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Match corporate-action types to ISO 20022 CAEV classifications.
            </p>
          </Link>
          <Link
            href="/upload"
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h2 className="text-lg font-semibold">Screen a methodology</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Check a vendor methodology PDF before the ingestion service is configured.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
