# Feature: Fix PR#10 Issues Before Merge

> Status: SPEC INBOX  
> Created: 2026-04-24  
> Assigned to: Cursor  
> Source: Code review of PR#10 (`voluntary-taxonomy-6a36`)  
> Priority: HIGH — PR#10 should not be merged until these are fixed

---

## Context

PR#10 (`voluntary-taxonomy-6a36`) correctly implements secondary offering + private placement in the simulator's voluntary families. However, the refactor introduced several issues that must be fixed before merge. This spec captures all five.

---

## Issues to Fix

### Issue 1 — Typo on Vendor Reference page

**File:** `src/app/vendors/page.tsx`

```
- term: "When-Issuued",
+ term: "When-Issued",
```

---

### Issue 2 — Restore `verdict` field to `SimulatorResult`

**File:** `src/lib/simulator/types.ts`

The `verdict` field (one short, definite sentence stating WHY the divergence occurred) was deleted from `SimulatorResult`. Restore it:

```typescript
export type SimulatorResult = {
  summary: string;
  verdict: string;  // ← restore this
  hypotheses: Hypothesis[];
  nextStepLinks: { label: string; href: string }[];
  disclaimer: string;
};
```

**Engine:** Ensure `buildSimulatorResult()` in `simulator-engine.ts` still populates the `verdict` field — it was part of the output contract before this refactor.

---

### Issue 3 — Restore `assertVendorEventsMatchCanonical`

**File:** `src/app/vendors/page.tsx`

This runtime safeguard ensured the Vendor Reference page (`EVENTS[]`) stays in sync with the canonical taxonomy in `event-taxonomy.ts`. It was removed in PR#10.

**Action:** Restore the import and call at the bottom of `vendors/page.tsx`:

```typescript
import {
  assertVendorEventsMatchCanonical,
  eventNamesSentence,
  mandatoryEventCount,
  voluntaryEventCount,
} from "@/lib/event-taxonomy";

// ... inside EVENTS[] ...

assertVendorEventsMatchCanonical(EVENTS);
```

**Note:** This requires `event-taxonomy.ts` to stay in the codebase (see Issue 4).

---

### Issue 4 — Keep `event-taxonomy.ts` as source of truth

**File:** `src/lib/event-taxonomy.ts`

PR#10 deleted this file, replacing the canonical taxonomy with hardcoded enums in each module. This breaks `assertVendorEventsMatchCanonical` (Issue 3) and makes it possible for the simulator, decision tree, and vendor page to drift out of sync silently.

**Action:** Restore `event-taxonomy.ts` as the single source of truth for the canonical 13-type taxonomy. `taxonomy.ts`, `vendors/page.tsx`, and `page.tsx` should all import from it.

The taxonomy is the same 13 types already in `event-taxonomy.ts`:
- cash-dividend, special-dividend, stock-dividend, bonus-issue, stock-split
- spin-off, rights, secondary-offering, private-placement
- return-of-capital, merger, tender-offer, bankruptcy

---

### Issue 5 — Restore structured vendor rules data (optional but recommended)

**File:** `src/lib/simulator/vendor-rules.ts` (deleted in PR#10)

PR#10 inlined all vendor rules directly into `simulator-engine.ts`. This works but loses the clean data structure that was derived from `SOURCES/index-vendor-methodology.md`. The structured `VENDOR_RULES` record (718 lines) made it easy to cross-check against the source document and to extend for new event types.

**Recommendation:** Restore `vendor-rules.ts` as a data-only file (no logic). Have `simulator-engine.ts` import from it. This keeps the rules auditable and aligned with the methodology source.

If time-constrained, this issue can be deferred — the inline rules in the engine still function correctly.

---

## Acceptance Criteria

- [ ] `When-Issuued` typo fixed → `When-Issued` in vendors page
- [ ] `verdict: string` field restored to `SimulatorResult` type
- [ ] `assertVendorEventsMatchCanonical(EVENTS)` restored in vendors page
- [ ] `event-taxonomy.ts` restored and used as the canonical taxonomy source
- [ ] All imports in `taxonomy.ts`, `vendors/page.tsx`, `page.tsx` resolve correctly
- [ ] `npm run lint` and `npx tsc --noEmit` pass
- [ ] Vercel preview deploys without errors

---

## Related

- PR#10: `cursor/voluntary-taxonomy-6a36`
- Original approved spec: `SPECS/inbox/feature-taxonomy-voluntary.md`
- Canonical taxonomy source: `SOURCES/index-vendor-methodology.md`