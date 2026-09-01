import { NextResponse } from "next/server";

import { validateNews } from "@/lib/news-validation";

/**
 * GET /api/news?ticker=&eventType=&exDate=&companyName=
 *
 * News cross-validation (§8 of the revamp spec). The user supplies a KNOWN
 * event; the route searches the current web for an announcement that
 * confirms or contradicts it and returns a dated, cited verdict.
 *
 * Honest degradation (D3): when the search backend is unconfigured (no
 * TAVILY_API_KEY) or unreachable, `validationRan` is false and we return
 * 503 with a `warning` — never a confirmation that was not fetched.
 */
const SUCCESS_CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=1200";
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

const TICKER_RE = /^[A-Z0-9.\-^=]{1,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function jsonError(message: string, code: string) {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();
  const eventType = (searchParams.get("eventType") ?? "").trim();
  const exDate = (searchParams.get("exDate") ?? "").trim();
  const companyName = (searchParams.get("companyName") ?? "").trim();

  if (!ticker) return jsonError("Missing ticker", "MISSING_TICKER");
  if (!TICKER_RE.test(ticker)) {
    return jsonError("Invalid ticker symbol", "INVALID_TICKER");
  }
  if (!eventType) return jsonError("Missing eventType", "MISSING_EVENT_TYPE");
  if (eventType.length > 80) {
    return jsonError("eventType too long", "EVENT_TYPE_TOO_LONG");
  }
  if (!exDate) return jsonError("Missing exDate", "MISSING_EX_DATE");
  if (!isValidDate(exDate)) {
    return jsonError("exDate must be a valid YYYY-MM-DD date", "INVALID_EX_DATE");
  }

  const key = `${ticker}|${eventType.toLowerCase()}|${exDate}|${companyName.toLowerCase()}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, {
      headers: { "Cache-Control": SUCCESS_CACHE_CONTROL },
    });
  }

  const result = await validateNews({
    ticker,
    companyName: companyName.length > 0 ? companyName : undefined,
    eventType,
    exDate,
  });

  // Validation could not run: 503 + explicit warning (anti-hallucination D3).
  if (!result.validationRan) {
    return NextResponse.json(result, { status: 503 });
  }

  cache.set(key, { at: now, body: result });
  return NextResponse.json(result, {
    headers: { "Cache-Control": SUCCESS_CACHE_CONTROL },
  });
}