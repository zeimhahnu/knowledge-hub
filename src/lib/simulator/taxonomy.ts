import {
  CANONICAL_EVENTS,
  canonicalEventById,
  type CanonicalEventId,
  type EventBadge,
} from "@/lib/event-taxonomy";
import type { EventClass, EventFamily } from "@/lib/simulator/types";

/**
 * Single source of truth: every simulator family IS a canonical event id from
 * `@/lib/event-taxonomy` (the same 13 ISO CAEV types the Vendor Reference uses).
 * The simulator no longer maintains its own coarse taxonomy.
 */

const BADGE_TO_CLASS: Record<EventBadge, EventClass> = {
  mandatory: "mandatory",
  voluntary: "voluntary",
};

export const FAMILY_TO_CLASS: Record<EventFamily, EventClass> = Object.fromEntries(
  CANONICAL_EVENTS.map((e) => [e.id, BADGE_TO_CLASS[e.badge]]),
) as Record<EventFamily, EventClass>;

export const MANDATORY_FAMILIES: EventFamily[] = CANONICAL_EVENTS.filter(
  (e) => e.badge === "mandatory",
).map((e) => e.id as CanonicalEventId);

export const VOLUNTARY_FAMILIES: EventFamily[] = CANONICAL_EVENTS.filter(
  (e) => e.badge === "voluntary",
).map((e) => e.id as CanonicalEventId);

export function getEventClassFromFamily(family: EventFamily): EventClass {
  return FAMILY_TO_CLASS[family] ?? "mandatory";
}

export function familiesForClass(eventClass: EventClass): EventFamily[] {
  return eventClass === "voluntary" ? [...VOLUNTARY_FAMILIES] : [...MANDATORY_FAMILIES];
}

export function humanFamily(f: EventFamily): string {
  return canonicalEventById(f)?.name ?? f;
}
