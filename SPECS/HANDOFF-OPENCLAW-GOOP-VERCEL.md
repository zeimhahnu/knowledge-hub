# Handoff: OpenClaw / Goop — hosting & where to read next

**Read this file first** when picking up the knowledge-hub repo after the 2026-04 hosting move.

## Current truth (do not contradict in new specs)

| Topic | Fact |
|--------|------|
| **Production app** | https://corporate-action.vercel.app/ |
| **Deploy trigger** | Merge (or push) to `main` on GitHub → **Vercel** builds and deploys the Next.js app |
| **GitHub Actions** | **CI only** on `main` — `npm ci`, lint, `tsc`, `npm run build` (`.github/workflows/deploy.yml`). It does **not** publish a static site. |
| **Next config** | `next.config.ts` must **not** use `output: "export"` or `basePath: "/knowledge-hub"` — that was the old GitHub Pages static export. Restoring those **breaks** serverless Route Handlers on Vercel. |
| **Smoke check** | `GET https://corporate-action.vercel.app/api/test/` → JSON `{"ok":true,"source":"serverless"}`. If that 404s or returns static HTML, something reverted to static export. |

## Canonical docs (read order)

1. **`SPECS/VERCEL-MIGRATION.md`** — What changed, checklist, old vs new `next.config.ts`.
2. **`README.md`** — Deployment section (Vercel + CI).
3. **`.cursorrules`** — Live URL + handoff diagram (must say Vercel, not GitHub Pages).

## For new features / PRDs

- Use **paths from site root** (e.g. `/vendors/`, `/investors/`). There is **no** `basePath` in production.
- In verification steps, say **merge to `main` → confirm on Vercel**, not “GitHub Pages deploys”.
- If a feature needs **Python subprocess / yfinance on disk**, that is **not** assumed to work inside Vercel’s default Node function — call that out and choose an external API or worker (see `SPECS/outbox/investor-intelligence-browser-prd.md`).

## Legacy URL

**https://zeimhahnu.github.io/knowledge-hub/** may still exist as an old static mirror or 404; **product decisions and QA use the Vercel URL above.**

---

*Session handoff — Cursor — 2026-04-19*
