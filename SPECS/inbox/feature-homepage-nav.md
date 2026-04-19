# Feature: Homepage Navigation — Vendor Reference & Investor Snapshot Links

> Status: SPEC INBOX
> Created: 2026-04-19
> Assigned to: Cursor
> Feature ID: `homepage-nav-redesign`

---

## Context

The homepage has two problems:

1. **Vendor Reference and Investor Snapshot are not easily accessible from the homepage.** Users have to scroll or know the URLs. They should work hand-in-hand with the simulator — after using the simulator, users should be directed to Vendor Thresholds (to check specifics) and Investor Snapshot (to check real-world history).

2. **"Projection Gap Simulator" button is not meaningful** — the simulator is already visible on the right side of the hero. The button just scrolls to it. Same problem with the "Decision tree" button.

---

## Changes Required

### 1. Replace Hero Buttons

**Before (2 generic buttons):**
- Button 1: "Projection gap simulator" → scrolls to simulator (redundant)
- Button 2: "Decision tree" → scrolls to decision tree section

**After (4 purpose-driven buttons):**

| Button | Label | Destination | Icon |
|--------|-------|-------------|------|
| 1 | Vendor thresholds | `/vendors/` | BookOpenIcon or ScaleIcon |
| 2 | Investor snapshot | `/investors/` | LineChartIcon or TrendingUpIcon |
| 3 | Decision tree | `#decision-tree` | CompassIcon or GitBranchIcon |
| 4 | Real scenarios | #real-scenarios section | LightbulbIcon |

### 2. Add Section Quick Links Below Simulator

Below the simulator (in the hero right column), add a compact link strip:

```
┌─────────────────────────────────────┐
│ Related tools                        │
│ 📊 Vendor Thresholds → /vendors/     │
│ 📈 Investor Snapshot → /investors/   │
│ 🌲 Decision Tree → #decision-tree    │
└─────────────────────────────────────┘
```

This makes the synergy obvious — simulator → vendor check → real data.

### 3. Rename "Decision Tree" Button

Change "Decision tree" to something more descriptive, e.g. **"Find divergence point"** or **"Walk the decision tree"**.

### 4. Navigation Bar (if exists)

Check if there's a top nav. If so, ensure clear links to `/vendors/` and `/investors/`.

---

## Implementation Notes

- Keep the simulator in the hero (right column) as-is
- The 4 hero buttons should be styled as secondary actions (border style, not filled primary) to keep focus on the simulator
- The "Related tools" strip below simulator should be subtle — small text, horizontal layout
- Framer Motion for button hover animations (subtle scale + border glow)
- Mobile: stack buttons 2×2 grid

---

## Acceptance Criteria

- [ ] Hero shows 4 buttons: Vendor Thresholds, Investor Snapshot, Decision Tree, Real Scenarios
- [ ] "Related tools" strip appears below simulator in hero
- [ ] "Decision tree" button label changed to more descriptive text
- [ ] All links functional (correct URLs)
- [ ] Mobile responsive (2×2 button grid)
- [ ] TypeScript + ESLint clean
- [ ] Deployed to Vercel
