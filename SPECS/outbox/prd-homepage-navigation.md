# PRD: Homepage Navigation — Vendor Thresholds & Investor Snapshot

> Status: **DRAFT** — Pending Alex approval  
> Created: 2026-04-19  
> Created by: Cursor Agent  
> Source spec: `SPECS/inbox/feature-homepage-nav.md`  
> Feature ID: `homepage-nav-redesign`

---

## Executive Summary

The homepage **hero** currently emphasizes two **in-page scroll** actions (“Projection gap simulator” and “Decision tree”) even though the **simulator already sits in the hero** on large screens—so the primary CTA is redundant. **Vendor thresholds** (`/vendors/`) and **Investor snapshot** (`/investors/`) exist elsewhere on the page (footer-style links) but are not obvious from the hero, breaking the intended flow: **hypothesize in the simulator → validate against vendor rules → spot-check real ticker history**.

This PRD specifies **four purpose-driven hero actions**, a **compact “Related tools” strip** under the simulator in the right column, clearer **decision-tree** labeling, and an explicit decision on **global navigation** (today there is **no** site-wide header—`src/app/layout.tsx` renders `{children}` only).

---

## User Story

**As a** first-time visitor on the homepage  
**I want** prominent paths to **vendor methodology**, **investor snapshot**, the **divergence decision tree**, and **real scenarios**  
**So that** I can move from the simulator to the right next tool without hunting the page or memorizing URLs.

---

## Design Specification

### Layout & Structure

1. **Hero left column** (`src/app/page.tsx`, hero `<section>`)  
   - Replace the current **two** `<button>` scroll targets (lines ~191–212) with **four** actions:
     | # | Label (final copy with Goop) | Behavior | Icon (Lucide) |
     |---|-------------------------------|----------|----------------|
     | 1 | Vendor thresholds (or “Vendor reference”) | `next/link` → `/vendors/` | `BookOpenIcon` or `Scale` |
     | 2 | Investor snapshot | `next/link` → `/investors/` | `LineChartIcon` or `TrendingUp` |
     | 3 | Find divergence point (or “Walk the decision tree”) | scroll → `#decision-tree` | `CompassIcon` or `GitBranch` |
     | 4 | Real scenarios | scroll → `#real-scenarios` | `LightbulbIcon` |

2. **Hero right column** (wrap or extend the column that contains `<ProjectionGapSimulator />`)  
   - **After** the simulator card, add a **“Related tools”** strip: small label + text links (or compact buttons) for `/vendors/`, `/investors/`, `#decision-tree`.  
   - Use **semantic** styling only (`text-muted-foreground`, `border-border`, `hover:text-foreground`)—no emoji in production UI unless product explicitly wants them (inbox sketch used emoji; default to **Lucide icons + text** for consistency with the rest of the app).

3. **Real scenarios section**  
   - The inbox references `#real-scenarios`; the live section **does not** expose that `id` today (section starts ~line 224). **Add** `id="real-scenarios"` on the Real Scenarios `<section>` (or its first heading wrapper) so the fourth hero button has a stable anchor.

4. **Decision tree section**  
   - Already has `id="decision-tree"`. The **in-page heading** is already “Find the Divergence Point”; align the **hero button label** with that voice (avoid duplicating the word “tree” twice if we pick “Find divergence point”).

5. **Global navigation**  
   - **Current:** No top nav bar.  
   - **PRD decision:** Either (A) **defer** global nav and satisfy the inbox only via hero + related strip, or (B) add a **minimal** sticky/header row in `layout.tsx` or a shared `SiteHeader` with Home, Vendors, Investors—**requires Alex/Goop** because it affects every route. **Default for implementation:** **(A)** unless Goop supplies a header design.

### Visual Design

- **Hero CTAs:** Inbox asks for **secondary** treatment (border style, not filled primary) so the **simulator remains the visual focus**. Today the first button uses **`bg-primary`**; the redesign should **demote** all four to `variant="outline"` / border cards or equivalent, with **at most one** soft primary accent if needed for hierarchy.  
- **Touch targets:** Minimum **44×44px** interactive padding (`.cursorrules` / Fitts).  
- **Responsive:** **2×2 grid** on small viewports for the four actions; horizontal wrap or single column where needed.  
- **Motion:** Subtle **Framer Motion** on hover (scale ~1.02, border emphasis)—respect `useReducedMotion` where new motion is added.

### Components

- Prefer **local composition** in `page.tsx` first; extract a `HeroQuickLinks` or `RelatedToolsStrip` component only if the file grows unwieldy (keep **one component per file** if extracted).

### States

- **Default:** Links and scroll targets work from first paint.  
- **Keyboard:** Scroll buttons remain real `<button type="button">` with visible focus rings; route links use `Link`.  
- **Reduced motion:** Optional scale disabled when `prefers-reduced-motion`.

---

## Technical Specification

### Dependencies

- None new (Framer Motion and Lucide already in use on the page).

### File changes

| Path | Change |
|------|--------|
| `src/app/page.tsx` | Hero button row; optional `RelatedToolsStrip`; add `id="real-scenarios"`; import any new Lucide icons. |
| `src/app/layout.tsx` | **Only if** global nav option (B) is approved—add shared header component. |

### API / Data

- None.

---

## Implementation Plan

1. Add `id="real-scenarios"` to the Real Scenarios section.  
2. Replace hero buttons with four actions (two `Link`, two scroll `button`).  
3. Add “Related tools” strip under `ProjectionGapSimulator` in the hero grid.  
4. Tune labels with Goop; verify mobile 2×2 and focus styles.  
5. `npm run lint` / `npx tsc --noEmit`; browser QA on `/`.  
6. Merge to `main` → Vercel.

---

## Acceptance Criteria

- [ ] Hero shows **four** actions: Vendor thresholds → `/vendors/`, Investor snapshot → `/investors/`, Decision path → `#decision-tree`, Real scenarios → `#real-scenarios`.  
- [ ] **Related tools** strip appears **below the simulator** in the hero right column.  
- [ ] Decision-tree control uses a **more descriptive** label than the current “Decision tree” button.  
- [ ] All targets resolve (including **`#real-scenarios`**).  
- [ ] **Mobile:** four actions usable in a **2×2** (or agreed alternative) without overlap.  
- [ ] **Accessibility:** focus-visible, sufficient contrast, meaningful link/button names.  
- [ ] `npm run lint` and `npx tsc --noEmit` pass.  
- [ ] Deployed to **Vercel** after merge to `main` (`SPECS/HANDOFF-OPENCLAW-GOOP-VERCEL.md`).

---

## Verification Steps

1. `npm run dev` — homepage loads.  
2. Click each hero action — correct route or scroll target.  
3. Resize to mobile width — grid and strip remain usable.  
4. `npm run lint`, `npx tsc --noEmit`.  
5. Merge to `main` → confirm https://corporate-action.vercel.app/

---

## Related

- Inbox: `SPECS/inbox/feature-homepage-nav.md`  
- Hosting: `SPECS/HANDOFF-OPENCLAW-GOOP-VERCEL.md`
