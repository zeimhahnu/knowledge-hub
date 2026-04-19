# Vercel migration — status

**Completed (2026-04-19):**

- [x] Vercel project linked to this repo
- [x] `next.config.ts`: removed `output: "export"` and `basePath` (see merged PR #4)
- [x] Production deploy verified: `/api/test/` returns JSON (`serverless` path works)
- [x] GitHub Actions: CI on `main` (lint + typecheck + build); GitHub Pages static upload removed

**Production URL:** https://corporate-action.vercel.app/

---

## Reference: what changed (GitHub Pages → Vercel)

### Old (`next.config.ts` for GitHub Pages)

```ts
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/knowledge-hub",
  trailingSlash: true,
  images: { unoptimized: true },
}
```

### New (Vercel)

```ts
const nextConfig: NextConfig = {
  // No output: "export" — enables Route Handlers / serverless functions
  // No basePath — served from deployment root
  trailingSlash: true,
}
```

Next.js **image optimization** uses the default on Vercel (no `images.unoptimized` needed).

**Smoke test:** `GET /api/test/` should return `{"ok":true,"source":"serverless"}`. If you still see static-export behavior, `output: "export"` is still set somewhere.

---

## Vercel MCP for Cursor

Cursor can use Vercel MCP to:

- Check deployment status
- View logs
- Manage environment variables
- Trigger new deployments

Use `vercel dev` locally to exercise Route Handlers before pushing.

---

*Prepared by Lil Claw — 2026-04-19*
