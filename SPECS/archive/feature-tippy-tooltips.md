# Feature: Inline Hover Tooltips (Tippy.js)

> Status: SPEC INBOX
> Created: 2026-04-19
> Assigned to: Cursor
> Feature ID: `tippy-tooltips-v1`

---

## Context

Jargon terms throughout the site (Ex-Dividend, PAF, TR/NTR, Divisor, etc.) are plain text with no explanation. Users hover over a term and see nothing. The spec calls for inline hover tooltips using Tippy.js.

---

## Implementation

### 1. Install Tippy.js

```bash
npm install @tippyjs/react
```

### 2. Add TippyProvider

Wrap the app in `app/layout.tsx` with `<TippyProvider>` from `@tippyjs/react`.

### 3. Create `<GlossaryTerm>` component

File: `src/components/ui/glossary-term.tsx`

```tsx
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'

interface Props {
  term: string
  definition: string
  children: React.ReactNode
}

export function GlossaryTerm({ term, definition, children }: Props) {
  return (
    <Tippy
      content={
        <div className="max-w-[220px]">
          <p className="font-semibold text-[13px] mb-1">{term}</p>
          <p className="text-[12px] leading-relaxed opacity-90">{definition}</p>
        </div>
      }
      placement="top"
      duration={200}
      delay={[200, 0]}
      theme="knowledge-hub"
    >
      <span className="border-b border-dotted border-muted-foreground/50 cursor-help">
        {children}
      </span>
    </Tippy>
  )
}
```

### 4. Override Tippy dark theme

Add to `src/app/globals.css`:

```css
.tippy-box {
  background: oklch(0.2 0.02 250);
  color: #f0f0f0;
  border-radius: 12px;
  font-size: 13px;
}
.tippy-content {
  padding: 8px 12px;
}
.tippy-arrow {
  color: oklch(0.2 0.02 250);
}
```

### 5. Tag these terms site-wide

| Term | Definition |
|------|-----------|
| PAF | Price Adjustment Factor — theoretical ex-date price after a corporate action. `PAF = (CumPrice - Distribution) / CumPrice` |
| Divisor | Scaling number keeping index level continuous when market cap changes. `Index = TotalMarketCap / Divisor` |
| PR | Price Return index — price changes only, no dividend reinvestment |
| TR | Total Return index — price changes + gross dividends reinvested |
| NTR | Net Total Return — dividends reinvested net of withholding tax |
| GR | Gross Total Return — TR before withholding tax |
| Ex-Date | First day shares trade WITHOUT the dividend/right/entitlement |
| Free Float | Shares available for public trading (excludes strategic/promoter holdings) |
| QIR | Quarterly Index Review — scheduled rebalance (Jan/Mar/Jun/Sep) |
| ITM | In-the-Money — rights subscription price below current market price |
| OTM | Out-of-the-Money — rights subscription price at or above market price |
| Spin-off | Company separates a business unit into a new standalone entity |
| Tender Offer | Public offer to buy shares directly from shareholders at a premium |
| Placeholder Price | Temporary price used when real market price is not yet available |
| Artificial Price | STOXX price when target is not trading at deletion — based on acquisition terms |
| Special Dividend | Non-recurring cash distribution from accumulated profits or asset sales |
| Rights Issue | Existing shareholders subscribe for new shares at a discount |
| Bonus Issue | Free additional shares issued to all existing shareholders |

### 6. Apply to these pages/components

- `src/app/vendors/page.tsx` — threshold tables, adjustment descriptions
- `src/app/page.tsx` — homepage scenario descriptions (step tooltips)
- `src/components/projection-gap-simulator.tsx` — event type labels, metric descriptions
- `src/app/vendors/event-extraction/page.tsx` — raw field labels

### 7. Accessibility

- `tabIndex={0}` on the wrapper span so keyboard users can focus
- `aria-describedby` referencing tooltip content
- Do NOT use only color to indicate interactive — the dotted border is sufficient

---

## Acceptance Criteria

- [ ] `npm install @tippyjs/react` succeeds
- [ ] `<TippyProvider>` wraps app in `layout.tsx`
- [ ] `<GlossaryTerm>` component created in `src/components/ui/glossary-term.tsx`
- [ ] Dark tooltip theme applied (oklch dark background, white text)
- [ ] All 17 terms tagged with `<GlossaryTerm>` in vendor page
- [ ] 200ms delay, fade animation
- [ ] Keyboard accessible (tab to term, Enter to show tooltip)
- [ ] TypeScript compiles, ESLint passes
- [ ] Merge to `main` → Vercel production deploys (see `SPECS/HANDOFF-OPENCLAW-GOOP-VERCEL.md`)
