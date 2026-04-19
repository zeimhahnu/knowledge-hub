# Feature: Fix Voluntary Event Taxonomy

> Status: SPEC INBOX
> Created: 2026-04-19
> Assigned to: Cursor
> Feature ID: `fix-voluntary-taxonomy`

---

## Context

The simulator Step 2 "Category" selector shows only 2 event types under "Voluntary": **Rights Issue** and **Tender or buyback**.

In reality, these are also voluntary:
- **Secondary Offering** (or: Secondary / Follow-on offering)
- **Private Placement**

Additionally, these are voluntary:
- **Stock Dividend** (vs Bonus Issue — some vendors treat differently, and it can be voluntary depending on jurisdiction)
- **Return of Capital** (sometimes voluntary)

**Task:** Update the event family taxonomy so the simulator correctly reflects all voluntary events.

---

## Implementation

### 1. Update `src/lib/simulator/types.ts`

Add missing voluntary event families:

```ts
export type EventFamily =
  | "dividend"
  | "split"
  | "merger"
  | "spinoff"
  | "rights"
  | "tender"
  | "secondary_offering"   // ADD — voluntary
  | "private_placement"    // ADD — voluntary
  | "return_of_capital"
  | "delisting"
  | "other";
```

### 2. Update `src/lib/simulator/taxonomy.ts`

Update `FAMILY_TO_CLASS`, `VOLUNTARY_FAMILIES`, and `humanFamily()`:

```ts
export const VOLUNTARY_FAMILIES: EventFamily[] = [
  "rights",
  "tender",
  "secondary_offering",   // ADD
  "private_placement",    // ADD
];
```

Add to `FAMILY_TO_CLASS`:
```ts
secondary_offering: "voluntary",
private_placement: "voluntary",
```

Add to `humanFamily()`:
```ts
secondary_offering: "Secondary Offering",
private_placement: "Private Placement",
```

### 3. Update simulator engine (`src/lib/simulator/simulator-engine.ts`)

Add hypothesis rules for the two new voluntary events — copy from existing patterns:

**Secondary Offering:**
- If `eventFamily === "secondary_offering"` → treat similarly to M&A in terms of free-float changes
- Threshold check for size (≥5% of market cap triggers immediate adjustment)

**Private Placement:**
- If `eventFamily === "private_placement"` → material events trigger immediate adjustment; below threshold → deferred to QIR

### 4. Update Step 2 options in homepage decision tree (`src/app/page.tsx`)

Update the Voluntary option sub-label to reflect all voluntary events:
```tsx
{ label: "Voluntary", sub: "Rights, tender, secondary offering, private placement", color: "..." }
```

### 5. Verify

- TypeScript compiles: `npx tsc --noEmit`
- ESLint passes: `npm run lint`
- Simulator step 2 shows all voluntary families
- Push to main → Vercel deploys

---

## Acceptance Criteria

- [ ] Simulator Step 2 → Voluntary shows Rights Issue, Tender/Buyback, Secondary Offering, Private Placement
- [ ] `VOLUNTARY_FAMILIES` in taxonomy.ts includes all 4
- [ ] Simulator engine has hypotheses for secondary_offering and private_placement
- [ ] Homepage decision tree Voluntary sub-label updated
- [ ] TypeScript + ESLint clean
- [ ] Deployed to Vercel
