/**
 * Coverage-period settings — the vendor publication lead-time store (§11c).
 *
 * §7a-i's `not-yet-due` vs `missing` distinction needs each vendor's
 * publication lead time, and the methodology docs do not state it: MSCI
 * documents 0 of 13 event types (P0 slice 2). The fund-ops operator knows it
 * observationally, so this module is the calibration knob: a localStorage
 * store of user-set lead times that feeds slice 1's coverage engine
 * (`src/lib/coverage.ts`) via `getLeadDays`.
 *
 * Honesty rule (§11c): NO NUMBER WITHOUT A SOURCE. Resolution order:
 *
 *   user per-event-type override -> user per-vendor default ->
 *   stated (rules.json per-event value, else documented vendor default) ->
 *   null / 'unset'.
 *
 * "Stated" means the number came from vendor documentation — never a
 * cross-applied guess. FTSE's 5-day proforma tracker is real and seeded
 * `stated`; every vendor without a documented horizon is `unset` until the
 * operator sets one. An `unset` lead time must DISABLE the
 * not-yet-due/missing verdict for that vendor — its consumer must treat
 * `source === "unset"` as "no verdict", never as a number.
 *
 * Persistence is localStorage only (§11c constraint 4): self-hosted, 1-2
 * users, no backend. Every storage access is guarded — private windows and
 * cleared storage fall back to the documented value, never crash the page.
 * `storage` is an optional parameter so the self-check can inject a fake;
 * the browser path resolves `window.localStorage` lazily (safe to import in
 * node / during SSR).
 *
 * ponytail: this file imports nothing but rules.json (and that with an
 * import attribute) so plain Node ≥22.18 can type-strip and import it for
 * `scripts/check-coverage-settings.mjs` — same rule as news-validation.ts
 * and coverage.ts. The vendor/event constants are therefore inlined copies
 * of `src/lib/vendors.ts` and `src/lib/event-taxonomy.ts`; keep them in
 * sync (the page iterates the real modules, so a drift here only loses
 * stored settings for a newly-added vendor, never renders one).
 */

import rules from "../data/rules.json" with { type: "json" };

/** Single namespaced localStorage key for every lead-time setting. */
export const STORAGE_KEY = "ca-hub.lead-days.v1";

/** Where a resolved lead time came from. Mirrors rules.schema.json's
 * `confidence` enum extended with 'user-set' (§11c constraint 2). */
export type LeadTimeSource = "user-set" | "stated" | "unset";

export interface LeadTimeValue {
  value: number | null;
  source: LeadTimeSource;
}

/** Minimal Storage surface — enough for the browser and the fake in the
 * self-check, without forcing a DOM dependency on this module. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Mirrors `VENDOR_IDS` in src/lib/vendors.ts — inlined for Node importability. */
const APP_VENDOR_IDS = [
  "msci",
  "sp",
  "ftse",
  "stoxx",
  "solactive",
  "morningstar",
  "vettafi",
] as const;

export type VendorId = (typeof APP_VENDOR_IDS)[number];

/** Mirrors `VENDOR_LABELS` in src/lib/vendors.ts — used for provenance copy. */
const APP_VENDOR_LABELS: Record<VendorId, string> = {
  msci: "MSCI",
  sp: "S&P DJI",
  ftse: "FTSE Russell",
  stoxx: "STOXX",
  solactive: "Solactive",
  morningstar: "Morningstar",
  vettafi: "VettaFi",
};

/** Mirrors `CANONICAL_EVENTS[].id` in src/lib/event-taxonomy.ts — the 13
 * canonical event types, in source-doc order. */
const APP_EVENT_IDS = [
  "cash-dividend",
  "special-dividend",
  "stock-dividend",
  "bonus-issue",
  "stock-split",
  "spin-off",
  "rights-issue",
  "secondary-offering",
  "private-placement",
  "return-of-capital",
  "merger",
  "tender-offer",
  "bankruptcy",
] as const;

interface StoredSettings {
  schema: 1;
  /** Operator-typed per-vendor defaults. */
  vendorDefaults: Partial<Record<VendorId, number>>;
  /** Operator-typed per-event-type overrides — the exception case. */
  overrides: Partial<Record<VendorId, Partial<Record<string, number>>>>;
}

const freshEmpty = (): StoredSettings => ({ schema: 1, vendorDefaults: {}, overrides: {} });

/** Read + sanitize. Corrupt JSON, wrong shape, or no store => virgin state. */
function readSettings(storage?: SettingsStorage): StoredSettings {
  const store = resolveStorage(storage);
  if (!store) return freshEmpty();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return freshEmpty();
    return sanitize(JSON.parse(raw));
  } catch {
    return freshEmpty();
  }
}

/**
 * Documented vendor-level defaults that do not live in rules.json yet.
 * FTSE Russell's 5-day proforma / projection tracker is a forward view of
 * index changes five days out — confirmed real by the product owner
 * 2026-09-01 (spec §11c). It is NOT a fallback for other vendors: the seed
 * table is per-vendor, and a missing entry means "not set", not "inherit".
 * Once the parallel research task lands per-vendor `lead_days` in rules.json,
 * those per-event values out-rank this table (see `statedLeadDays`), so the
 * table shrinks toward nothing instead of competing with it.
 */
const DOCUMENTED_VENDOR_DEFAULTS: Partial<Record<VendorId, number>> = {
  ftse: 5,
};

/** Named provenance for every documented source (page inline label). */
const STATED_SOURCE_LABELS: Partial<Record<VendorId, string>> = {
  ftse: "FTSE 5-day proforma tracker",
};

export function statedSourceLabel(vendor: VendorId): string {
  return STATED_SOURCE_LABELS[vendor] ?? `${APP_VENDOR_LABELS[vendor]} methodology`;
}

const isValidDays = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;

// ─── Storage access (all guarded — never throw, never crash the page) ──────

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

function writeSettings(settings: StoredSettings, storage?: SettingsStorage): void {
  const store = resolveStorage(storage);
  if (!store) return; // no persistence available — settings just don't stick
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full / blocked — same outcome, never surface an error.
  }
}

/** Rebuild a StoredSettings from untrusted parsed JSON: unknown vendors /
 * events are dropped, non-finite or negative values are dropped. */
function sanitize(raw: unknown): StoredSettings {
  const out: StoredSettings = { schema: 1, vendorDefaults: {}, overrides: {} };
  if (typeof raw !== "object" || raw === null) return out;
  const src = raw as { vendorDefaults?: unknown; overrides?: unknown };

  const vd = src.vendorDefaults;
  if (typeof vd === "object" && vd !== null) {
    for (const vendor of APP_VENDOR_IDS) {
      const v = (vd as Record<string, unknown>)[vendor];
      if (isValidDays(v)) out.vendorDefaults[vendor] = v;
    }
  }

  const ov = src.overrides;
  if (typeof ov === "object" && ov !== null) {
    for (const vendor of APP_VENDOR_IDS) {
      const per = (ov as Record<string, unknown>)[vendor];
      if (typeof per !== "object" || per === null) continue;
      const byEvent: Partial<Record<string, number>> = {};
      for (const event of APP_EVENT_IDS) {
        const v = (per as Record<string, unknown>)[event];
        if (isValidDays(v)) byEvent[event] = v;
      }
      if (Object.keys(byEvent).length > 0) out.overrides[vendor] = byEvent;
    }
  }
  return out;
}

// ─── Stated layer: rules.json per-event, then documented vendor default ────

function statedLeadDays(vendor: VendorId, eventType: string): number | null {
  for (const rule of rules.rules) {
    if (rule.vendor === vendor && rule.event_type === eventType && rule.lead_days !== null) {
      return rule.lead_days;
    }
  }
  return DOCUMENTED_VENDOR_DEFAULTS[vendor] ?? null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Resolved lead time for (vendor, eventType) — the value slice 1's
 * `coverageState` should be called with. Consumers MUST gate on source:
 * `source === "unset"` disables the not-yet-due/missing verdict (there is no
 * number to run), and `coverageState` would throw on null anyway.
 */
export function getLeadDays(
  vendor: VendorId,
  eventType: string,
  storage?: SettingsStorage,
): LeadTimeValue {
  const s = readSettings(storage);

  const override = s.overrides[vendor]?.[eventType];
  if (override !== undefined) return { value: override, source: "user-set" };

  const userDefault = s.vendorDefaults[vendor];
  if (userDefault !== undefined) return { value: userDefault, source: "user-set" };

  const stated = statedLeadDays(vendor, eventType);
  if (stated !== null) return { value: stated, source: "stated" };

  return { value: null, source: "unset" };
}

/** The per-vendor default input's value: user layer -> documented vendor
 * default -> unset. Per-event rules.json values are not vendor-level, so this
 * only consults the documented vendor default; per-event stated values still
 * flow through `getLeadDays`. */
export function getVendorLeadDays(
  vendor: VendorId,
  storage?: SettingsStorage,
): LeadTimeValue {
  const s = readSettings(storage);

  const userDefault = s.vendorDefaults[vendor];
  if (userDefault !== undefined) return { value: userDefault, source: "user-set" };

  const documented = DOCUMENTED_VENDOR_DEFAULTS[vendor];
  if (documented !== undefined) return { value: documented, source: "stated" };

  return { value: null, source: "unset" };
}

/** Set (or with null, clear) the per-vendor default. Invalid values clear. */
export function setVendorDefault(
  vendor: VendorId,
  days: number | null,
  storage?: SettingsStorage,
): void {
  const s = readSettings(storage);
  if (days === null || !isValidDays(days)) {
    delete s.vendorDefaults[vendor];
  } else {
    s.vendorDefaults[vendor] = days;
  }
  writeSettings(s, storage);
}

/** Set (or with null, clear) a per-event-type override for a vendor. */
export function setEventOverride(
  vendor: VendorId,
  eventType: string,
  days: number | null,
  storage?: SettingsStorage,
): void {
  const s = readSettings(storage);
  if (days === null || !isValidDays(days)) {
    if (s.overrides[vendor]) {
      delete s.overrides[vendor]![eventType];
      if (Object.keys(s.overrides[vendor]!).length === 0) delete s.overrides[vendor];
    }
  } else {
    s.overrides[vendor] = { ...s.overrides[vendor], [eventType]: days };
  }
  writeSettings(s, storage);
}

/** Back to documented values: clears the vendor default AND every override. */
export function resetVendor(vendor: VendorId, storage?: SettingsStorage): void {
  const s = readSettings(storage);
  delete s.vendorDefaults[vendor];
  delete s.overrides[vendor];
  writeSettings(s, storage);
}

/** The override rows actually set for a vendor — never the 13-row grid. */
export function getEventOverrides(
  vendor: VendorId,
  storage?: SettingsStorage,
): Array<{ eventType: string; days: number }> {
  const per = readSettings(storage).overrides[vendor];
  if (!per) return [];
  return APP_EVENT_IDS.flatMap((event) =>
    per[event] !== undefined ? [{ eventType: event, days: per[event]! }] : [],
  );
}

/** True when the user has touched this vendor at all (default or override). */
export function hasUserSettings(vendor: VendorId, storage?: SettingsStorage): boolean {
  const s = readSettings(storage);
  return (
    s.vendorDefaults[vendor] !== undefined ||
    (s.overrides[vendor] !== undefined && Object.keys(s.overrides[vendor]!).length > 0)
  );
}