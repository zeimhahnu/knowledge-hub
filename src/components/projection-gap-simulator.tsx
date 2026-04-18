"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VENDOR_IDS, vendorLabel, type VendorId } from "@/lib/vendors";
import { runSimulator } from "@/lib/simulator/simulator-engine";
import type { SimulatorInput, SimulatorResult } from "@/lib/simulator/types";

const STEPS = [
  "Event",
  "Details",
  "Dates",
  "Vendors",
  "Results",
] as const;

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultInput = (): SimulatorInput => ({
  eventClass: "mandatory",
  eventFamily: "merger",
  rightsItm: "unknown",
  rightsSubscriptionKnown: true,
  mnaDealType: "stock",
  mnaIndexParties: "both",
  spinoffChildEligible: "unknown",
  spinoffPhase: "unknown",
  dividendFlavor: "unknown",
  indexReturnVariant: "unknown",
  effectiveDate: "",
  exDate: "",
  dataAsOf: todayIso(),
  missingVendors: [],
  presentVendors: [],
  notes: "",
});

function relevanceStyles(r: "high" | "medium" | "low"): string {
  if (r === "high") return "border-primary/40 bg-primary/10 text-primary";
  if (r === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-border bg-muted/30 text-muted-foreground";
}

function toggleVendor(list: VendorId[], id: VendorId): VendorId[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function ProjectionGapSimulator() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<SimulatorInput>(defaultInput);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const canShowSubdetails = useMemo(() => {
    const f = input.eventFamily;
    return (
      f === "rights" ||
      f === "merger" ||
      f === "spinoff" ||
      f === "dividend"
    );
  }, [input.eventFamily]);

  function validateCurrent(): string | null {
    if (step === 0) return null;
    if (step === 1) {
      return null;
    }
    if (step === 2) {
      if (!input.effectiveDate) return "Please set an effective date.";
      if (!input.dataAsOf) return "Please set the projection “as of” date.";
      return null;
    }
    if (step === 3) {
      if (input.missingVendors.length === 0 || input.presentVendors.length === 0) {
        return "Select at least one vendor that appears missing and at least one that sent a projection file.";
      }
      return null;
    }
    return null;
  }

  function goNext() {
    const err = validateCurrent();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step === 3) {
      setResult(runSimulator(input));
      setStep(4);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function reset() {
    setInput(defaultInput());
    setResult(null);
    setStep(0);
    setStepError(null);
  }

  return (
    <section
      id="projection-gap-simulator"
      className="relative mx-auto max-w-3xl rounded-3xl border border-border bg-card/80 p-6 shadow-xl shadow-black/20 backdrop-blur-md md:p-8"
      aria-labelledby="simulator-heading"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <SparklesIcon className="size-3.5" aria-hidden />
            Interactive
          </div>
          <h2 id="simulator-heading" className="text-xl font-bold tracking-tight md:text-2xl">
            Projection gap simulator
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Describe the event, dates, and which vendors differ. You will get ranked, explainable hypotheses — not vendor guarantees.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-xl border border-border bg-background/80 p-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide sm:text-xs",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60",
              )}
              title={label}
            >
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="min-h-[220px]"
        >
          {step === 0 && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Event class</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    [
                      { v: "mandatory" as const, t: "Mandatory", d: "Confirmed facts — dividend, split, merger, spin-off…" },
                      { v: "voluntary" as const, t: "Voluntary", d: "Shareholder choice — rights, tender, partial offer…" },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setInput((p) => ({ ...p, eventClass: o.v }))}
                      className={cn(
                        "rounded-2xl border p-4 text-left text-sm transition-all hover:border-primary/50",
                        input.eventClass === o.v
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background/50",
                      )}
                    >
                      <div className="font-semibold">{o.t}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{o.d}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Event family</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["dividend", "Dividend"],
                      ["split", "Split / consolidation"],
                      ["merger", "M&A"],
                      ["spinoff", "Spin-off"],
                      ["rights", "Rights issue"],
                      ["tender", "Tender / buyback"],
                      ["return_of_capital", "Return of capital"],
                      ["delisting", "Delisting"],
                      ["other", "Other"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setInput((p) => ({
                          ...p,
                          eventFamily: value,
                        }))
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all hover:border-primary/50 sm:text-sm",
                        input.eventFamily === value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background/50 text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {!canShowSubdetails ? (
                <p className="text-sm text-muted-foreground">
                  No extra fields are required for this event family in the pilot. You can continue to dates — or pick M&A, spin-off, rights, or dividend for deeper prompts.
                </p>
              ) : (
                <>
                  {input.eventFamily === "rights" && (
                    <fieldset>
                      <legend className="mb-3 text-sm font-semibold">Rights — money-ness</legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {(
                          [
                            ["itm", "In-the-money"],
                            ["otm", "Out-of-the-money"],
                            ["unknown", "Unknown / unsure"],
                          ] as const
                        ).map(([v, label]) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setInput((p) => ({ ...p, rightsItm: v }))}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                              input.rightsItm === v
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background/50",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={input.rightsSubscriptionKnown}
                          onChange={(e) =>
                            setInput((p) => ({ ...p, rightsSubscriptionKnown: e.target.checked }))
                          }
                          className="size-4 rounded border-border"
                        />
                        <span>Subscription price and ratio are known / final</span>
                      </label>
                    </fieldset>
                  )}

                  {input.eventFamily === "merger" && (
                    <>
                      <fieldset>
                        <legend className="mb-3 text-sm font-semibold">M&A — consideration</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(
                            [
                              ["stock", "Mostly stock"],
                              ["cash", "Mostly cash"],
                              ["mixed", "Mixed / unclear"],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setInput((p) => ({ ...p, mnaDealType: v }))}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                                input.mnaDealType === v
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background/50",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="mb-3 text-sm font-semibold">Who is in your managed index?</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(
                            [
                              ["target_only", "Target only"],
                              ["acquirer_only", "Acquirer only"],
                              ["both", "Both in same index"],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setInput((p) => ({ ...p, mnaIndexParties: v }))}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                                input.mnaIndexParties === v
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background/50",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </>
                  )}

                  {input.eventFamily === "spinoff" && (
                    <>
                      <fieldset>
                        <legend className="mb-3 text-sm font-semibold">Spin-off child — index eligible?</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(
                            [
                              ["yes", "Yes — eligible"],
                              ["no", "No — not eligible"],
                              ["unknown", "Unknown"],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setInput((p) => ({ ...p, spinoffChildEligible: v }))}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                                input.spinoffChildEligible === v
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background/50",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      {input.spinoffChildEligible !== "no" && (
                        <fieldset>
                          <legend className="mb-3 text-sm font-semibold">Trading phase</legend>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {(
                              [
                                ["placeholder", "Placeholder / WI only"],
                                ["live_trade", "Regular market trading"],
                                ["unknown", "Unknown"],
                              ] as const
                            ).map(([v, label]) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setInput((p) => ({ ...p, spinoffPhase: v }))}
                                className={cn(
                                  "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                                  input.spinoffPhase === v
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-background/50",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )}
                    </>
                  )}

                  {input.eventFamily === "dividend" && (
                    <>
                      <fieldset>
                        <legend className="mb-3 text-sm font-semibold">Dividend type</legend>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {(
                            [
                              ["ordinary", "Ordinary"],
                              ["special", "Special"],
                              ["unknown", "Unknown"],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setInput((p) => ({ ...p, dividendFlavor: v }))}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                                input.dividendFlavor === v
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background/50",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="mb-3 text-sm font-semibold">Index return variant (context)</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {(
                            [
                              ["pr", "PR"],
                              ["tr", "TR"],
                              ["ntr", "NTR"],
                              ["unknown", "N/A"],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setInput((p) => ({ ...p, indexReturnVariant: v }))}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                                input.indexReturnVariant === v
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-background/50",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="eff-date" className="mb-1.5 block text-sm font-semibold">
                  Effective date <span className="text-destructive">*</span>
                </label>
                <input
                  id="eff-date"
                  type="date"
                  value={input.effectiveDate}
                  onChange={(e) => setInput((p) => ({ ...p, effectiveDate: e.target.value }))}
                  className="w-full max-w-xs rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <div>
                <label htmlFor="ex-date" className="mb-1.5 block text-sm font-semibold">
                  Ex-date <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  id="ex-date"
                  type="date"
                  value={input.exDate}
                  onChange={(e) => setInput((p) => ({ ...p, exDate: e.target.value }))}
                  className="w-full max-w-xs rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="asof-date" className="mb-1.5 block text-sm font-semibold">
                  Projection files as of <span className="text-destructive">*</span>
                </label>
                <input
                  id="asof-date"
                  type="date"
                  value={input.dataAsOf}
                  onChange={(e) => setInput((p) => ({ ...p, dataAsOf: e.target.value }))}
                  className="w-full max-w-xs rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Usually “today” for the file drop you are comparing.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-semibold">Appears missing (no projection line / empty)</p>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_IDS.map((id) => (
                    <Button
                      key={`m-${id}`}
                      type="button"
                      variant={input.missingVendors.includes(id) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setInput((p) => ({
                          ...p,
                          missingVendors: toggleVendor(p.missingVendors, id),
                        }))
                      }
                    >
                      {vendorLabel(id)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Sent projection file as of that date</p>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_IDS.map((id) => (
                    <Button
                      key={`p-${id}`}
                      type="button"
                      variant={input.presentVendors.includes(id) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setInput((p) => ({
                          ...p,
                          presentVendors: toggleVendor(p.presentVendors, id),
                        }))
                      }
                    >
                      {vendorLabel(id)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="sim-notes" className="mb-1.5 block text-sm font-semibold">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="sim-notes"
                  value={input.notes}
                  onChange={(e) => setInput((p) => ({ ...p, notes: e.target.value.slice(0, 500) }))}
                  rows={3}
                  placeholder="Ticker, index name, or other context (shown in summary only)."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">{input.notes.length}/500</p>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-6">
              <p className="rounded-2xl border border-border bg-background/60 p-4 text-sm leading-relaxed">
                {result.summary}
              </p>
              <ul className="space-y-3">
                {result.hypotheses.map((h) => (
                  <li
                    key={h.id}
                    className={cn(
                      "rounded-2xl border p-4",
                      relevanceStyles(h.relevance),
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{h.title}</span>
                      <span className="rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {h.relevance}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed opacity-95">{h.explanation}</p>
                    {h.appliesToVendors.length > 0 && (
                      <p className="mt-2 text-xs opacity-80">
                        Most relevant for missing: {h.appliesToVendors.map(vendorLabel).join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <p className="mb-2 text-sm font-semibold">Next steps</p>
                <div className="flex flex-wrap gap-2">
                  {result.nextStepLinks.map((l) => (
                    <Button key={l.href} variant="secondary" size="sm" nativeButton={false} render={<Link href={l.href} />}>
                      {l.label}
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{result.disclaimer}</p>
              <p className="text-[10px] text-muted-foreground">Simulator rules v{result.rulesVersion}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {stepError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {stepError}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {step > 0 && step < 4 && (
            <Button type="button" variant="outline" size="default" onClick={goBack}>
              <ArrowLeftIcon data-icon="inline-start" className="size-4" />
              Back
            </Button>
          )}
          {step === 4 && (
            <Button type="button" variant="outline" onClick={reset}>
              Start over
            </Button>
          )}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              {step === 3 ? (
                <>
                  Run simulation
                  <SparklesIcon data-icon="inline-end" className="size-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRightIcon data-icon="inline-end" className="size-4" />
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
