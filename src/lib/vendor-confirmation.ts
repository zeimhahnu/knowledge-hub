import type { SettingsStorage } from "./coverage-settings";
import type { VendorId } from "./vendors";

/** User-recorded vendor observation for one corporate-action lookup. */
export type VendorMarkState = "confirmed" | "absent" | "unchecked";

export interface VendorConfirmation {
  state: Exclude<VendorMarkState, "unchecked">;
  checkedAt: string;
}

interface ConfirmationDraft {
  schema: 1;
  marks: Record<string, Partial<Record<VendorId, VendorConfirmation>>>;
}

/** One local, versioned store for all lookup-specific vendor observations. */
export const VENDOR_CONFIRMATION_STORAGE_KEY = "ca-hub.vendor-confirmation.v1";

const freshDraft = (): ConfirmationDraft => ({ schema: 1, marks: {} });

function resolveStorage(storage?: SettingsStorage): SettingsStorage | null {
  if (storage) return storage;
  try {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage;
  } catch {
    // Private windows and blocked storage use the in-memory unchecked default.
  }
  return null;
}

function keyFor(ticker: string, eventType: string, exDate: string): string {
  return JSON.stringify([ticker.toUpperCase(), eventType, exDate]);
}

function isConfirmation(value: unknown): value is VendorConfirmation {
  if (typeof value !== "object" || value === null) return false;
  const mark = value as { state?: unknown; checkedAt?: unknown };
  return (
    (mark.state === "confirmed" || mark.state === "absent") &&
    typeof mark.checkedAt === "string" &&
    Number.isFinite(new Date(mark.checkedAt).getTime())
  );
}

function readDraft(storage?: SettingsStorage): ConfirmationDraft {
  const store = resolveStorage(storage);
  if (!store) return freshDraft();
  try {
    const raw = store.getItem(VENDOR_CONFIRMATION_STORAGE_KEY);
    if (!raw) return freshDraft();
    const parsed = JSON.parse(raw) as { schema?: unknown; marks?: unknown };
    if (
      parsed.schema !== 1 ||
      typeof parsed.marks !== "object" ||
      parsed.marks === null
    ) {
      return freshDraft();
    }
    const marks: ConfirmationDraft["marks"] = {};
    for (const [lookupKey, vendorMarks] of Object.entries(parsed.marks)) {
      if (typeof vendorMarks !== "object" || vendorMarks === null) continue;
      const clean: Partial<Record<VendorId, VendorConfirmation>> = {};
      for (const [vendor, mark] of Object.entries(vendorMarks)) {
        if (isConfirmation(mark)) clean[vendor as VendorId] = mark;
      }
      if (Object.keys(clean).length > 0) marks[lookupKey] = clean;
    }
    return { schema: 1, marks };
  } catch {
    return freshDraft();
  }
}

function writeDraft(
  draft: ConfirmationDraft,
  storage?: SettingsStorage,
): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    store.setItem(VENDOR_CONFIRMATION_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function getVendorConfirmation(
  ticker: string,
  eventType: string,
  exDate: string,
  vendor: VendorId,
  storage?: SettingsStorage,
): VendorConfirmation | null {
  return (
    readDraft(storage).marks[keyFor(ticker, eventType, exDate)]?.[vendor] ??
    null
  );
}

/** "unchecked" clears the observation; checked marks retain an ISO evidence timestamp. */
export function setVendorConfirmation(
  ticker: string,
  eventType: string,
  exDate: string,
  vendor: VendorId,
  state: VendorMarkState,
  checkedAt = new Date().toISOString(),
  storage?: SettingsStorage,
): boolean {
  const draft = readDraft(storage);
  const lookupKey = keyFor(ticker, eventType, exDate);
  const marks = { ...draft.marks[lookupKey] };

  if (state === "unchecked") {
    delete marks[vendor];
  } else {
    marks[vendor] = { state, checkedAt };
  }

  if (Object.keys(marks).length === 0) delete draft.marks[lookupKey];
  else draft.marks[lookupKey] = marks;
  return writeDraft(draft, storage);
}
