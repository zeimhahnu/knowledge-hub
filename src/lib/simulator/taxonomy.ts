import type { EventClass, EventFamily } from "@/lib/simulator/types";

/**
 * Coarse simulator families (not the full 13-type vendor list).
 * Canonical names and mandatory/voluntary counts live in `@/lib/event-taxonomy`.
 */

/** Event class is determined by the selected family — no separate user step. */
export const FAMILY_TO_CLASS: Record<EventFamily, EventClass> = {
  dividend: "mandatory",
  split: "mandatory",
  merger: "mandatory",
  spinoff: "mandatory",
  return_of_capital: "mandatory",
  delisting: "mandatory",
  rights: "voluntary",
  tender: "voluntary",
  other: "mandatory",
};

export const MANDATORY_FAMILIES: EventFamily[] = [
  "dividend",
  "split",
  "merger",
  "spinoff",
  "return_of_capital",
  "delisting",
  "other",
];

export const VOLUNTARY_FAMILIES: EventFamily[] = ["rights", "tender"];

export function getEventClassFromFamily(family: EventFamily): EventClass {
  return FAMILY_TO_CLASS[family] ?? "mandatory";
}

export function familiesForClass(eventClass: EventClass): EventFamily[] {
  return eventClass === "voluntary" ? [...VOLUNTARY_FAMILIES] : [...MANDATORY_FAMILIES];
}

export function humanFamily(f: EventFamily): string {
  const map: Record<EventFamily, string> = {
    dividend: "Dividend",
    split: "Stock split or consolidation",
    merger: "M&A",
    spinoff: "Spin-off",
    rights: "Rights issue",
    tender: "Tender or buyback",
    return_of_capital: "Return of capital",
    delisting: "Delisting",
    other: "Other corporate action",
  };
  return map[f];
}
