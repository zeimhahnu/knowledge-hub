/**
 * Lookup verdict — §7a-ii of `SPECS/corporate-action-hub-revamp-design-2026-09-01.md`.
 *
 * The /lookup/[ticker] page's matrix has FIVE states: §7a-i's four timing
 * states (covered / not-yet-due / missing) plus §7a-ii's two scope states
 * (not-assessed / not-applicable). This module resolves which state each
 * in-scope vendor is in and counts the verdict the ONLY way §7a-ii allows:
 *
 *   - unselected vendors are not shown, not scored, not counted;
 *   - a NOT-APPLICABLE vendor (security not in its universe, or event type
 *     it does not cover) is "uninvolved, not late" — never counted in any
 *     total, and an all-not-applicable scope is an honest EMPTY verdict,
 *     never "0 missing";
 *   - a NOT-ASSESSED vendor (no lead time set, §11c `source: "unset"`) gets
 *     NO timing verdict — it is reported separately so the operator knows
 *     the silence is ungraded, not fine.
 *
 * The engine itself is NOT reimplemented here: per-vendor state comes from
 * `coverage.ts`'s `coverageState` and lead times from `coverage-settings.ts`'s
 * `getLeadDays` — this file only decides which inputs those two get and what
 * the verdict totals mean.
 *
 * Pure + Node-importable (same rule as coverage.ts / coverage-settings.ts /
 * news-validation.ts): imports are relative, no `@/` aliases, no DOM at
 * import time, so `scripts/check-lookup.mjs` type-strips and imports the
 * REAL module. The no-coverage table below is therefore an inlined copy of
 * `src/lib/simulator/vendor-rules.ts`'s `trigger: "no-coverage"` markers —
 * keep it in sync (mirrors how coverage-settings.ts inlines its vendor and
 * event constants for the same reason).
 */

import rules from "../data/rules.json" with { type: "json" };
import { coverageState, type CoverageState } from "./coverage.ts";
import {
  getLeadDays,
  statedSourceLabel,
  type LeadTimeSource,
  type SettingsStorage,
} from "./coverage-settings.ts";
import { VENDOR_IDS, type VendorId } from "./vendors.ts";
import {
  getVendorConfirmation,
  type VendorConfirmation,
} from "./vendor-confirmation.ts";

const MS_PER_DAY = 86_400_000;

/** Whole UTC days since the Unix epoch, floored to the date's UTC day. */
const utcDay = (d: Date): number => Math.floor(d.getTime() / MS_PER_DAY);

/** Whole UTC days from `today` to `exDate` (negative = ex-date passed). */
export function daysOut(exDate: Date, today: Date): number {
  return utcDay(exDate) - utcDay(today);
}

// ─── (vendor, event_type) applicability ─────────────────────────────────────

/**
 * Event types the sourced methodology documents as NOT covered — inlined
 * from `src/lib/simulator/vendor-rules.ts` `trigger: "no-coverage"` rows
 * (VettaFi is the only vendor with any today). Keep in sync: a row here
 * means the vendor's silence is "not our event", never "we are late".
 */
const DOCUMENTED_NO_COVERAGE: Partial<Record<VendorId, readonly string[]>> = {
  vettafi: ["spin-off", "rights-issue", "return-of-capital", "bankruptcy"],
};

/**
 * Does this vendor cover this event type at all? (§7a-ii reason 2.)
 *
 * Source of truth is rules.json (the schema-declared fact table): an
 * explicit rule row with a real treatment makes the vendor applicable.
 * Vendors not yet extracted into rules.json fall back to the committed
 * methodology coverage table above — a vendor with no documented treatment
 * for the event is not-applicable, which is exactly the "confidence: absent"
 * job §7a-ii describes.
 *
 * ponytail: when the parallel research task lands full per-vendor rules.json
 * rows, the fallback table shrinks to nothing (the rules.json check returns
 * first for every vendor that has rows); this function's signature does not
 * change.
 */
export function vendorAppliesToEvent(
  vendor: VendorId,
  eventType: string,
): boolean {
  if (
    rules.rules.some(
      (r) =>
        r.vendor === vendor &&
        r.event_type === eventType &&
        r.confidence !== "absent",
    )
  ) {
    return true;
  }
  return !(DOCUMENTED_NO_COVERAGE[vendor]?.includes(eventType) ?? false);
}

/**
 * Does this vendor cover this SECURITY at all? (§7a-ii reason 1.)
 *
 * ponytail: universe/constituency membership data does not exist yet, so
 * every vendor is treated as covering every security. When a universe or
 * index-membership source lands (spec §5b), this is the single place to
 * wire it — false here marks the vendor not-applicable and keeps it out of
 * every total.
 */
export function securityInVendorUniverse(
  ticker: string,
  vendor: VendorId,
): boolean {
  void ticker;
  void vendor;
  return true;
}

/**
 * Is the event already present in the vendor's feed?
 *
 * User observations are local-only evidence, not vendor-feed detection.
 * The injection point keeps later automated detection compatible with this
 * same verdict path.
 */
export function presentAtVendor(
  ticker: string,
  eventType: string,
  exDate: string,
  storage?: SettingsStorage,
): (v: VendorId) => boolean {
  return (vendor) =>
    getVendorConfirmation(ticker, eventType, exDate, vendor, storage)?.state ===
    "confirmed";
}

/**
 * Ticker → company name for the query header.
 *
 * ponytail: no ticker→name lookup is wired to this page yet; the header
 * omits the company line until one is (a separate, server-only search slice).
 */
export function resolveCompanyName(ticker: string): string | null {
  void ticker;
  return null;
}

/** ISO 20022 CAEV code for an event type, from the first rule row that has
 * one (the code is a property of the event, not the vendor). */
export function caevForEventType(eventType: string): string | null {
  return (
    rules.rules.find((r) => r.event_type === eventType && r.caev)?.caev ?? null
  );
}

/** Treatment prose for (vendor, event) from rules.json — null when no rule
 * has been extracted for that pair yet. */
export function treatmentFor(
  vendor: VendorId,
  eventType: string,
): string | null {
  return (
    rules.rules.find((r) => r.vendor === vendor && r.event_type === eventType)
      ?.treatment ?? null
  );
}

// ─── Vendor scope (§7a-ii) ──────────────────────────────────────────────────

/**
 * The operator's usual set of vendors to reconcile, persisted locally
 * (`ca-hub.vendor-scope.v1`). Defaults to EVERY vendor — the spec's "usual
 * set held as a default in Settings" does not exist as a settings surface
 * yet (P0-5 built lead-time settings only), so until the operator narrows
 * the set here, the whole roster is in scope. Same guarded-storage contract
 * as coverage-settings.ts: private windows / cleared storage fall back to
 * the default, never crash.
 */
const SCOPE_STORAGE_KEY = "ca-hub.vendor-scope.v1";
/** The comparison starts with the six vendors that have sourced rule rows.
 * Other registered vendors remain selectable, where the UI accurately shows
 * them as not covered rather than silently treating them as absent. */
const DEFAULT_SCOPE = rules.vendors.filter((vendor): vendor is VendorId =>
  (VENDOR_IDS as readonly string[]).includes(vendor),
);

function resolveStorage(storage?: SettingsStorage): SettingsStorage | null {
  if (storage) return storage;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Access denied / private mode — fall through to "no storage".
  }
  return null;
}

export function getScopeVendors(storage?: SettingsStorage): VendorId[] {
  const store = resolveStorage(storage);
  if (!store) return [...DEFAULT_SCOPE];
  try {
    const raw = store.getItem(SCOPE_STORAGE_KEY);
    if (!raw) return [...DEFAULT_SCOPE];
    const parsed = JSON.parse(raw) as { schema?: unknown; vendors?: unknown };
    if (parsed.schema !== 1 || !Array.isArray(parsed.vendors))
      return [...DEFAULT_SCOPE];
    const seen = new Set<VendorId>();
    for (const v of parsed.vendors) {
      if (
        typeof v === "string" &&
        (VENDOR_IDS as readonly string[]).includes(v)
      ) {
        seen.add(v as VendorId);
      }
    }
    return seen.size > 0 ? [...seen] : [...DEFAULT_SCOPE];
  } catch {
    return [...DEFAULT_SCOPE];
  }
}

export function setScopeVendors(
  vendors: readonly VendorId[],
  storage?: SettingsStorage,
): void {
  const store = resolveStorage(storage);
  if (!store) return; // no persistence — the session scope still works
  try {
    store.setItem(
      SCOPE_STORAGE_KEY,
      JSON.stringify({ schema: 1, vendors: [...new Set(vendors)] }),
    );
  } catch {
    // Storage full / blocked — same outcome, never surface an error.
  }
}

// ─── Verdict computation ────────────────────────────────────────────────────

export type MatrixState =
  CoverageState | "not-checked" | "not-assessed" | "not-applicable";
export type DataCoverage = "states-treatment" | "silent" | "not-covered";

/**
 * Data coverage is a corpus fact, never a timing verdict. It deliberately
 * reads only rules.json: settings and the current date cannot change it.
 */
export function dataCoverageFor(
  vendor: string,
  eventType: string,
): DataCoverage {
  const rule = rules.rules.find(
    (row) => row.vendor === vendor && row.event_type === eventType,
  );
  if (!rule) return "not-covered";
  return rule.treatment !== null && rule.confidence !== "absent"
    ? "states-treatment"
    : "silent";
}

export interface MatrixRow {
  vendor: VendorId;
  /** Corpus fact: treatment stated, methodology silent, or no sourced row. */
  dataCoverage: DataCoverage;
  state: MatrixState;
  /** false ⇒ not-applicable: uninvolved, never counted, visibly de-emphasised. */
  applicable: boolean;
  /** true ⇒ a coverage verdict was drawn from a user-confirmed observation. */
  assessed: boolean;
  /** User observation; null means nobody has checked this vendor yet. */
  confirmation: VendorConfirmation | null;
  /** Resolved publication lead time — null when not assessed / not applicable. */
  leadDays: number | null;
  /** Where the lead time came from (§11c source, drives D3 provenance). */
  source: LeadTimeSource | null;
  /** rules.json treatment prose, null when no rule extracted for the pair. */
  treatment: string | null;
  /** rules.json source reference for the treatment, when one exists. */
  sourceRef: string | null;
  /** A vendor is not covered when no rule row exists at all. */
  rulePresent: boolean;
  /** A null/absent rule is methodology silence, not a contrary treatment. */
  treatmentStated: boolean;
}

export interface VerdictTotals {
  /** Data coverage is independent of settings and timing. */
  dataStatesTreatment: number;
  dataSilent: number;
  dataNotCovered: number;
  /** In-scope vendors that apply to this security + event type. */
  applicable: number;
  /** Applicable vendors with a drawn verdict (covered + missing + not-yet-due). */
  assessed: number;
  covered: number;
  missing: number;
  notYetDue: number;
  /** Applicable vendors where nobody has checked the vendor yet. */
  unchecked: number;
  /** Applicable but checked absent without a lead time to grade it. */
  notAssessed: number;
  /** In-scope but uninvolved — excluded from every other total. */
  notApplicable: number;
}

export interface LookupVerdict {
  rows: MatrixRow[];
  totals: VerdictTotals;
  /** No applicable vendor drew a verdict — render the honest empty panel,
   * never a "0 missing". */
  empty: boolean;
}

export interface LookupVerdictInput {
  ticker: string;
  eventType: string;
  exDate: Date;
  today: Date;
  scope: readonly VendorId[];
  /** Testable injection point — defaults to the user-confirmation store. */
  isPresentAtVendor?: (vendor: VendorId) => boolean;
  getConfirmation?: (vendor: VendorId) => VendorConfirmation | null;
  storage?: SettingsStorage;
}

/**
 * Resolve every in-scope vendor's matrix state and count the verdict.
 * The single most important behaviour: not-applicable vendors are excluded
 * from ALL totals, and a scope where none of the applicable vendors can be
 * graded yields `empty: true` — an honest "nothing to grade", not a lie
 * dressed as "0 missing".
 */
export function computeLookupVerdict(input: LookupVerdictInput): LookupVerdict {
  const { ticker, eventType, exDate, today, scope, storage } = input;
  const exDateKey = exDate.toISOString().slice(0, 10);
  const present =
    input.isPresentAtVendor ??
    presentAtVendor(ticker, eventType, exDateKey, storage);
  const confirmationFor =
    input.getConfirmation ??
    ((vendor) =>
      getVendorConfirmation(ticker, eventType, exDateKey, vendor, storage));

  const rows: MatrixRow[] = scope.map((vendor): MatrixRow => {
    const applicable =
      securityInVendorUniverse(ticker, vendor) &&
      vendorAppliesToEvent(vendor, eventType);
    const rule = rules.rules.find(
      (r) => r.vendor === vendor && r.event_type === eventType,
    );
    const treatment = rule?.treatment ?? null;
    const sourceRef = rule?.source_ref ?? null;
    const rulePresent = rule !== undefined;
    const treatmentStated = treatment !== null && rule?.confidence !== "absent";
    const dataCoverage = dataCoverageFor(vendor, eventType);

    if (!applicable) {
      return {
        vendor,
        dataCoverage,
        state: "not-applicable",
        applicable: false,
        assessed: false,
        confirmation: null,
        leadDays: null,
        source: null,
        treatment,
        sourceRef,
        rulePresent,
        treatmentStated,
      };
    }

    const confirmation = confirmationFor(vendor);
    if (confirmation === null) {
      return {
        vendor,
        dataCoverage,
        state: "not-checked",
        applicable: true,
        assessed: false,
        confirmation: null,
        leadDays: null,
        source: null,
        treatment,
        sourceRef,
        rulePresent,
        treatmentStated,
      };
    }

    const lead = getLeadDays(vendor, eventType, storage);
    if (lead.source === "unset" || lead.value === null) {
      if (confirmation.state === "confirmed") {
        return {
          vendor,
          dataCoverage,
          state: coverageState({
            exDate,
            today,
            leadDays: 0,
            presentAtVendor: present(vendor),
          }),
          applicable: true,
          assessed: true,
          confirmation,
          leadDays: null,
          source: null,
          treatment,
          sourceRef,
          rulePresent,
          treatmentStated,
        };
      }
      // §11c: no number, no source, no verdict. Never feed null to coverageState.
      return {
        vendor,
        dataCoverage,
        state: "not-assessed",
        applicable: true,
        assessed: false,
        confirmation,
        leadDays: null,
        source: lead.source,
        treatment,
        sourceRef,
        rulePresent,
        treatmentStated,
      };
    }

    const state = coverageState({
      exDate,
      today,
      leadDays: lead.value,
      presentAtVendor: present(vendor),
    });
    return {
      vendor,
      dataCoverage,
      state,
      applicable: true,
      assessed: true,
      confirmation,
      leadDays: lead.value,
      source: lead.source,
      treatment,
      sourceRef,
      rulePresent,
      treatmentStated,
    };
  });

  const totals: VerdictTotals = {
    dataStatesTreatment: 0,
    dataSilent: 0,
    dataNotCovered: 0,
    applicable: 0,
    assessed: 0,
    covered: 0,
    missing: 0,
    notYetDue: 0,
    unchecked: 0,
    notAssessed: 0,
    notApplicable: 0,
  };
  for (const row of rows) {
    if (row.dataCoverage === "states-treatment")
      totals.dataStatesTreatment += 1;
    else if (row.dataCoverage === "silent") totals.dataSilent += 1;
    else totals.dataNotCovered += 1;

    if (!row.applicable) {
      totals.notApplicable += 1;
      continue; // uninvolved — never counted anywhere else
    }
    totals.applicable += 1;
    if (row.state === "not-checked") {
      totals.unchecked += 1;
      continue;
    }
    if (!row.assessed) {
      totals.notAssessed += 1;
      continue; // ungraded — reported separately, never as a timing state
    }
    totals.assessed += 1;
    if (row.state === "covered") totals.covered += 1;
    else if (row.state === "missing") totals.missing += 1;
    else if (row.state === "not-yet-due") totals.notYetDue += 1;
  }

  return { rows, totals, empty: totals.assessed === 0 };
}

/** Data coverage leads; timing is explicitly reported as a separate fact. */
export function verdictSummary(totals: VerdictTotals): string {
  const scoped =
    totals.dataStatesTreatment + totals.dataSilent + totals.dataNotCovered;
  const position = totals.dataStatesTreatment + totals.dataSilent;
  const coverage =
    `${position} of ${scoped} vendors state a position: ` +
    `${totals.dataStatesTreatment} with a rule, ${totals.dataSilent} silent`;
  if (totals.applicable === 0) return `${coverage}.`;
  const timing =
    `Confirmed at ${totals.covered}, missing at ${totals.missing} (past publication window), ` +
    `not checked at ${totals.unchecked}.`;
  return `${coverage}. ${timing}`;
}

/** Provenance copy for the publication-window cell (D3) — a user-typed
 * number must never render identically to a documented one. */
export function leadTimeProvenance(
  source: LeadTimeSource,
  vendor: VendorId,
): { label: string; tone: "user" | "stated" | "unset" } {
  if (source === "user-set") return { label: "your setting", tone: "user" };
  if (source === "stated") {
    return { label: `from ${statedSourceLabel(vendor)}`, tone: "stated" };
  }
  return { label: "not set", tone: "unset" };
}
