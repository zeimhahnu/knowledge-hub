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
export function vendorAppliesToEvent(vendor: VendorId, eventType: string): boolean {
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
export function securityInVendorUniverse(ticker: string, vendor: VendorId): boolean {
  void ticker;
  void vendor;
  return true;
}

/**
 * Is the event already present in the vendor's feed?
 *
 * ponytail: no vendor-feed detection exists yet (spec §7a — the user
 * supplies the event; Tier-1 detection is a later slice), so no vendor can
 * be `covered` today. The injection point stays so the matrix logic already
 * counts it correctly the day a feed lands.
 */
export function presentAtVendor(ticker: string, eventType: string): (v: VendorId) => boolean {
  void ticker;
  void eventType;
  return () => false;
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
  return rules.rules.find((r) => r.event_type === eventType && r.caev)?.caev ?? null;
}

/** Treatment prose for (vendor, event) from rules.json — null when no rule
 * has been extracted for that pair yet. */
export function treatmentFor(vendor: VendorId, eventType: string): string | null {
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
  if (!store) return [...VENDOR_IDS];
  try {
    const raw = store.getItem(SCOPE_STORAGE_KEY);
    if (!raw) return [...VENDOR_IDS];
    const parsed = JSON.parse(raw) as { schema?: unknown; vendors?: unknown };
    if (parsed.schema !== 1 || !Array.isArray(parsed.vendors)) return [...VENDOR_IDS];
    const seen = new Set<VendorId>();
    for (const v of parsed.vendors) {
      if (typeof v === "string" && (VENDOR_IDS as readonly string[]).includes(v)) {
        seen.add(v as VendorId);
      }
    }
    return seen.size > 0 ? [...seen] : [...VENDOR_IDS];
  } catch {
    return [...VENDOR_IDS];
  }
}

export function setScopeVendors(vendors: readonly VendorId[], storage?: SettingsStorage): void {
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

export type MatrixState = CoverageState | "not-assessed" | "not-applicable";

export interface MatrixRow {
  vendor: VendorId;
  state: MatrixState;
  /** false ⇒ not-applicable: uninvolved, never counted, visibly de-emphasised. */
  applicable: boolean;
  /** true ⇒ a timing verdict was actually drawn (lead time was set). */
  assessed: boolean;
  /** Resolved publication lead time — null when not assessed / not applicable. */
  leadDays: number | null;
  /** Where the lead time came from (§11c source, drives D3 provenance). */
  source: LeadTimeSource | null;
  /** rules.json treatment prose, null when no rule extracted for the pair. */
  treatment: string | null;
  /** rules.json source reference for the treatment, when one exists. */
  sourceRef: string | null;
}

export interface VerdictTotals {
  /** In-scope vendors that apply to this security + event type. */
  applicable: number;
  /** Applicable vendors with a drawn verdict (covered + missing + not-yet-due). */
  assessed: number;
  covered: number;
  missing: number;
  notYetDue: number;
  /** Applicable but ungraded — no lead time set; reported separately. */
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
  /** Testable injection point — defaults to the no-detection stub. */
  isPresentAtVendor?: (vendor: VendorId) => boolean;
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
  const present = input.isPresentAtVendor ?? presentAtVendor(ticker, eventType);

  const rows: MatrixRow[] = scope.map((vendor): MatrixRow => {
    const applicable =
      securityInVendorUniverse(ticker, vendor) && vendorAppliesToEvent(vendor, eventType);
    const treatment = treatmentFor(vendor, eventType);
    const sourceRef =
      rules.rules.find((r) => r.vendor === vendor && r.event_type === eventType)
        ?.source_ref ?? null;

    if (!applicable) {
      return {
        vendor,
        state: "not-applicable",
        applicable: false,
        assessed: false,
        leadDays: null,
        source: null,
        treatment,
        sourceRef,
      };
    }

    const lead = getLeadDays(vendor, eventType, storage);
    if (lead.source === "unset" || lead.value === null) {
      // §11c: no number, no source, no verdict. Never feed null to coverageState.
      return {
        vendor,
        state: "not-assessed",
        applicable: true,
        assessed: false,
        leadDays: null,
        source: lead.source,
        treatment,
        sourceRef,
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
      state,
      applicable: true,
      assessed: true,
      leadDays: lead.value,
      source: lead.source,
      treatment,
      sourceRef,
    };
  });

  const totals: VerdictTotals = {
    applicable: 0,
    assessed: 0,
    covered: 0,
    missing: 0,
    notYetDue: 0,
    notAssessed: 0,
    notApplicable: 0,
  };
  for (const row of rows) {
    if (!row.applicable) {
      totals.notApplicable += 1;
      continue; // uninvolved — never counted anywhere else
    }
    totals.applicable += 1;
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

/** One-sentence verdict for the panel. `empty` must render as an honest
 * "nothing to grade", never as a zero-filled summary. */
export function verdictSummary(totals: VerdictTotals, empty: boolean): string {
  if (empty) {
    if (totals.applicable === 0) {
      return "Nothing to grade — no vendor in scope covers this security or event type.";
    }
    return "No verdicts yet — no coverage period is set for an in-scope vendor. Set one in Coverage settings.";
  }
  const parts: string[] = [];
  if (totals.covered > 0) parts.push(`${totals.covered} covered`);
  if (totals.missing > 0) parts.push(`${totals.missing} missing`);
  if (totals.notYetDue > 0) parts.push(`${totals.notYetDue} not-yet-due`);
  const base = `${totals.assessed} of ${totals.applicable} in-scope vendors assessed`;
  return parts.length > 0 ? `${base}: ${parts.join(" · ")}.` : `${base}.`;
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