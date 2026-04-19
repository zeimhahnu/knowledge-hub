# PRD: [Feature Name]

> Status: DRAFT — Pending Alex approval
> Created: YYYY-MM-DD
> Created by: Cursor Agent

---

## Executive Summary
[2-3 sentence description of what this feature does and why it matters for the knowledge hub]

## User Story
**As a** [type of user]
**I want to** [action]
**So that** [benefit]

## Design Specification

### Layout & Structure
[Describe the page layout, component placement, responsive strategy]

### Visual Design
- **Color palette:** [colors from design-system.md]
- **Typography:** [font sizes, weights]
- **Spacing:** [spacing tokens]
- **Motion:** [animations, transitions]

### Components
List each component to be built/modified:
1. **ComponentName** — purpose, states (default, hover, active, disabled, loading)

### States
- Default:
- Hover:
- Active:
- Loading:
- Empty:
- Error:

## Technical Specification

### Dependencies
- [List any new packages, e.g., framer-motion]

### File Changes
- `src/components/` — new/edit files
- `src/app/` — page routes
- `src/lib/` — utilities

### API / Data
[If the feature fetches data — describe the source, schema]

## Implementation Plan
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Acceptance Criteria
- [ ] Visual: [what it looks like]
- [ ] Functional: [what it does]
- [ ] Responsive: [breakpoints]
- [ ] Accessible: [keyboard nav, ARIA]
- [ ] Performance: [no layout shift, fast load]

## Verification Steps
1. Run `npm run dev` — confirm no errors
2. `npx tsc --noEmit` — TypeScript passes
3. `npm run lint` — ESLint passes
4. Browser test at localhost:3000
5. Git commit and push → merge to `main` → **Vercel** production deploys
6. Confirm live at https://corporate-action.vercel.app/ (see `SPECS/VERCEL-MIGRATION.md`)
