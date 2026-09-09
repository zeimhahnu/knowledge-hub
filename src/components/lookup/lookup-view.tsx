"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  HelpCircleIcon,
  NewspaperIcon,
} from "lucide-react";

import { CaAnalystDock } from "@/components/lookup/ca-analyst-dock";
import { computeCuratedEntailment } from "@/lib/vendor-entailment";
import { VendorInvestigationList } from "@/components/lookup/vendor-investigation-list";
import { buildAnalystLookupContext } from "@/lib/ca-analyst/context";
import {
  getVendorConfirmation,
  setVendorConfirmation,
  type VendorMarkState,
} from "@/lib/vendor-confirmation";
import { SurfaceSection } from "@/components/surface-section";
import { Band } from "@/components/ui/band";
import { DataRow } from "@/components/ui/data-row";
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
  type LookupFilters,
  type LookupVerdict,
} from "@/lib/lookup-verdict";
import type { NewsValidationResult } from "@/lib/news-validation";
import { VENDOR_IDS, VENDOR_LABELS, type VendorId } from "@/lib/vendors";
import { activeFranklinCatalog, franklinCatalog, franklinSnapshot, resolveFundRules, type FranklinCatalogRecord, type FundResolution } from "@/lib/fund-master";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function motionDurationMs(token: string): number {
  if (typeof window === "undefined") return 0;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return 0;
  return value.endsWith("s") && !value.endsWith("ms") ? amount * 1000 : amount;
}

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
    chip: "border-accent/40 bg-accent/10 text-accent",
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
  onResult,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  company: string | null;
  onResult?: (result: NewsValidationResult) => void;
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
        const res = await fetch(`/api/news/?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = (await res.json()) as NewsValidationResult;
        setNews({ status: "done", result: body });
        onResult?.(body);
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
  }, [ticker, eventType, exDate, company, onResult]);

  return (
    <SurfaceSection className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="ca-section-title">
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
              className="h-24 rounded-2xl border border-border bg-muted/40"
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
                        className="block ca-surface p-3 text-sm outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
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
          <h2 id="vendor-scope-heading" className="ca-section-title">
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
      <DataRow
        label="Selected vendors"
        meta="Only this scope contributes to the verdict and coverage rows."
        value={`${scope.length} of ${VENDOR_IDS.length}`}
      />
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
        <h2 className="ca-section-title">
          Where vendors diverge
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">
        {summary}
      </p>
      {result.groups.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Divergence groups">
          {result.groups.map((group) => (
            <li key={`${group.value}-${group.vendors.join("-")}`} className="min-w-0 rounded-[4px] border border-border bg-background/50 p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{group.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {vendorList(group.vendors)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {lateAbsentVendors.length > 0 && (
        <p className="text-sm leading-relaxed text-destructive">
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
        <h2 className="ca-section-title">Narrow this lookup</h2>
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

function FundContextControl({ selectedTicker, onChange, resolution, catalogRecords }: { selectedTicker: string; onChange: (ticker: string) => void; resolution: FundResolution; catalogRecords: readonly FranklinCatalogRecord[] }) {
  return (
    <SurfaceSection className="space-y-3">
      <div>
        <h2 className="ca-section-title">Optional fund context</h2>
        <p className="mt-1 text-sm text-muted-foreground">Search the committed Franklin ETF catalog. Only reviewed metadata enables the 3-D lookup; leave unset for the unchanged P0 lookup.</p>
      </div>
      <label className="grid max-w-sm gap-1.5 text-sm">
        <span className="font-medium">Franklin ETF</span>
        <input list="franklin-etf-catalog" value={selectedTicker} onChange={(event) => onChange(event.target.value.toUpperCase())} placeholder="Search by ticker or fund name" aria-describedby="franklin-etf-help" className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        <datalist id="franklin-etf-catalog">
          {catalogRecords.map((fund) => <option key={fund.ticker} value={fund.ticker} label={fund.name.replaceAll("-", " ")} />)}
        </datalist>
        <span id="franklin-etf-help" className="text-xs text-muted-foreground">{catalogRecords.length} active cataloged ETFs · metadata is reviewed separately</span>
      </label>
      {resolution.mode === "fund-resolved" && <div className="rounded-xl border border-chart-3/40 bg-chart-3/10 px-4 py-3 text-sm"><p className="font-medium">{resolution.fund.ticker} → {resolution.fund.underlying_index} → {resolution.fund.index_provider}</p><p className="mt-1 text-muted-foreground">Index type: {resolution.indexType}. The selected event uses the reviewed 3-D rule when one exists.</p><p className="mt-1 text-xs text-muted-foreground">Sources: {resolution.fund.source_urls.join(" · ")}</p></div>}
      {resolution.mode === "cataloged-unreviewed" && <p role="status" className="rounded-xl border border-chart-4/40 bg-chart-4/10 px-4 py-3 text-sm text-chart-4"><span className="font-medium">Cataloged, metadata unreviewed:</span> {resolution.warnings[0]} No provider, weighting, index type, or 3-D rule is inferred.</p>}
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
  caAnalystEnabled = false,
}: {
  ticker: string;
  eventType: string;
  exDate: string;
  company: string | null;
  /** Server-computed private feature gate; false preserves the P0 lookup. */
  caAnalystEnabled?: boolean;
}) {
  // Hydration guard: observations, qualifiers, and horizons live in localStorage, so the
  // client's first render must not disagree with server HTML. The state flip
  // IS the point of this effect; react-hooks/set-state-in-effect has no
  // alternative here (known limitation, see MEMORY.md lessons on the React 19
  // cascading-renders rule). Same pattern as the settings page.
  const [hydrated, setHydrated] = useState(false);
  const [scope, setScope] = useState<VendorId[]>([]);
  const [confirmationRevision, setConfirmationRevision] = useState(0);
  const [filters, setFilters] = useState<LookupFilters>({});
  const [fundTicker, setFundTicker] = useState("");
  const [newsResult, setNewsResult] = useState<NewsValidationResult | null>(null);
  const [propagatedVendors, setPropagatedVendors] = useState<Set<VendorId>>(() => new Set());
  const [recentlyMarkedVendor, setRecentlyMarkedVendor] = useState<VendorId | null>(null);
  const [markRevision, setMarkRevision] = useState(0);
  const previousEntailment = useRef<Map<VendorId, string> | null>(null);
  const lastMarkedVendor = useRef<VendorId | null>(null);

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
  const entailment = useMemo(
    () =>
      groups
        ? computeCuratedEntailment({
            eventType,
            absent: groups.expectedAbsent.map((row) => row.vendor),
            confirmed: groups.supplied.map((row) => row.vendor),
            notYetDue: groups.notYetDue.map((row) => row.vendor),
            indexType:
              fundResolution.mode === "fund-resolved" ? fundResolution.indexType : null,
          })
        : [],
    [groups, eventType, fundResolution],
  );
  const comparableVendors = useMemo(
    () => groups ? [...groups.supplied, ...groups.expectedAbsent].map((row) => row.vendor) : [],
    [groups],
  );
  const divergence = useMemo(
    () => computeDivergence(comparableVendors, eventType),
    [comparableVendors, eventType],
  );
  const analystContext = useMemo(
    () =>
      caAnalystEnabled && verdict && scope.length > 0
        ? buildAnalystLookupContext({
            ticker,
            eventType,
            exDate,
            selectedVendors: scope,
            verdict,
            news: newsResult ?? {
              verdict: "unverified",
              confidence: "low",
              sources: [],
              reasoning: "News validation has not run yet.",
              validationRan: false,
              warning: "News validation is unavailable for this lookup.",
            },
          })
        : null,
    [caAnalystEnabled, verdict, newsResult, scope, ticker, eventType, exDate],
  );
  const handleNewsResult = useCallback(
    (result: NewsValidationResult) => {
      if (caAnalystEnabled) setNewsResult(result);
    },
    [caAnalystEnabled],
  );

  useEffect(() => {
    const next = new Map(entailment.map((result) => [result.vendor, result.verdict]));
    const previous = previousEntailment.current;
    const markedVendor = lastMarkedVendor.current;
    if (previous && markedVendor) {
      const changed = [...next.entries()]
        .filter(([vendor, verdictValue]) => vendor !== markedVendor && previous.get(vendor) !== verdictValue)
        .map(([vendor]) => vendor);
      if (changed.length > 0) {
        setPropagatedVendors(new Set(changed));
        const timer = window.setTimeout(
          () => setPropagatedVendors(new Set()),
          motionDurationMs("--dur-propagation"),
        );
        previousEntailment.current = next;
        lastMarkedVendor.current = null;
        return () => window.clearTimeout(timer);
      }
    }
    previousEntailment.current = next;
    lastMarkedVendor.current = null;
  }, [entailment]);

  const updateConfirmation = (vendor: VendorId, state: VendorMarkState) => {
    lastMarkedVendor.current = vendor;
    setVendorConfirmation(ticker, eventType, exDate, vendor, state);
    setConfirmationRevision((revision) => revision + 1);
    setRecentlyMarkedVendor(vendor);
    setMarkRevision((revision) => revision + 1);
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
  const checkableVendorCount = verdict?.rows.filter((row) => row.applicable).length ?? 0;
  const checkedVendorCount = verdict?.rows.filter((row) => row.applicable && row.confirmation !== null).length ?? 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Band tone="dark">
      {/* Query header — D1 (1) */}
      <div className="border-b border-border bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="ca-eyebrow">Corporate-action lookup · step 2 of 6</p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <h1 className="ca-display-title">{ticker}</h1>
            {company && (
              <span className="pb-1 text-sm text-muted-foreground">
                {company}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-[4px] border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
              {eventName}
            </span>
            {caev && (
              <span className="inline-flex items-center rounded-[4px] border border-border bg-card px-3 py-1 font-mono text-xs font-medium text-muted-foreground">
                {caev}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden />
              ex-date {exDate}
            </span>
            {daysOutNum !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <ClockIcon className="h-3.5 w-3.5" aria-hidden />
                {daysOutLabel(daysOutNum)}
              </span>
            )}
          </div>
          <div className="mt-8 grid gap-5 border-t border-border pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-8">
            <div>
              <p className="ca-label">Investigation progress</p>
              <p className="mt-1 text-xl font-medium tracking-[-0.03em]">
                {verdict ? `${checkedVendorCount} of ${checkableVendorCount} checked` : "Preparing your checks"}
              </p>
            </div>
            <div className="min-w-0">
              <div
                className="flex gap-1"
                role="progressbar"
                aria-label="Vendor investigation progress"
                aria-valuemin={0}
                aria-valuemax={checkableVendorCount}
                aria-valuenow={checkedVendorCount}
              >
                {Array.from({ length: checkableVendorCount }, (_, index) => (
                  <span
                    key={index}
                    className={`ca-progress-segment h-1 min-w-0 flex-1 rounded-[4px] ${index < checkedVendorCount ? "bg-foreground" : "bg-border"}`}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="ca-meta mt-2 max-w-2xl">
                {verdict && verdict.totals.unchecked > 0
                  ? `This is not a final verdict while ${verdict.totals.unchecked} vendor${verdict.totals.unchecked === 1 ? " remains" : "s remain"} unchecked.`
                  : "All in-scope vendors are checked."}
              </p>
            </div>
          </div>
        </div>
      </div>
      </Band>
      <Band tone="light">
      <div className="mx-auto max-w-6xl space-y-4 px-5 sm:px-8">
        {/* D1 (2) vendor scope — D1 (3) verdict — D1 (4) matrix — D1 (5) news */}
        {!hydrated || !verdict ? (
          <div aria-hidden className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="ca-surface h-40 bg-muted/40"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <VendorScopeControl scope={scope} onChange={updateScope} />
            <FundContextControl selectedTicker={fundTicker} onChange={setFundTicker} resolution={fundResolution} catalogRecords={activeFranklinCatalog(franklinCatalog)} />
            <QualifierControls
              ticker={ticker}
              eventType={eventType}
              exDate={exDate}
              filters={filters}
              onChange={setFilters}
            />
            {scope.length === 0 ? (
              <SurfaceSection className="space-y-2">
                <h2 className="ca-section-title">
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
                <VendorInvestigationList
                  ticker={ticker}
                  eventName={eventName}
                  verdict={verdict}
                  eventType={eventType}
                  exDate={exDateParsed ?? new Date(`${exDate}T00:00:00.000Z`)}
                  today={today}
                  groups={groups ?? { supplied: [], expectedAbsent: [], notYetDue: [], unchecked: [], timingUnassessed: [], notApplicable: [] }}
                  entailment={entailment}
                  propagatedVendors={propagatedVendors}
                  recentlyMarkedVendor={recentlyMarkedVendor}
                  markRevision={markRevision}
                  onMarkChange={updateConfirmation}
                />
              </>
            )}

            <NewsPanel
              ticker={ticker}
              eventType={eventType}
              exDate={exDate}
              company={company}
              onResult={caAnalystEnabled ? handleNewsResult : undefined}
            />
            {analystContext && <CaAnalystDock context={analystContext} />}
          </div>
        )}
      </div>
      </Band>
    </main>
  );
}
