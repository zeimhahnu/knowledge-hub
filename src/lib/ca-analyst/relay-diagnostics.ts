/**
 * Why the relay says `service_unavailable`.
 *
 * Four distinct causes collapsed into one silent client error: the env var
 * unset, a malformed URL, fetch throwing, or a non-403 upstream status. Vercel
 * encrypts env values, so STATUS could only ever confirm CA_ANALYST_SERVICE_URL
 * was PRESENT — a wrong value was unfalsifiable from outside, and cost a week of
 * guessing while the Analyst service itself sat healthy and idle.
 *
 * Framework-free on purpose (same shape as origin-boundary.ts): route.ts imports
 * it under Next, scripts/check-ca-analyst-relay-diagnostics.mjs imports it under
 * bare node. Anything importing next/server cannot be reached by the checks.
 */

/**
 * Host only — a service URL can carry a credential in userinfo, query or hash,
 * and this value goes to a log line. The host survives; the secret must not.
 */
export function upstreamHost(raw: string | undefined): string {
  if (!raw) return "<unset>";
  try {
    return new URL(raw).host || "<malformed>";
  } catch {
    return "<malformed>";
  }
}

/** Server-side only (Vercel function logs); never reaches the browser. */
export function relayFailure(reason: string): void {
  console.error(`[ca-analyst-relay] service_unavailable: ${reason}`);
}
