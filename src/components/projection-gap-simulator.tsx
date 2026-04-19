"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

import { surfaceOuterClass } from "@/components/surface-section";
import { Button } from "@/components/ui/button";
import { GlossaryTerm } from "@/components/ui/glossary-term";
import { cn } from "@/lib/utils";
import { VENDOR_IDS, vendorLabel, vendorAbbr, type VendorId } from "@/lib/vendors";
import { runSimulator } from "@/lib/simulator/simulator-engine";
import { familiesForClass, humanFamily } from "@/lib/simulator/taxonomy";
import {
  CANONICAL_EVENTS,
  canonicalEventById,
  eventNamesSentence,
  mandatoryEventCount,
  voluntaryEventCount,
  type CanonicalEventId,
  type EventCategory,
} from "@/lib/event-taxonomy";
import type { EventFamily, SimulatorInput, SimulatorResult } from "@/lib/simulator/types";

const STEP_COUNT = 6;

const STEP_LABELS = [
  "Category",
  "Event type",
  "Context",
  "Dates",
  "Vendors",
  "Results",
] as const;

const STEP_LABELS_SHORT = [
  "Category",
  "Type",
  "Context",
  "Dates",
  "Vendors",
  "Results",
] as const;

const CATEGORY_ORDER: EventCategory[] = [
  "Equity Income",
  "Corporate Structure",
  "Equity Offerings",
  "M&A",
];

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultMetrics = (): SimulatorInput["metrics"] => ({
  dividendYieldPct: "",
  freeFloatChangePp: "",
  tenderAcceptancePct: "",
  rightsDiscountPct: "",
});

const defaultInput = (): SimulatorInput => ({
  eventCategory: "mandatory",
  eventFamily: "merger",
  rightsItm: "unknown",
  rightsSubscriptionKnown: true,
  mnaDealType: "stock",
  mnaIndexParties: "both",
  spinoffChildEligible: "unknown",
  spinoffPhase: "unknown",
  indexReturnVariant: "unknown",
  metrics: defaultMetrics(),
  effectiveDate: "",
  exDate: "",
  dataAsOf: todayIso(),
  missingVendors: [],
  presentVendors: [],
  notes: "",
});

function relevanceTone(r: "high" | "medium" | "low"): string {
  if (r === "high") return "bg-primary/12 border-primary/25";
  if (r === "medium") return "bg-amber-500/8 border-amber-500/20";
  return "bg-muted/40 border-border";
}

const SIGNAL_ICON: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "⚪",
};

function toggleVendor(list: VendorId[], id: VendorId): VendorId[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function familyLabel(f: EventFamily): string {
  return humanFamily(f);
}

function coerceFamilyForCategory(
  category: SimulatorInput["eventCategory"],
  current: EventFamily,
): EventFamily {
  const allowed = familiesForClass(category);
  if (allowed.includes(current)) return current;
  return allowed[0] ?? current;
}

const FAMILIES_NEEDING_CONTEXT: Set<CanonicalEventId> = new Set([
  "rights-issue",
  "merger",
  "tender-offer",
  "spin-off",
  "cash-dividend",
  "special-dividend",
  "secondary-offering",
  "private-placement",
]);

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  /** Tooltip — why it matters and how it shifts the verdict. */
  hint?: string;
};

function ChoiceGroup<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
  variant = "pill",
}: {
  legend: string;
  hint?: string;
  options: ReadonlyArray<ChoiceOption<T>>;
  value: T;
  onChange: (v: T) => void;
  variant?: "pill" | "tile";
}) {
  if (variant === "tile") {
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          {hint ? (
            <GlossaryTerm term={legend} definition={hint}>
              {legend}
            </GlossaryTerm>
          ) : (
            legend
          )}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={value === o.value}
              title={o.hint}
              className={cn(
                "min-w-0 rounded-2xl border px-3 py-2.5 text-left text-sm transition-all",
                value === o.value
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <span className="block text-sm font-semibold">{o.label}</span>
              {o.hint && (
                <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                  {o.hint}
                </span>
              )}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">
        {hint ? (
          <GlossaryTerm term={legend} definition={hint}>
            {legend}
          </GlossaryTerm>
        ) : (
          legend
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.hint}
            aria-pressed={value === o.value}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-all",
              value === o.value
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MetricField({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex min-h-[2.75rem] items-start text-xs font-medium leading-snug text-muted-foreground">
        <GlossaryTerm term={label} definition={hint}>
          {label}
        </GlossaryTerm>
      </span>
      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-0 transition-shadow focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_oklch(0.72_0.19_250/0.25)]"
      />
    </label>
  );
}

export function ProjectionGapSimulator() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<SimulatorInput>(defaultInput);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const allowedFamilies = useMemo(
    () => familiesForClass(input.eventCategory),
    [input.eventCategory],
  );

  const groupedFamilies = useMemo(() => {
    const set = new Set(allowedFamilies);
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      events: CANONICAL_EVENTS.filter((e) => e.category === cat && set.has(e.id)),
    })).filter((g) => g.events.length > 0);
  }, [allowedFamilies]);

  const canShowSubdetails = useMemo(
    () => FAMILIES_NEEDING_CONTEXT.has(input.eventFamily as CanonicalEventId),
    [input.eventFamily],
  );

  const isDividendLike =
    input.eventFamily === "cash-dividend" || input.eventFamily === "special-dividend";

  function validateStep(s: number): string | null {
    if (s === 3) {
      if (!input.effectiveDate) return "Add an effective date to continue.";
      if (!input.dataAsOf) return "Add the projection “as of” date.";
    }
    if (s === 4) {
      if (input.missingVendors.length === 0 || input.presentVendors.length === 0) {
        return "Pick at least one vendor that looks missing and one that already sent a file.";
      }
    }
    return null;
  }

  function goToStep(target: number) {
    const clamped = Math.max(0, Math.min(target, STEP_COUNT - 1));
    if (clamped < STEP_COUNT - 1) setResult(null);
    setStepError(null);
    if (clamped < step) {
      setStep(clamped);
      return;
    }
    for (let s = step; s < clamped; s++) {
      const err = validateStep(s);
      if (err) {
        setStepError(err);
        setStep(s);
        return;
      }
    }
    setStep(clamped);
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step === STEP_COUNT - 2) {
      setResult(runSimulator(input));
      setStep(STEP_COUNT - 1);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  }

  function goBack() {
    setStepError(null);
    if (step === STEP_COUNT - 1) setResult(null);
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
      className={cn(
        "relative w-full max-w-full min-w-0 overflow-hidden p-5 shadow-2xl shadow-black/25 sm:p-8 md:p-10",
        surfaceOuterClass,
      )}
      aria-labelledby="simulator-heading"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -left-16 size-64 rounded-full bg-foreground/5 blur-3xl" aria-hidden />

      <div className="relative flex min-w-0 flex-col gap-8 xl:flex-row xl:gap-8">
        <nav
          className="w-full shrink-0 xl:w-40 xl:max-w-[11rem] xl:shrink-0"
          aria-label="Simulator steps"
        >
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground xl:sr-only">
            Guide
          </span>
          <h2
            id="simulator-heading"
            className="mb-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl xl:mb-3 xl:text-base"
          >
            Steps
            <span className="sr-only"> — projection gap simulator</span>
          </h2>
          <ol className="flex flex-row gap-1 overflow-x-auto pb-1 xl:flex-col xl:gap-0.5 xl:overflow-visible xl:pb-0">
            {STEP_LABELS.map((label, i) => {
              const done = i < step || (i === STEP_COUNT - 1 && result !== null);
              const active = i === step;
              const short = STEP_LABELS_SHORT[i];
              return (
                <li key={label} className="min-w-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    title={label}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors xl:gap-2 xl:px-2 xl:py-2",
                      active
                        ? "bg-foreground/[0.06] text-foreground"
                        : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-primary/20 text-primary"
                            : "border border-border bg-background/80 text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {done && !active ? <CheckIcon className="size-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className="block text-sm font-medium leading-snug xl:hidden">{label}</span>
                      <span className="hidden text-xs font-medium leading-snug xl:block">{short}</span>
                      {i === 1 && (
                        <span className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground xl:block">
                          {input.eventCategory === "mandatory" ? "Mandatory" : "Voluntary"}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 w-full max-w-full flex-1 basis-0">
          <div className="mb-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              A calm walkthrough — tell us what you are seeing. The verdict and per-vendor reasoning are derived from the documented rules in the Vendor Reference.
            </p>
          </div>

          <div className="max-h-[min(70vh,640px)] min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pr-1 [-webkit-overflow-scrolling:touch]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="pb-4"
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <p className="text-base font-medium text-foreground">
                      What kind of situation is this?
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Same taxonomy as the Vendor Reference: {mandatoryEventCount()} mandatory and {voluntaryEventCount()} voluntary event types (13 in total). The next step lists the canonical types within the category you pick.
                    </p>
                    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setInput((p) => {
                            const eventCategory = "mandatory";
                            return {
                              ...p,
                              eventCategory,
                              eventFamily: coerceFamilyForCategory(eventCategory, p.eventFamily),
                            };
                          })
                        }
                        className={cn(
                          "min-w-0 rounded-3xl border px-5 py-6 text-left transition-all duration-200",
                          input.eventCategory === "mandatory"
                            ? "border-primary/40 bg-primary/10 shadow-md ring-1 ring-primary/20"
                            : "border-border/80 bg-background/40 hover:border-primary/25 hover:bg-background/60",
                        )}
                      >
                        <span className="text-base font-semibold text-foreground">
                          Mandatory · {mandatoryEventCount()} types
                        </span>
                        <span className="mt-2 block text-pretty text-sm leading-relaxed text-muted-foreground">
                          {eventNamesSentence("mandatory")} — confirmed corporate actions without shareholder opt-in.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInput((p) => {
                            const eventCategory = "voluntary";
                            return {
                              ...p,
                              eventCategory,
                              eventFamily: coerceFamilyForCategory(eventCategory, p.eventFamily),
                            };
                          })
                        }
                        className={cn(
                          "min-w-0 rounded-3xl border px-5 py-6 text-left transition-all duration-200",
                          input.eventCategory === "voluntary"
                            ? "border-primary/40 bg-primary/10 shadow-md ring-1 ring-primary/20"
                            : "border-border/80 bg-background/40 hover:border-primary/25 hover:bg-background/60",
                        )}
                      >
                        <span className="text-base font-semibold text-foreground">
                          Voluntary · {voluntaryEventCount()} types
                        </span>
                        <span className="mt-2 block text-pretty text-sm leading-relaxed text-muted-foreground">
                          {eventNamesSentence("voluntary")} — treatment depends on participation, thresholds, or classification rules.
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-base font-medium text-foreground">
                      Which event is it?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Showing the {allowedFamilies.length} canonical{" "}
                      <span className="font-medium text-foreground">
                        {input.eventCategory === "mandatory" ? "mandatory" : "voluntary"}
                      </span>{" "}
                      types from the Vendor Reference (ISO 20022 CAEV).
                    </p>
                    <div className="space-y-5">
                      {groupedFamilies.map((group) => (
                        <fieldset key={group.category} className="space-y-2">
                          <legend className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.category}
                          </legend>
                          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                            {group.events.map((evt) => (
                              <button
                                key={evt.id}
                                type="button"
                                onClick={() =>
                                  setInput((p) => ({ ...p, eventFamily: evt.id as EventFamily }))
                                }
                                className={cn(
                                  "min-w-0 max-w-full break-words rounded-2xl border px-4 py-3.5 text-left text-sm font-medium leading-snug transition-all",
                                  input.eventFamily === evt.id
                                    ? "border-primary/45 bg-primary/12 text-foreground"
                                    : "border-border/70 bg-background/35 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                                )}
                              >
                                {familyLabel(evt.id as EventFamily)}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8">
                    <div>
                      <p className="text-base font-medium text-foreground">Event context</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Optional detail tightens the per-vendor verdict. Skip anything you do not know yet.
                      </p>
                    </div>

                    {!canShowSubdetails ? (
                      <p className="rounded-2xl border border-dashed border-border/80 bg-background/30 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                        No extra prompts for {humanFamily(input.eventFamily).toLowerCase()}. Optional numbers below still apply if relevant (for example free-float change around a tender).
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {input.eventFamily === "rights-issue" && (
                          <div className="space-y-4">
                            <ChoiceGroup
                              legend="Rights moneyness"
                              hint="In the money (ITM) means exercising is profitable — high participation is likely, so share count rises. Out of the money (OTM) rights are usually left to lapse — less impact. Vendors vary on how they project this before subscription data is known."
                              value={input.rightsItm}
                              onChange={(v) => setInput((p) => ({ ...p, rightsItm: v }))}
                              options={[
                                { value: "itm", label: "In the money", hint: "Exercise likely → share count ↑. Vendors with smaller thresholds react first." },
                                { value: "otm", label: "Out of the money", hint: "Rights usually lapse → minimal share change. Only vendors using theoretical PAF may still adjust." },
                                { value: "unknown", label: "Not sure yet", hint: "Simulator won't guess — verdict will note the uncertainty." },
                              ]}
                            />
                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/30 px-4 py-3 text-sm">
                              <input
                                type="checkbox"
                                checked={input.rightsSubscriptionKnown}
                                onChange={(e) =>
                                  setInput((p) => ({ ...p, rightsSubscriptionKnown: e.target.checked }))
                                }
                                className="mt-0.5 size-4 rounded border-border"
                              />
                              <span className="leading-snug">
                                <GlossaryTerm
                                  term="Final terms known"
                                  definition="Until final subscription price and ratio are announced, FTSE and STOXX often wait and MSCI may use theoretical price. Knowing the final terms lets all vendors project the same adjustment."
                                >
                                  Final subscription price and ratio are known.
                                </GlossaryTerm>
                              </span>
                            </label>
                          </div>
                        )}

                        {(input.eventFamily === "merger" || input.eventFamily === "tender-offer") && (
                          <div className="space-y-5">
                            {input.eventFamily === "merger" && (
                              <ChoiceGroup
                                legend="Deal consideration"
                                hint="Cash deals trigger deletion and divisor changes; stock deals also change the acquirer's share count, which each vendor quantifies differently. Mixed deals behave somewhere in between."
                                value={input.mnaDealType}
                                onChange={(v) => setInput((p) => ({ ...p, mnaDealType: v }))}
                                options={[
                                  { value: "stock", label: "Mostly stock", hint: "Acquirer issues new shares → free float and share count change. Larger divergence across vendors." },
                                  { value: "cash", label: "Mostly cash", hint: "Target deleted, acquirer unchanged in count. Divergence is mostly about deletion timing." },
                                  { value: "mixed", label: "Mixed or unclear", hint: "Combination of above — expect both deletion and share-count effects." },
                                ]}
                              />
                            )}
                            <ChoiceGroup
                              legend="Index membership"
                              hint="Who is in your managed index decides everything. Only the target, only the acquirer, or both — each path triggers different vendor rules (deletion triggers for the target, share-count adjustments for the acquirer)."
                              value={input.mnaIndexParties}
                              onChange={(v) => setInput((p) => ({ ...p, mnaIndexParties: v }))}
                              options={[
                                { value: "target_only", label: "Target only", hint: "Expect deletion event — vendor-specific acceptance/float thresholds drive the date." },
                                { value: "acquirer_only", label: "Acquirer only", hint: "Expect share-count / free-float change on the acquirer — thresholds differ per vendor." },
                                { value: "both", label: "Both in the same index", hint: "Most complex — deletion of target and adjustment of acquirer can happen on different dates per vendor." },
                              ]}
                            />
                          </div>
                        )}

                        {input.eventFamily === "spin-off" && (
                          <div className="space-y-5">
                            <ChoiceGroup
                              legend="Spin-off child eligibility"
                              hint="Is the distributed child allowed in the index at all? If not eligible, no vendor adds it — divergence ends. If eligible, each vendor uses a different placeholder convention before real trading."
                              value={input.spinoffChildEligible}
                              onChange={(v) => setInput((p) => ({ ...p, spinoffChildEligible: v }))}
                              options={[
                                { value: "yes", label: "Eligible", hint: "Each vendor uses its own placeholder price — divergence in projections is common." },
                                { value: "no", label: "Not eligible", hint: "No vendor adds it. Parent adjusts only." },
                                { value: "unknown", label: "Unknown", hint: "Simulator flags eligibility as the key question to answer first." },
                              ]}
                            />
                            {input.spinoffChildEligible !== "no" && (
                              <ChoiceGroup
                                legend="Trading phase"
                                hint="Before regular trading starts, vendors diverge the most: some use theoretical price, some when-issued price, some a zero placeholder, some wait. Once live trades print, most converge."
                                value={input.spinoffPhase}
                                onChange={(v) => setInput((p) => ({ ...p, spinoffPhase: v }))}
                                options={[
                                  { value: "placeholder", label: "Placeholder / when-issued", hint: "Expect price divergence — S&P, MSCI, FTSE, STOXX, Solactive each use different placeholders." },
                                  { value: "live_trade", label: "Regular market trading", hint: "Real last-trade price — divergence narrows significantly." },
                                  { value: "unknown", label: "Unknown", hint: "Verdict highlights timing phase as the likely cause." },
                                ]}
                              />
                            )}
                          </div>
                        )}

                        {isDividendLike && (
                          <ChoiceGroup
                            variant="tile"
                            legend="Index Variant (PR / TR / NTR)"
                            hint="Return variants decide how vendors treat dividends. PR ignores dividends (price-only) so special cash dividends above threshold still adjust price. TR reinvests the gross dividend — no price adjustment unless it's classified as special. NTR reinvests the net-of-withholding-tax dividend — same rule as TR but each vendor uses its own tax table. Pick the variant you are comparing across vendors."
                            value={input.indexReturnVariant}
                            onChange={(v) => setInput((p) => ({ ...p, indexReturnVariant: v }))}
                            options={[
                              {
                                value: "pr",
                                label: "PR",
                                hint: "Price Return — dividends not reinvested. Only specials above vendor threshold cause a price adjustment. Biggest driver of divergence: what each vendor labels 'special'.",
                              },
                              {
                                value: "tr",
                                label: "TR",
                                hint: "Gross Total Return — all dividends reinvested at gross. No price adjustment for ordinary cash; specials may still adjust. Divergence comes from the ordinary-vs-special classification.",
                              },
                              {
                                value: "ntr",
                                label: "NTR",
                                hint: "Net Total Return — dividends reinvested after withholding tax. Each vendor uses its own tax-rate table per country, so the reinvested amount differs even when the cash dividend is identical.",
                              },
                              {
                                value: "unknown",
                                label: "Not applicable",
                                hint: "Simulator won't use variant-specific logic.",
                              },
                            ]}
                          />
                        )}
                      </div>
                    )}

                    <div className="rounded-3xl border border-border/60 bg-background/25 p-5 sm:p-6">
                      <p className="text-sm font-medium text-foreground">Optional numbers</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Rough percentages are fine. Leave blank if unknown — the simulator will say it cannot make the call rather than guess. Hover a label for how each metric is used.
                      </p>
                      <div className="mt-5 grid min-w-0 grid-cols-1 items-start gap-x-5 gap-y-5 md:grid-cols-2">
                        <MetricField
                          label="Dividend yield (% of price)"
                          hint="The cash dividend divided by the latest price. Used to flag 'special' dividends — when yield exceeds each vendor's threshold (e.g. S&P > 5% of price for some indices), the dividend triggers a PR adjustment instead of being treated as ordinary."
                          placeholder="e.g. 5"
                          value={input.metrics.dividendYieldPct}
                          onChange={(v) =>
                            setInput((p) => ({
                              ...p,
                              metrics: { ...p.metrics, dividendYieldPct: v },
                            }))
                          }
                        />
                        <MetricField
                          label="Free-float change (pp) / share-count change (%)"
                          hint="Change in free-float points or share count after the event. Vendors use different materiality thresholds (e.g. 5 pp, 5 %, 10 %), so the same change can trigger adjustments at some vendors and be deferred to the next review at others."
                          placeholder="e.g. 6 or -3"
                          value={input.metrics.freeFloatChangePp}
                          onChange={(v) =>
                            setInput((p) => ({
                              ...p,
                              metrics: { ...p.metrics, freeFloatChangePp: v },
                            }))
                          }
                        />
                        <MetricField
                          label="Tender acceptance (%)"
                          hint="Share of the target accepted in a tender or M&A. Vendors use different deletion triggers — e.g. S&P may delete at 90 % or earlier if free float drops below 15 %; STOXX needs both ≥ 85 % accepted and free float < 10 %."
                          placeholder="e.g. 72"
                          value={input.metrics.tenderAcceptancePct}
                          onChange={(v) =>
                            setInput((p) => ({
                              ...p,
                              metrics: { ...p.metrics, tenderAcceptancePct: v },
                            }))
                          }
                        />
                        <MetricField
                          label="Rights discount vs theoretical (%)"
                          hint="How far the rights subscription price sits below the theoretical ex-rights price. A deeper discount means the rights are more in-the-money, higher participation is expected, and the adjustment factor each vendor applies diverges more."
                          placeholder="e.g. 15"
                          value={input.metrics.rightsDiscountPct}
                          onChange={(v) =>
                            setInput((p) => ({
                              ...p,
                              metrics: { ...p.metrics, rightsDiscountPct: v },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="max-w-lg space-y-5">
                    <p className="text-base font-medium text-foreground">Dates</p>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">Effective date</span>
                      <input
                        type="date"
                        value={input.effectiveDate}
                        onChange={(e) => setInput((p) => ({ ...p, effectiveDate: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_oklch(0.72_0.19_250/0.25)]"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Ex-date <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <input
                        type="date"
                        value={input.exDate}
                        onChange={(e) => setInput((p) => ({ ...p, exDate: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_oklch(0.72_0.19_250/0.25)]"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">Projection files as of</span>
                      <input
                        type="date"
                        value={input.dataAsOf}
                        onChange={(e) => setInput((p) => ({ ...p, dataAsOf: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_oklch(0.72_0.19_250/0.25)]"
                      />
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        Usually the date of the file drop you are comparing.
                      </span>
                    </label>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <p className="text-base font-medium text-foreground">Vendors</p>
                    <div className="grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-2">
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/30 p-4 sm:p-5">
                        <p
                          className="mb-3 text-sm font-medium leading-tight text-foreground"
                          title="Vendors missing from your projection feed or showing an empty line"
                        >
                          Missing in feed
                        </p>
                        <div className="flex min-w-0 flex-wrap gap-2">
                          {VENDOR_IDS.map((id) => (
                            <button
                              key={`m-${id}`}
                              type="button"
                              onClick={() =>
                                setInput((p) => ({
                                  ...p,
                                  missingVendors: toggleVendor(p.missingVendors, id),
                                }))
                              }
                              className={cn(
                                "inline-flex min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-left text-xs font-medium transition-all sm:text-sm",
                                input.missingVendors.includes(id)
                                  ? "border-primary/50 bg-primary/20 text-foreground"
                                  : "border-border/80 bg-background/60 text-muted-foreground hover:border-primary/30",
                              )}
                            >
                              {vendorLabel(id)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-background/30 p-4 sm:p-5">
                        <p
                          className="mb-3 text-sm font-medium leading-tight text-foreground"
                          title="Vendors that already published this event in the projection file"
                        >
                          In the file
                        </p>
                        <div className="flex min-w-0 flex-wrap gap-2">
                          {VENDOR_IDS.map((id) => (
                            <button
                              key={`p-${id}`}
                              type="button"
                              onClick={() =>
                                setInput((p) => ({
                                  ...p,
                                  presentVendors: toggleVendor(p.presentVendors, id),
                                }))
                              }
                              className={cn(
                                "inline-flex min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-left text-xs font-medium transition-all sm:text-sm",
                                input.presentVendors.includes(id)
                                  ? "border-primary/50 bg-primary/20 text-foreground"
                                  : "border-border/80 bg-background/60 text-muted-foreground hover:border-primary/30",
                              )}
                            >
                              {vendorLabel(id)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-foreground">
                        Short notes <span className="font-normal text-muted-foreground">(optional)</span>
                      </span>
                      <textarea
                        value={input.notes}
                        onChange={(e) => setInput((p) => ({ ...p, notes: e.target.value.slice(0, 500) }))}
                        rows={3}
                        placeholder="Ticker, index, or anything else you want echoed in the summary."
                        className="w-full resize-y rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_oklch(0.72_0.19_250/0.25)]"
                      />
                      <span className="text-xs text-muted-foreground">{input.notes.length} / 500</span>
                    </label>
                  </div>
                )}

                {step === 5 && result && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-border/60 bg-background/40 px-4 py-4">
                      <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span>{result.hypotheses.filter((h) => h.relevance === "high").length > 0 && `🔴 ×${result.hypotheses.filter((h) => h.relevance === "high").length}`}</span>
                        <span>{result.hypotheses.filter((h) => h.relevance === "medium").length > 0 && `🟡 ×${result.hypotheses.filter((h) => h.relevance === "medium").length}`}</span>
                        <span>{result.hypotheses.filter((h) => h.relevance === "low").length > 0 && `⚪ ×${result.hypotheses.filter((h) => h.relevance === "low").length}`}</span>
                      </div>
                      <p className="font-mono text-[13px] leading-relaxed text-foreground">
                        {result.summary}
                      </p>
                    </div>

                    {result.verdict && (
                      <div className="rounded-2xl border border-primary/35 bg-primary/10 px-4 py-4 sm:px-5 sm:py-5">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                          Verdict
                        </p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {result.verdict}
                        </p>
                        {(() => {
                          const meta = canonicalEventById(input.eventFamily);
                          if (!meta) return null;
                          return (
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                              {meta.badge} · {meta.category} · {meta.name}
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    <ul className="space-y-3">
                      {result.hypotheses.map((h) => (
                        <li
                          key={h.id}
                          className={cn(
                            "rounded-2xl border p-4 sm:p-5",
                            relevanceTone(h.relevance),
                          )}
                        >
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-bold tracking-wide uppercase text-foreground">
                              {SIGNAL_ICON[h.relevance]} {h.title}
                            </span>
                          </div>
                          <p className="text-sm font-mono leading-relaxed text-muted-foreground">{h.explanation}</p>
                          {h.appliesToVendors.length > 0 && (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              <span className="uppercase tracking-wide">Vendors: </span>
                              <span className="font-semibold text-foreground">
                                {h.appliesToVendors.map(vendorAbbr).join(", ")}
                              </span>
                              {h.citation && (
                                <>
                                  <span className="mx-2 text-border">·</span>
                                  <span className="uppercase tracking-wide">Source: </span>
                                  <span className="text-foreground">{h.citation}</span>
                                </>
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Dig deeper</p>
                      <div className="flex flex-wrap gap-2">
                        {result.nextStepLinks.map((l) => (
                          <Button
                            key={l.href}
                            variant="secondary"
                            size="sm"
                            nativeButton={false}
                            render={<Link href={l.href} />}
                          >
                            {l.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{result.disclaimer}</p>
                    <p className="text-[11px] text-muted-foreground">Rules version {result.rulesVersion}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {stepError && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {stepError}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" size="default" onClick={goBack}>
                  <ArrowLeftIcon data-icon="inline-start" className="size-4" />
                  Back
                </Button>
              )}
              {step === STEP_COUNT - 1 && (
                <Button type="button" variant="ghost" onClick={reset}>
                  Start over
                </Button>
              )}
            </div>
            <div className="flex gap-2 sm:ml-auto">
              {step < STEP_COUNT - 1 ? (
                <Button type="button" onClick={goNext}>
                  {step === STEP_COUNT - 2 ? (
                    "See possible reasons"
                  ) : (
                    <>
                      Continue
                      <ArrowRightIcon data-icon="inline-end" className="size-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => goToStep(STEP_COUNT - 2)}>
                  Edit answers
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
