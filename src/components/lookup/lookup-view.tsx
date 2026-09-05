"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  HelpCircleIcon,
  NewspaperIcon,
} from "lucide-react";

import { CoverageMatrix } from "@/components/lookup/coverage-matrix";
import {
  getVendorConfirmation,
  setVendorConfirmation,
  type VendorMarkState,
} from "@/lib/vendor-confirmation";
import { SurfaceSection } from "@/components/surface-section";
import { computeDivergence, type DivergenceResult } from "@/lib/divergence";
import { canonicalEventById } from "@/lib/event-taxonomy";
import {
  computeLookupVerdict,
  caevForEventType,
  daysOut,
  getScopeVendors,
  lookupDimensions,
  deriveVendorGroups,
  resolveCompanyName,
  setScopeVendors,
  verdictSummary,
  type LookupFilters,
  type LookupVerdict,
} from "@/lib/lookup-verdict";
import type { NewsValidationResult } from "@/lib/news-validation";
import { VENDOR_IDS, VENDOR_LABELS, type VendorId } from "@/lib/vendors";
import { franklinSnapshot, resolveFundRules, type FundResolution } from "@/lib/fund-master";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseExDate(s: string): Date | null {
  if (!DATE_RE.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

const daysOutLabel = (d: number): string => {
  if (d === 0) return "ex-date today";
  if (d === 1) return "in 1 day";
  if (d > 1) return `in ${d} days`;
  return `${-d} day${d === -1 ? "" : "s"} ago`;
};

// ─── News panel ─────────────────────────────────────────────────────────────

type NewsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: NewsValidationResult };

const NEWS_VERDICT_META: Record<
  NewsValidationResult["verdict"],
  { label: string; chip: string; icon: typeof CheckCircle2Icon }
> = {
  confirmed: {
    label: "Confirmed",
    chip: "border-chart-3/40 bg-chart-3/10 text-chart-3",
    icon: CheckCircle2Icon,
  },
  contradicted: {
    label: "Contradicted",
    chip: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: AlertTriangleIcon,
  },
  unverified: {
    label: "Unverified",
    chip: "border-chart-4/40 bg-chart-4/10 text-chart-4",
    icon: HelpCircleIcon,
  },
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function NewsPanel({
  ticker,
  eventType,
  exDate,
  company,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  company: string | null;
}) {
  const [news, setNews] = useState<NewsState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      ticker,
      eventType,
      exDate,
    });
    if (company) params.set("companyName", company);

    void (async () => {
      try {
        const res = await fetch(`/api/news?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as NewsValidationResult;
        setNews({ status: "done", result: body });
      } catch (err) {
        if (controller.signal.aborted) return;
        setNews({
          status: "error",
          message:
            err instanceof Error ? err.message : "The news request failed.",
        });
      }
    })();

    return () => controller.abort();
  }, [ticker, eventType, exDate, company]);

  return (
    <SurfaceSection className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          News cross-validation
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <NewspaperIcon className="h-3.5 w-3.5" aria-hidden />
          §8 — dated, cited sources only
        </span>
      </div>

      {news.status === "loading" && (
        <div aria-hidden className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 motion-safe:animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      )}

      {news.status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          News validation could not run: {news.message}
        </div>
      )}

      {news.status === "done" && (
        <div className="space-y-4">
          {!news.result.validationRan && (
            <div className="rounded-xl border border-chart-4/40 bg-chart-4/10 px-4 py-3 text-sm text-chart-4">
              {news.result.warning ?? news.result.reasoning}
            </div>
          )}

          {news.result.validationRan && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const meta = NEWS_VERDICT_META[news.result.verdict];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${meta.chip}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {meta.label}
                    </span>
                  );
                })()}
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  confidence: {news.result.confidence}
                </span>
              </div>

              <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
                {news.result.reasoning}
              </p>

              {news.result.sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dated source inside the search window matched this event.
                </p>
              ) : (
                <ul className="space-y-2">
                  {news.result.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-border bg-card/60 p-3 text-sm outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block font-medium text-foreground">
                          {s.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {domainOf(s.url)} · {s.publishedAt}
                        </span>
                        {s.snippet && (
                          <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
                            {s.snippet}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </SurfaceSection>
  );
}

// ─── Vendor scope control ───────────────────────────────────────────────────

function VendorScopeControl({
  scope,
  onChange,
}: {
  scope: VendorId[];
  onChange: (next: VendorId[]) => void;
}) {
  const allSelected = scope.length === VENDOR_IDS.length;
  const toggle = (vendor: VendorId) => {
    onChange(
      scope.includes(vendor)
        ? scope.filter((v) => v !== vendor)
        : [...scope, vendor],
    );
  };

  return (
    <SurfaceSection className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="vendor-scope-heading" className="text-lg font-semibold tracking-tight">
            Vendor scope
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Verdict, divergence, and the coverage matrix below only consider
            the vendors selected here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...VENDOR_IDS])}
          disabled={allSelected}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restore all vendors
        </button>
      </div>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Select vendors in scope</legend>
        {VENDOR_IDS.map((vendor) => {
          const checked = scope.includes(vendor);
          return (
            <label
              key={vendor}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-within:ring-2 focus-within:ring-ring ${
                checked
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(vendor)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {VENDOR_LABELS[vendor]}
            </label>
          );
        })}
      </fieldset>
      {scope.length === 0 && (
        <p role="status" className="text-sm text-destructive">
          No vendors selected — nothing will be assessed until you select at
          least one vendor above, or restore all vendors.
        </p>
      )}
    </SurfaceSection>
  );
}

// ─── Divergence summary ────────────────────────────────────────────────────

function vendorList(vendors: readonly VendorId[]): string {
  return vendors.map((vendor) => VENDOR_LABELS[vendor]).join(", ");
}

function DivergencePanel({
  result,
  lateAbsentVendors,
}: {
  result: DivergenceResult;
  lateAbsentVendors: VendorId[];
}) {
  const speakers = result.agree.length + result.disagree.length;
  const silent = result.silent.length;
  const notCovered = result.notCovered.length;

  let summary: string;
  if (speakers === 0) {
    summary = "No comparable vendor states a treatment for this event.";
  } else if (result.divergenceField === null) {
    summary = `No treatment disagreement — all ${speakers} comparable vendor${speakers === 1 ? "" : "s"} that state a treatment agree.`;
  } else {
    const field =
      result.divergenceField === "lead-time"
        ? "lead time"
        : result.divergenceField;
    summary = `Disagreement on ${field}: ${result.groups
      .map((group) => `${vendorList(group.vendors)} (${group.value})`)
      .join("; ")}.`;
  }

  return (
    <SurfaceSection className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Where vendors diverge
        </h2>
      </div>
      <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
        {summary}
      </p>
      {lateAbsentVendors.length > 0 && (
        <p className="max-w-prose text-sm leading-relaxed text-destructive">
          Operational gap: {vendorList(lateAbsentVendors)}{" "}
          {lateAbsentVendors.length === 1 ? "is" : "are"}{" "}
          past {lateAbsentVendors.length === 1 ? "its" : "their"} publication
          window with nothing found.
        </p>
      )}
      {(silent > 0 || notCovered > 0) && (
        <p className="text-xs text-muted-foreground">
          {silent > 0 ? `${vendorList(result.silent)} do not state a treatment.` : ""}
          {notCovered > 0 ? ` ${vendorList(result.notCovered)} have no extracted methodology rule.` : ""}
        </p>
      )}
    </SurfaceSection>
  );
}

// ─── Verdict panel ──────────────────────────────────────────────────────────

const TOTAL_CHIPS: Array<{
  key: "covered" | "missing" | "notYetDue" | "unchecked";
  label: string;
  cls: string;
}> = [
  {
    key: "covered",
    label: "covered",
    cls: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  },
  {
    key: "missing",
    label: "missing",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  {
    key: "notYetDue",
    label: "not-yet-due",
    cls: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  },
  {
    key: "unchecked",
    label: "not checked",
    cls: "border-border bg-muted/30 text-muted-foreground",
  },
];

function VerdictPanel({
  verdict,
  timingNoticeDismissed,
  onDismissTimingNotice,
}: {
  verdict: LookupVerdict;
  timingNoticeDismissed: boolean;
  onDismissTimingNotice: () => void;
}) {
  const { totals } = verdict;

  return (
    <SurfaceSection className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Verdict</h2>
      </div>

      {!timingNoticeDismissed && totals.notAssessed > 0 && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-chart-2/50 bg-chart-2/10 px-4 py-3 text-sm text-foreground">
          <p className="max-w-prose leading-relaxed">
            {totals.notAssessed} publication horizon
            {totals.notAssessed === 1 ? " is" : "s are"} not configured yet, so
            timing is unassessed for those vendors. Set them in{" "}
            <Link
              href="/settings/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Coverage settings
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={onDismissTimingNotice}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Dismiss
          </button>
        </div>
      )}

      <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
        {verdictSummary(totals)}
      </p>

      <div className="flex flex-wrap gap-2">
        {totals.dataStatesTreatment > 0 && (
          <span className="inline-flex items-center rounded-full border border-chart-3/40 bg-chart-3/10 px-2.5 py-0.5 text-xs font-medium text-chart-3">
            {totals.dataStatesTreatment} states a treatment
          </span>
        )}
        {totals.dataSilent > 0 && (
          <span className="inline-flex items-center rounded-full border border-chart-4/40 bg-chart-4/10 px-2.5 py-0.5 text-xs font-medium text-chart-4">
            {totals.dataSilent} silent
          </span>
        )}
        {totals.dataNotCovered > 0 && (
          <span className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {totals.dataNotCovered} not covered
          </span>
        )}
        {TOTAL_CHIPS.filter((c) => totals[c.key] > 0).map((c) => (
          <span
            key={c.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.cls}`}
          >
            {totals[c.key]} {c.label}
          </span>
        ))}
        {totals.notApplicable > 0 && (
          <span className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {totals.notApplicable} not applicable — excluded
          </span>
        )}
      </div>
    </SurfaceSection>
  );
}

const QUALIFIER_KEY = "ca-hub.lookup-qualifiers.v1";

function qualifierLabel(key: string): string {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function QualifierControls({
  ticker,
  eventType,
  exDate,
  filters,
  onChange,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  filters: LookupFilters;
  onChange: (filters: LookupFilters) => void;
}) {
  const dimensions = useMemo(() => lookupDimensions(eventType), [eventType]);
  const hasVariants = dimensions.indexTypes.length > 0;
  const conditionKeys = Object.keys(dimensions.conditions);
  if (!hasVariants && conditionKeys.length === 0) return null;
  const save = (next: LookupFilters) => {
    onChange(next);
    try {
      localStorage.setItem(`${QUALIFIER_KEY}:${ticker}:${eventType}:${exDate}`, JSON.stringify(next));
    } catch { /* A blocked local store must not break lookup. */ }
  };
  return (
    <SurfaceSection className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Narrow this lookup</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional answers filter the matrix. Unanswered controls show every branch.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        {hasVariants && (
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Return variant</span>
            <select
              value={filters.indexType ?? ""}
              onChange={(event) => save({ ...filters, indexType: event.target.value || undefined })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All variants</option>
              {dimensions.indexTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
        {conditionKeys.map((key) => (
          <label key={key} className="grid gap-1.5 text-sm">
            <span className="font-medium">
              {key === "rights_moneyness" ? "Do you know if this rights issue is in-the-money?" : qualifierLabel(key)}
            </span>
            <select
              value={filters.conditions?.[key] ?? ""}
              onChange={(event) => save({ ...filters, conditions: { ...filters.conditions, [key]: event.target.value || undefined } })}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">I don&apos;t know</option>
              {dimensions.conditions[key]!.map((value) => (
                <option key={value} value={value}>
                  {key === "rights_moneyness" ? `Yes, ${value}` : value}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </SurfaceSection>
  );
}

function FundContextControl({ selectedTicker, onChange, resolution }: { selectedTicker: string; onChange: (ticker: string) => void; resolution: FundResolution }) {
  return (
    <SurfaceSection className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Optional fund context</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select a reviewed Franklin ETF to resolve its index construction. Leave unset for the unchanged P0 lookup.</p>
      </div>
      <label className="grid max-w-sm gap-1.5 text-sm">
        <span className="font-medium">Franklin ETF</span>
        <select value={selectedTicker} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <option value="">No fund selected</option>
          {franklinSnapshot.records.map((fund) => <option key={fund.ticker} value={fund.ticker}>{fund.ticker} — {fund.name}</option>)}
        </select>
      </label>
      {resolution.mode === "fund-resolved" && <div className="rounded-xl border border-chart-3/40 bg-chart-3/10 px-4 py-3 text-sm"><p className="font-medium">{resolution.fund.ticker} → {resolution.fund.underlying_index} → {resolution.fund.index_provider}</p><p className="mt-1 text-muted-foreground">Index type: {resolution.indexType}. The selected event uses the reviewed 3-D rule when one exists.</p><p className="mt-1 text-xs text-muted-foreground">Sources: {resolution.fund.source_urls.join(" · ")}</p></div>}
      {resolution.mode === "fund-unresolved" && <p role="status" className="rounded-xl border border-chart-4/40 bg-chart-4/10 px-4 py-3 text-sm text-chart-4">{resolution.warnings[0]}</p>}
    </SurfaceSection>
  );
}

// ─── Page body (client half of /lookup/[ticker]) ────────────────────────────

export function LookupView({
  ticker,
  eventType,
  exDate,
  company: companyParam,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  company: string | null;
}) {
  const reduceMotion = useReducedMotion();
  // Hydration guard: observations, qualifiers, and horizons live in localStorage, so the
  // client's first render must not disagree with server HTML. The state flip
  // IS the point of this effect; react-hooks/set-state-in-effect has no
  // alternative here (known limitation, see MEMORY.md lessons on the React 19
  // cascading-renders rule). Same pattern as the settings page.
  const [hydrated, setHydrated] = useState(false);
  const [scope, setScope] = useState<VendorId[]>([]);
  const [timingNoticeDismissed, setTimingNoticeDismissed] = useState(false);
  const [confirmationRevision, setConfirmationRevision] = useState(0);
  const [filters, setFilters] = useState<LookupFilters>({});
  const [fundTicker, setFundTicker] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
    setHydrated(true);
    setScope(getScopeVendors());
    try {
      const raw = localStorage.getItem(`${QUALIFIER_KEY}:${ticker}:${eventType}:${exDate}`);
      if (raw) setFilters(JSON.parse(raw) as LookupFilters);
    } catch {
      // Corrupt or unavailable preference: start unanswered.
    }
  }, [ticker, eventType, exDate]);

  const exDateParsed = useMemo(() => parseExDate(exDate), [exDate]);
  const today = useMemo(() => new Date(), []);

  const verdict = useMemo<LookupVerdict | null>(() => {
    // Re-read localStorage after an observation changes without exposing storage to SSR.
    void confirmationRevision;
    if (!hydrated || !exDateParsed) return null;
    return computeLookupVerdict({
      ticker,
      eventType,
      exDate: exDateParsed,
      today,
      scope,
      filters,
      fundTicker: fundTicker || undefined,
      getConfirmation: (vendor) =>
        getVendorConfirmation(ticker, eventType, exDate, vendor),
    });
  }, [
    hydrated,
    exDateParsed,
    ticker,
    eventType,
    exDate,
    today,
    scope,
    filters,
    fundTicker,
    confirmationRevision,
  ]);

  const company = useMemo(
    () => companyParam ?? resolveCompanyName(ticker),
    [companyParam, ticker],
  );
  const eventName = canonicalEventById(eventType)?.name ?? eventType;
  const fundResolution = useMemo(() => resolveFundRules(fundTicker || undefined, franklinSnapshot, []).resolution, [fundTicker]);
  const caev = useMemo(() => caevForEventType(eventType), [eventType]);
  const daysOutNum = exDateParsed ? daysOut(exDateParsed, today) : null;
  const groups = verdict ? deriveVendorGroups(verdict) : null;
  const comparableVendors = useMemo(
    () => groups ? [...groups.supplied, ...groups.expectedAbsent].map((row) => row.vendor) : [],
    [groups],
  );
  const divergence = useMemo(
    () => computeDivergence(comparableVendors, eventType),
    [comparableVendors, eventType],
  );

  const updateConfirmation = (vendor: VendorId, state: VendorMarkState) => {
    setVendorConfirmation(ticker, eventType, exDate, vendor, state);
    setConfirmationRevision((revision) => revision + 1);
  };

  const updateScope = (next: VendorId[]) => {
    setScope(next);
    setScopeVendors(next);
  };

  const lateAbsentVendors =
    verdict?.rows
      .filter(
        (row) =>
          row.state === "missing" && row.confirmation?.state === "absent",
      )
      .map((row) => row.vendor) ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Query header — D1 (1) */}
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{ticker}</h1>
            {company && (
              <span className="pb-1 text-sm text-muted-foreground">
                {company}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
              {eventName}
            </span>
            {caev && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 font-mono text-xs font-medium text-muted-foreground">
                {caev}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden />
              ex-date {exDate}
            </span>
            {daysOutNum !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <ClockIcon className="h-3.5 w-3.5" aria-hidden />
                {daysOutLabel(daysOutNum)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-6 py-10">
        {/* D1 (2) vendor scope — D1 (3) verdict — D1 (4) matrix — D1 (5) news */}
        {!hydrated || !verdict ? (
          <div aria-hidden className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-40 motion-safe:animate-pulse rounded-[2rem] border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-4"
          >
            <VendorScopeControl scope={scope} onChange={updateScope} />
            <FundContextControl selectedTicker={fundTicker} onChange={setFundTicker} resolution={fundResolution} />
            <QualifierControls
              ticker={ticker}
              eventType={eventType}
              exDate={exDate}
              filters={filters}
              onChange={setFilters}
            />
            {scope.length === 0 ? (
              <SurfaceSection className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  Nothing selected
                </h2>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  No vendors are in scope, so there is nothing to verdict,
                  compare, or match. Select one or more vendors in{" "}
                  <span className="font-medium text-foreground">
                    Vendor scope
                  </span>{" "}
                  above, or use &quot;Restore all vendors&quot; to bring back
                  the full roster.
                </p>
              </SurfaceSection>
            ) : (
              <>
                <VerdictPanel
                  verdict={verdict}
                  timingNoticeDismissed={timingNoticeDismissed}
                  onDismissTimingNotice={() => setTimingNoticeDismissed(true)}
                />
                {groups && (groups.notYetDue.length > 0 || groups.timingUnassessed.length > 0) && (
                  <SurfaceSection padding="tight" className="space-y-1">
                    {groups.notYetDue.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {groups.notYetDue.length} vendor{groups.notYetDue.length === 1 ? " is" : "s are"} not yet due — the event is outside its forward publication horizon.
                      </p>
                    )}
                    {groups.timingUnassessed.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Timing unassessed for {groups.timingUnassessed.map((row) => VENDOR_LABELS[row.vendor]).join(", ")} — no documented or local publication horizon.
                      </p>
                    )}
                  </SurfaceSection>
                )}
                <DivergencePanel
                  result={divergence}
                  lateAbsentVendors={lateAbsentVendors}
                />

                <SurfaceSection className="space-y-4">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Coverage matrix
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <section aria-labelledby="supplied-heading">
                      <h3 id="supplied-heading" className="mb-2 text-sm font-semibold">Supplied data</h3>
                      <p className="mb-3 text-xs text-muted-foreground">Observed in vendor data.</p>
                      <CoverageMatrix rows={groups?.supplied ?? []} onMarkChange={updateConfirmation} />
                    </section>
                    <section aria-labelledby="expected-heading">
                      <h3 id="expected-heading" className="mb-2 text-sm font-semibold">Expected but absent</h3>
                      <p className="mb-3 text-xs text-muted-foreground">Expected within its publication horizon, but not observed.</p>
                      <CoverageMatrix rows={groups?.expectedAbsent ?? []} onMarkChange={updateConfirmation} />
                    </section>
                  </div>
                </SurfaceSection>
              </>
            )}

            <NewsPanel
              ticker={ticker}
              eventType={eventType}
              exDate={exDate}
              company={company}
            />
          </motion.div>
        )}
      </div>
    </main>
  );
}
