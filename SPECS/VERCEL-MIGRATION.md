# NEXT STEPS after Vercel import

## Step: Remove static export config

**File:** `next.config.ts`

**Current (GitHub Pages):**
```ts
const nextConfig: NextConfig = {
  output: "export",      // ← REMOVE THIS
  basePath: "/knowledge-hub",  // ← REMOVE THIS
  trailingSlash: true,
  images: { unoptimized: true },
}
```

**New (Vercel):**
```ts
const nextConfig: NextConfig = {
  // No output: "export" — enables serverless functions
  // No basePath — served from root (corporate-action.vercel.app)
  
  images: {
    // Allow image optimization on Vercel
    // unoptimized removed — Vercel handles this natively
  },
}
```

**What to do:**
1. Cursor commits this change
2. git push → Vercel auto-deploys
3. Verify serverless works with a simple test API route

**Test:** After deploy, check if `/api/test` route responds (will 404 if static export still on).

---

## Vercel MCP for Cursor

Cursor can use Vercel MCP to:
- Check deployment status
- View logs
- Manage environment variables
- Trigger new deployments

Cursor should `vercel dev` locally to test serverless functions before pushing.

---

*Prepared by Lil Claw — 2026-04-19*