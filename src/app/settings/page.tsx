"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  PlusIcon,
  RotateCcwIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { Button } from "@/components/ui/button";
import { CANONICAL_EVENTS } from "@/lib/event-taxonomy";
import { VENDOR_IDS, VENDOR_LABELS, type VendorId } from "@/lib/vendors";
import {
  getEventOverrides,
  getVendorLeadDays,
  hasUserSettings,
  resetVendor,
  setEventOverride,
  setVendorDefault,
  statedSourceLabel,
  type LeadTimeSource,
} from "@/lib/coverage-settings";

const eventName = (id: string): string =>
  CANONICAL_EVENTS.find((e) => e.id === id)?.name ?? id;

/** Provenance chip — a user-typed lead time must never look like a
 * methodology-stated one (§11c constraint 2). */
function ProvenanceChip({
  source,
  vendor,
}: {
  source: LeadTimeSource;
  vendor: VendorId;
}) {
  if (source === "user-set") {
    return (
      <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
        your setting
      </span>
    );
  }
  if (source === "stated") {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        from {statedSourceLabel(vendor)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-border bg-transparent px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      not set
    </span>
  );
}

/** One vendor row: per-vendor default input + reset + collapsed per-event
 * overrides. Draft state is local so typing never re-renders the page. */
function VendorCard({ vendor }: { vendor: VendorId }) {
  const reduceMotion = useReducedMotion();
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const [defaultDraft, setDefaultDraft] = useState<string | null>(null);
  const [overridesOpen, setOverridesOpen] = useState(false);

  const label = VENDOR_LABELS[vendor];
  const vendorValue = getVendorLeadDays(vendor);
  const overrides = getEventOverrides(vendor);
  const userTouched = hasUserSettings(vendor);

  // draft keeps the text while the user types invalid/partial input; once it
  // is empty the input falls back to the RESOLVED value so the shown number
  // and the provenance chip always agree (never "empty field + stated chip").
  const shownDefault =
    defaultDraft ?? (vendorValue.value === null ? "" : String(vendorValue.value));

  const commitDefault = (text: string) => {
    if (text === "") {
      setDefaultDraft(null);
      setVendorDefault(vendor, null); // clears any user default -> back to source
    } else {
      setDefaultDraft(text);
      const n = Number(text);
      if (Number.isInteger(n) && n >= 0) setVendorDefault(vendor, n);
    }
    tick();
  };

  const commitOverride = (eventType: string, text: string) => {
    if (text === "") {
      setEventOverride(vendor, eventType, null);
    } else {
      const n = Number(text);
      if (Number.isInteger(n) && n >= 0) setEventOverride(vendor, eventType, n);
    }
    tick();
  };

  const addOverride = (eventType: string, text: string) => {
    if (text === "") return;
    const n = Number(text);
    if (!Number.isInteger(n) || n < 0) return;
    setEventOverride(vendor, eventType, n);
    tick();
  };

  const availableEvents = CANONICAL_EVENTS.filter(
    (e) => !overrides.some((o) => o.eventType === e.id),
  );

  return (
    <SurfaceSection padding="tight" className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{label}</h2>

        <div className="flex min-w-40 flex-1 items-center gap-2 sm:max-w-xs">
          <label className="sr-only" htmlFor={`lead-${vendor}`}>
            {label} publication lead time in days
          </label>
          <input
            id={`lead-${vendor}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={shownDefault}
            placeholder="not set"
            onChange={(e) => commitDefault(e.target.value)}
            className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ProvenanceChip source={vendorValue.source} vendor={vendor} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!userTouched}
            aria-label={`Reset ${label} to documented value`}
            onClick={() => {
              setDefaultDraft(null);
              resetVendor(vendor);
              tick();
            }}
          >
            <RotateCcwIcon aria-hidden />
            Reset
          </Button>
        </div>
      </div>

      {vendorValue.source === "unset" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Not set — the not-yet-due/missing verdict stays disabled for {label}{" "}
          until a lead time is entered here. No number, no source, no verdict.
        </p>
      )}

      {/* Per-event-type overrides — the exception case, collapsed by default. */}
      <div className="border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={overridesOpen}
          aria-controls={`overrides-${vendor}`}
          onClick={() => setOverridesOpen((o) => !o)}
          className="w-full justify-between text-muted-foreground"
        >
          <span>
            Per-event-type overrides
            {overrides.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {overrides.length}
              </span>
            )}
          </span>
          <ChevronDownIcon
            aria-hidden
            className={`h-4 w-4 transition-transform duration-200 ${
              overridesOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        <AnimatePresence initial={false}>
          {overridesOpen && (
            <motion.div
              id={`overrides-${vendor}`}
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3">
                {overrides.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No overrides — every event type uses the {label} default.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {overrides.map((o) => (
                      <li
                        key={o.eventType}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2"
                      >
                        <span className="w-48 text-sm text-foreground">
                          {eventName(o.eventType)}
                        </span>
                        <label
                          className="sr-only"
                          htmlFor={`lead-${vendor}-${o.eventType}`}
                        >
                          {label} {eventName(o.eventType)} lead time in days
                        </label>
                        <input
                          id={`lead-${vendor}-${o.eventType}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          defaultValue={String(o.days)}
                          onChange={(e) => commitOverride(o.eventType, e.target.value)}
                          className="h-8 w-20 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${eventName(o.eventType)} override for ${label}`}
                          onClick={() => {
                            setEventOverride(vendor, o.eventType, null);
                            tick();
                          }}
                        >
                          <XIcon aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add an override — one at a time, never a 13-row grid. */}
                {availableEvents.length > 0 && (
                  <AddOverrideForm
                    vendor={vendor}
                    availableEvents={availableEvents}
                    onAdd={addOverride}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SurfaceSection>
  );
}

function AddOverrideForm({
  vendor,
  availableEvents,
  onAdd,
}: {
  vendor: VendorId;
  availableEvents: readonly { id: string; name: string }[];
  onAdd: (eventType: string, days: string) => void;
}) {
  const [eventType, setEventType] = useState(availableEvents[0]?.id ?? "");
  const [days, setDays] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <label className="sr-only" htmlFor={`add-event-${vendor}`}>
        Event type for a new override
      </label>
      <select
        id={`add-event-${vendor}`}
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {availableEvents.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`add-days-${vendor}`}>
        Lead time in days for the new override
      </label>
      <input
        id={`add-days-${vendor}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={days}
        placeholder="days"
        onChange={(e) => setDays(e.target.value)}
        className="h-8 w-20 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={eventType === "" || days === ""}
        onClick={() => {
          onAdd(eventType, days);
          setDays("");
        }}
      >
        <PlusIcon aria-hidden />
        Add override
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  // Hydration guard: cards must not read localStorage until after mount, or
  // the client's first render would disagree with server HTML whenever the
  // operator has stored settings. The state flip IS the point of this effect;
  // react-hooks/set-state-in-effect has no alternative here (known limitation,
  // see MEMORY.md lessons on the React 19 cascading-renders rule).
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => setHydrated(true), []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Back to hub
          </Link>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Settings2Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
            Coverage settings
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">
            Vendor coverage periods
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The lead time is how many days before the ex-date a vendor should
            already carry a pending corporate action. Before that window,
            silence is expected (<em>not-yet-due</em>); inside it, silence is a
            real gap (<em>missing</em>). Set each vendor&apos;s default here —
            per-event-type overrides are the exception and stay collapsed.
          </p>
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
            FTSE Russell is seeded at 5 days from its published proforma
            tracker; MSCI and the remaining vendors start <em>not set</em> until
            you calibrate them — a lead time without a source is never applied.
            Settings are stored in this browser only (localStorage), no backend.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Cards render only after mount: SSR and the first client render both
            show the skeleton, so localStorage values can never disagree with
            the server HTML (hydration mismatch). */}
        <div className="space-y-4">
          {hydrated ? (
            VENDOR_IDS.map((v) => <VendorCard key={v} vendor={v} />)
          ) : (
            <div aria-hidden className="space-y-4">
              {VENDOR_IDS.map((v) => (
                <div
                  key={v}
                  className="h-24 motion-safe:animate-pulse rounded-[2rem] border border-border bg-muted/40"
                />
              ))}
            </div>
          )}
        </div>

        <footer className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p className="max-w-prose">
            Seeded values come from vendor methodology documents and confirmed
            product knowledge (spec §11c). Where a vendor&apos;s docs state no
            lead time, the coverage engine&apos;s not-yet-due/missing verdict is
            disabled for it rather than guessing — one vendor&apos;s horizon is
            never applied to another.
          </p>
        </footer>
      </div>
    </main>
  );
}