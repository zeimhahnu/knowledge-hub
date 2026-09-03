"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  HelpCircleIcon,
  NewspaperIcon,
  PlusIcon,
  XIcon,
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
  resolveCompanyName,
  setScopeVendors,
  verdictSummary,
  type LookupVerdict,
} from "@/lib/lookup-verdict";
import type { NewsValidationResult } from "@/lib/news-validation";
import { VENDOR_IDS, VENDOR_LABELS, type VendorId } from "@/lib/vendors";

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

// ─── Vendor scope row ───────────────────────────────────────────────────────

function ScopeChips({
  scope,
  onChange,
}: {
  scope: VendorId[];
  onChange: (next: VendorId[]) => void;
}) {
  const unselected = VENDOR_IDS.filter((v) => !scope.includes(v));
  const [pending, setPending] = useState("");
  // A control, not a section peer: collapsed by default once a scope is set.
  const [open, setOpen] = useState(false);

  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      {scope.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 py-1 pl-3 pr-1 text-sm font-medium text-primary"
        >
          {VENDOR_LABELS[v]}
          <button
            type="button"
            aria-label={`Remove ${VENDOR_LABELS[v]} from scope`}
            onClick={() => onChange(scope.filter((x) => x !== v))}
            className="grid h-6 w-6 place-items-center rounded-full text-primary outline-none transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}

      {unselected.length > 0 && (
        <div className="inline-flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          <label className="sr-only" htmlFor="add-scope-vendor">
            Add a vendor to scope
          </label>
          <select
            id="add-scope-vendor"
            value={pending}
            onChange={(e) => {
              const v = e.target.value as VendorId;
              if (v && !scope.includes(v)) onChange([...scope, v]);
              setPending("");
            }}
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">add vendor…</option>
            {unselected.map((v) => (
              <option key={v} value={v}>
                {VENDOR_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 px-4 py-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium text-foreground">Vendor scope</span>
        <span className="flex items-center gap-1">
          {scope.length} selected
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {open && <div className="mt-3">{chips}</div>}
    </div>
  );
}

// ─── Divergence summary ────────────────────────────────────────────────────

function vendorList(vendors: readonly VendorId[]): string {
  return vendors.map((vendor) => VENDOR_LABELS[vendor]).join(", ");
}

function DivergencePanel({
  result,
  leadTimes,
  lateAbsentVendors,
}: {
  result: DivergenceResult;
  leadTimes: DivergenceResult;
  lateAbsentVendors: VendorId[];
}) {
  const speakers = result.agree.length + result.disagree.length;
  const silent = result.silent.length;
  const notCovered = result.notCovered.length;
  const leadTimeDifference = leadTimes.divergenceField === "lead-time";
  const leadTimeSilent = leadTimes.silent.length;

  let summary: string;
  if (speakers === 0) {
    summary = "No selected vendor states a treatment for this event.";
  } else if (result.divergenceField === null) {
    summary = `No treatment disagreement — all ${speakers} selected vendor${speakers === 1 ? "" : "s"} that state a treatment agree.`;
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
      <div className="flex flex-wrap gap-2 text-xs">
        {silent > 0 && (
          <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
            {silent} silent on treatment
            {silent > 0 ? `: ${vendorList(result.silent)}` : ""}
          </span>
        )}
        {notCovered > 0 && (
          <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-muted-foreground">
            {notCovered} not covered: {vendorList(result.notCovered)}
          </span>
        )}
        {leadTimeDifference ? (
          <span className="rounded-full border border-chart-4/40 bg-chart-4/10 px-2.5 py-1 text-chart-4">
            Lead times also differ:{" "}
            {leadTimes.groups
              .map((group) => `${vendorList(group.vendors)} (${group.value})`)
              .join("; ")}
          </span>
        ) : leadTimeSilent > 0 ? (
          <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
            No lead-time disagreement, but {leadTimeSilent} of{" "}
            {speakers + leadTimeSilent} do not state a lead time.
          </span>
        ) : null}
      </div>
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
            {totals.notAssessed} lead time
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
  // Hydration guard: scope and lead times live in localStorage, so the
  // client's first render must not disagree with server HTML. The state flip
  // IS the point of this effect; react-hooks/set-state-in-effect has no
  // alternative here (known limitation, see MEMORY.md lessons on the React 19
  // cascading-renders rule). Same pattern as the settings page.
  const [hydrated, setHydrated] = useState(false);
  const [scope, setScope] = useState<VendorId[]>([]);
  const [timingNoticeDismissed, setTimingNoticeDismissed] = useState(false);
  const [confirmationRevision, setConfirmationRevision] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
    setHydrated(true);
    setScope(getScopeVendors());
  }, []);

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
    confirmationRevision,
  ]);

  const company = useMemo(
    () => companyParam ?? resolveCompanyName(ticker),
    [companyParam, ticker],
  );
  const eventName = canonicalEventById(eventType)?.name ?? eventType;
  const caev = useMemo(() => caevForEventType(eventType), [eventType]);
  const daysOutNum = exDateParsed ? daysOut(exDateParsed, today) : null;
  const divergence = useMemo(
    () => computeDivergence(scope, eventType),
    [scope, eventType],
  );
  const leadTimeDivergence = useMemo(
    () => computeDivergence(scope, eventType, "lead-time"),
    [scope, eventType],
  );

  const updateScope = (next: VendorId[]) => {
    setScope(next);
    setScopeVendors(next);
  };

  const updateConfirmation = (vendor: VendorId, state: VendorMarkState) => {
    setVendorConfirmation(ticker, eventType, exDate, vendor, state);
    setConfirmationRevision((revision) => revision + 1);
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
            <ScopeChips scope={scope} onChange={updateScope} />
            <VerdictPanel
              verdict={verdict}
              timingNoticeDismissed={timingNoticeDismissed}
              onDismissTimingNotice={() => setTimingNoticeDismissed(true)}
            />
            <DivergencePanel
              result={divergence}
              leadTimes={leadTimeDivergence}
              lateAbsentVendors={lateAbsentVendors}
            />

            <SurfaceSection className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">
                Coverage matrix
              </h2>
              <CoverageMatrix
                rows={verdict.rows}
                onMarkChange={updateConfirmation}
              />
            </SurfaceSection>

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
