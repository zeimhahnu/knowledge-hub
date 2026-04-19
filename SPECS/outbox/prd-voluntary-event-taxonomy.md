# PRD: Voluntary Event Taxonomy (Secondary Offering & Private Placement)

> Status: **DRAFT** — Pending Alex approval  
> Created: 2026-04-19  
> Created by: Cursor Agent  
> Source spec: `SPECS/inbox/feature-taxonomy-voluntary.md`  
> Feature ID: `fix-voluntary-taxonomy`

---

## Executive Summary

The **Projection Gap Simulator** currently treats only **Rights issue** and **Tender or buyback** as voluntary event families. Real-world index methodology also treats **secondary offerings** and **private placements** as voluntary (shareholder participation or allocation matters). This PRD expands the simulator’s **taxonomy**, **UI options**, and **hypothesis engine** so Step 2 under “Voluntary” reflects those families consistently. It also **aligns the homepage decision-tree copy** with the simulator so users are not promised “secondary offering” in the tree while the simulator cannot select it.

**Out of scope for this PRD (explicit):** Reclassifying **stock dividend**, **return of capital**, or other families as voluntary—the inbox context notes jurisdictional nuance; implementation in a follow-up would need product sign-off.

---

## User Story

**As a** user walking the projection-gap simulator  
**I want to** choose **Secondary offering** and **Private placement** under the voluntary path  
**So that** the tool’s categories match how vendors frame **voluntary / participation-driven** events and the guidance I get is not limited to rights and tenders only.

---

## Design Specification

### Layout & Structure

1. **Simulator (`ProjectionGapSimulator`)**  
   - **Step 1 (Category):** Unchanged labels (“Mandatory” / “Voluntary”) unless copy tweaks are requested by Goop.  
   - **Step 2 (Event type):** When category is **Voluntary**, the selectable event list must include **four** families (order TBD; suggested: Rights issue, Tender or buyback, Secondary offering, Private placement)—driven entirely by `VOLUNTARY_FAMILIES` in taxonomy so UI stays in sync.

2. **Homepage decision tree (`src/app/page.tsx`)**  
   - **Voluntary** option sub-label must list the same voluntary surface the simulator exposes (add **private placement**; keep wording concise per `.cursorrules` measure guidance).  
   - Remove mismatch where the tree mentions events the simulator does not offer.

### Visual Design

- **No new palette:** Use existing semantic tokens (`text-muted-foreground`, `border-border`, `bg-card`, etc.).  
- **Typography / spacing:** Match existing simulator step cards (8pt grid, existing button/list patterns).  
- **Motion:** No new motion requirements; optional subtle existing Framer patterns only if already used in the step.

### Components

1. **Taxonomy layer** — `humanFamily()` labels for `secondary_offering` and `private_placement`; `FAMILY_TO_CLASS` and `VOLUNTARY_FAMILIES` updates.  
2. **Simulator** — No new visual component required if Step 2 remains a list of families from taxonomy; verify `coerceFamilyForCategory` when adding families.  
3. **Engine output** — New hypothesis branches for the two families (see Technical).

### States

- **Default:** All four voluntary families selectable; labels readable.  
- **Category switch:** Switching Mandatory → Voluntary coerces `eventFamily` to first allowed voluntary family (existing `coerceFamilyForCategory` behavior).  
- **Loading:** N/A (client-side).  
- **Empty:** N/A.  
- **Error:** Existing step validation only.

---

## Technical Specification

### Dependencies

- None (TypeScript + existing simulator modules only).

### File changes (implementation phase — not part of this PRD-only PR)

| Area | Path | Change |
|------|------|--------|
| Types | `src/lib/simulator/types.ts` | Extend `EventFamily` with `secondary_offering`, `private_placement`. |
| Taxonomy | `src/lib/simulator/taxonomy.ts` | `FAMILY_TO_CLASS`: both → `voluntary`. `VOLUNTARY_FAMILIES`: append both. `humanFamily()`: user-facing strings (“Secondary offering”, “Private placement” or title case per existing map style). |
| Engine | `src/lib/simulator/simulator-engine.ts` | Add hypothesis rules for both families per product rules below. Add `secondary_offering` and `private_placement` to `pilotFamilies` once dedicated rules exist so users do not see the generic “Broader reference may be needed” stub for these voluntary types. |
| UI | `src/components/projection-gap-simulator.tsx` | Confirm Step 2 reads from `familiesForClass`; adjust `canShowSubdetails` only if new families need sub-panels (inbox does not require sub-panels). |
| Marketing copy | `src/app/page.tsx` | Update Voluntary pill `sub` string to include private placement and align with simulator wording. |

### API / Data

- None.

### Hypothesis / engine behavior (product rules — validate against `/vendors/` in implementation)

**Secondary offering (`secondary_offering`)**

- Treat as **materiality-sensitive** and **free-float / share-count sensitive** (similar stress axis to M&A for “how much the float moves” narrative).  
- **Rule (from inbox):** If offering size is **≥ ~5% of market cap** (exact threshold for copy vs metrics TBD in implementation), bias toward **immediate adjustment** narratives; below threshold, bias toward **deferred / QIR** language.  
- Implementation should use existing **metrics** fields where possible or add a minimal numeric hint if the UI gains a field—**decision deferred to implementation PR** with Alex/Goop if a new metric is needed.

**Private placement (`private_placement`)**

- **Rule (from inbox):** **Material** events → immediate adjustment framing; **below materiality** → deferred to QIR framing.  
- Align wording with Step 4 materiality concepts already in the simulator copy.

**Existing branches**

- `rights` and `tender` logic remains; `tender` shares a generic hypothesis path with `other` and `delisting` in one branch—do not regress without explicit QA.

---

## Implementation Plan

1. Extend `EventFamily` and taxonomy maps; run `npx tsc --noEmit`.  
2. Add engine hypotheses + update `pilotFamilies` as agreed in implementation.  
3. Verify simulator Step 2 lists four voluntary options.  
4. Update homepage decision tree voluntary sub-label.  
5. `npm run lint`, manual browser pass on homepage + simulator.  
6. Merge to `main` → confirm Vercel deploy.

---

## Acceptance Criteria

- [ ] **Visual:** Simulator Step 2 under Voluntary shows **Rights issue**, **Tender or buyback**, **Secondary offering**, **Private placement**.  
- [ ] **Data model:** `VOLUNTARY_FAMILIES` includes all four; `FAMILY_TO_CLASS` marks each as `voluntary`.  
- [ ] **Engine:** Distinct hypothesis coverage for `secondary_offering` and `private_placement` (not only generic stub).  
- [ ] **Homepage:** Voluntary decision-tree sub-label matches simulator scope (includes private placement; no false promises).  
- [ ] **Quality:** `npm run lint` and `npx tsc --noEmit` pass.  
- [ ] **Deploy:** After merge to `main`, live site at https://corporate-action.vercel.app/ behaves as expected (`SPECS/HANDOFF-OPENCLAW-GOOP-VERCEL.md`).

---

## Verification Steps

1. `npm run dev` — no compile errors.  
2. `npx tsc --noEmit` — TypeScript passes.  
3. `npm run lint` — ESLint passes.  
4. Browser: homepage decision tree + simulator voluntary path.  
5. Commit and push → merge to `main` → **Vercel** production deploys.  
6. Confirm live at https://corporate-action.vercel.app/ (see `SPECS/VERCEL-MIGRATION.md`).

---

## Related

- Hosting truth: `SPECS/HANDOFF-OPENCLAW-GOOP-VERCEL.md`  
- Inbox feature spec: `SPECS/inbox/feature-taxonomy-voluntary.md`
