"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDownIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { Button } from "@/components/ui/button";
import { CANONICAL_EVENTS } from "@/lib/event-taxonomy";
import { VENDOR_IDS, VENDOR_LABELS, type VendorId } from "@/lib/vendors";
import {
  freshSettingsDraft,
  getEventOverridesFromDraft,
  getSettingsDraft,
  getVendorLeadDaysFromDraft,
  hasUserSettingsInDraft,
  isSettingsDraftDirty,
  reduceSettingsSave,
  statedSourceLabel,
  writeSettingsDraft,
  type LeadTimeSource,
  type SettingsDraft,
  type SettingsSaveState,
} from "@/lib/coverage-settings";

const eventName = (id: string): string =>
  CANONICAL_EVENTS.find((event) => event.id === id)?.name ?? id;

function ProvenanceChip({ source, vendor }: { source: LeadTimeSource; vendor: VendorId }) {
  if (source === "user-set")
    return (
      <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
        your setting
      </span>
    );
  if (source === "stated")
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        from {statedSourceLabel(vendor)}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-border bg-transparent px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      not set
    </span>
  );
}

const withVendorDefault = (
  draft: SettingsDraft,
  vendor: VendorId,
  value: number | null,
): SettingsDraft => {
  const vendorDefaults = { ...draft.vendorDefaults };
  if (value === null) delete vendorDefaults[vendor];
  else vendorDefaults[vendor] = value;
  return { ...draft, vendorDefaults };
};

const withOverride = (
  draft: SettingsDraft,
  vendor: VendorId,
  eventType: string,
  value: number | null,
): SettingsDraft => {
  const overrides = { ...draft.overrides };
  const vendorOverrides = { ...overrides[vendor] };
  if (value === null) delete vendorOverrides[eventType];
  else vendorOverrides[eventType] = value;
  if (Object.keys(vendorOverrides).length === 0) delete overrides[vendor];
  else overrides[vendor] = vendorOverrides;
  return { ...draft, overrides };
};

function VendorCard({
  vendor,
  draft,
  onChange,
}: {
  vendor: VendorId;
  draft: SettingsDraft;
  onChange: (draft: SettingsDraft) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [overridesOpen, setOverridesOpen] = useState(false);
  const label = VENDOR_LABELS[vendor];
  const vendorValue = getVendorLeadDaysFromDraft(vendor, draft);
  const overrides = getEventOverridesFromDraft(vendor, draft);
  const availableEvents = CANONICAL_EVENTS.filter(
    (event) => !overrides.some((override) => override.eventType === event.id),
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
            value={vendorValue.value === null ? "" : String(vendorValue.value)}
            placeholder="not set"
            onChange={(event) => {
              const value = event.target.value;
              if (value === "") onChange(withVendorDefault(draft, vendor, null));
              else {
                const days = Number(value);
                if (Number.isInteger(days) && days >= 0)
                  onChange(withVendorDefault(draft, vendor, days));
              }
            }}
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
            disabled={!hasUserSettingsInDraft(vendor, draft)}
            aria-label={`Reset ${label} to documented value`}
            onClick={() =>
              onChange({
                ...draft,
                vendorDefaults: Object.fromEntries(
                  Object.entries(draft.vendorDefaults).filter(([key]) => key !== vendor),
                ),
                overrides: Object.fromEntries(
                  Object.entries(draft.overrides).filter(([key]) => key !== vendor),
                ),
              })
            }
          >
            <RotateCcwIcon aria-hidden /> Reset
          </Button>
        </div>
      </div>
      {vendorValue.source === "unset" && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Not set — the not-yet-due/missing verdict stays disabled for {label} until a lead time is
          entered here. No number, no source, no verdict.
        </p>
      )}
      <div className="border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={overridesOpen}
          aria-controls={`overrides-${vendor}`}
          onClick={() => setOverridesOpen((open) => !open)}
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
            className={`h-4 w-4 transition-transform duration-200 ${overridesOpen ? "rotate-180" : ""}`}
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
                    {overrides.map((override) => (
                      <li
                        key={override.eventType}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2"
                      >
                        <span className="w-48 text-sm text-foreground">
                          {eventName(override.eventType)}
                        </span>
                        <label className="sr-only" htmlFor={`lead-${vendor}-${override.eventType}`}>
                          {label} {eventName(override.eventType)} lead time in days
                        </label>
                        <input
                          id={`lead-${vendor}-${override.eventType}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={String(override.days)}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === "")
                              onChange(withOverride(draft, vendor, override.eventType, null));
                            else {
                              const days = Number(value);
                              if (Number.isInteger(days) && days >= 0)
                                onChange(withOverride(draft, vendor, override.eventType, days));
                            }
                          }}
                          className="h-8 w-20 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${eventName(override.eventType)} override for ${label}`}
                          onClick={() =>
                            onChange(withOverride(draft, vendor, override.eventType, null))
                          }
                        >
                          <XIcon aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {availableEvents.length > 0 && (
                  <AddOverrideForm
                    vendor={vendor}
                    availableEvents={availableEvents}
                    onAdd={(eventType, days) =>
                      onChange(withOverride(draft, vendor, eventType, days))
                    }
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
  onAdd: (eventType: string, days: number) => void;
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
        onChange={(event) => setEventType(event.target.value)}
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {availableEvents.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`add-days-${vendor}`}>
        Lead time in days for a new override
      </label>
      <input
        id={`add-days-${vendor}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={days}
        placeholder="days"
        onChange={(event) => setDays(event.target.value)}
        className="h-8 w-20 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={eventType === "" || !Number.isInteger(Number(days)) || Number(days) < 0}
        onClick={() => {
          onAdd(eventType, Number(days));
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
  // Hydration guard: no localStorage read occurs until this effect, so SSR and
  // the first client render agree even when this browser already has settings.
  const [hydrated, setHydrated] = useState(false);
  const [saveState, dispatch] = useReducer(reduceSettingsSave, {
    stored: freshSettingsDraft(),
    draft: freshSettingsDraft(),
    status: "idle",
  } satisfies SettingsSaveState);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    const draft = getSettingsDraft();
    dispatch({ type: "edit", draft });
    // Hydration guard: cards must not read localStorage until after mount, or
    // SSR and the client disagree. Empty dep array, so it runs once and cannot
    // cascade. The directive must be the LAST comment line to be in range.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);
  const dirty = useMemo(
    () => isSettingsDraftDirty(saveState.draft, saveState.stored),
    [saveState.draft, saveState.stored],
  );
  const updateDraft = (draft: SettingsDraft) => dispatch({ type: "edit", draft });
  const save = () => {
    if (writeSettingsDraft(saveState.draft)) {
      dispatch({ type: "save-success" });
      setSavedAt(
        new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    } else dispatch({ type: "save-failure" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Settings2Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
            Coverage settings
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">Vendor coverage periods</h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The lead time is how many days before the ex-date a vendor should already carry a
            pending corporate action. Before that window, silence is expected (<em>not-yet-due</em>
            ); inside it, silence is a real gap (<em>missing</em>). Set each vendor&apos;s default
            here — per-event-type overrides are the exception and stay collapsed.
          </p>
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
            FTSE Russell is seeded at 5 days from its published proforma tracker; MSCI and the
            remaining vendors start <em>not set</em> until you calibrate them — a lead time without
            a source is never applied. Settings are stored in this browser only (localStorage), no
            backend.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
          aria-live="polite"
        >
          <p
            className={`text-sm font-medium ${dirty ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}
          >
            {dirty
              ? "Unsaved changes"
              : saveState.status === "saved"
                ? `Saved${savedAt ? ` at ${savedAt}` : ""}`
                : "No unsaved changes"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!dirty}
              onClick={() => dispatch({ type: "discard" })}
            >
              <RotateCcwIcon aria-hidden />
              Discard changes
            </Button>
            <Button type="button" size="sm" disabled={!dirty} onClick={save}>
              <SaveIcon aria-hidden />
              Save
            </Button>
          </div>
          {saveState.status === "failed" && (
            <p className="w-full text-xs font-medium text-destructive">
              Saving failed. Your changes are still here; check browser storage and try again.
            </p>
          )}
        </div>
        <div className="space-y-4">
          {hydrated ? (
            VENDOR_IDS.map((vendor) => (
              <VendorCard
                key={vendor}
                vendor={vendor}
                draft={saveState.draft}
                onChange={updateDraft}
              />
            ))
          ) : (
            <div aria-hidden className="space-y-4">
              {VENDOR_IDS.map((vendor) => (
                <div
                  key={vendor}
                  className="h-24 motion-safe:animate-pulse rounded-[2rem] border border-border bg-muted/40"
                />
              ))}
            </div>
          )}
        </div>
        <footer className="mt-8 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p className="max-w-prose">
            Seeded values come from vendor methodology documents and confirmed product knowledge
            (spec §11c). Where a vendor&apos;s docs state no lead time, the coverage engine&apos;s
            not-yet-due/missing verdict is disabled for it rather than guessing — one vendor&apos;s
            horizon is never applied to another.
          </p>
        </footer>
      </div>
    </main>
  );
}
