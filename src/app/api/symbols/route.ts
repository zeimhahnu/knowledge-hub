import { NextResponse } from "next/server";

import { YAHOO_USER_AGENT } from "@/lib/market-data/yahoo-chart";
import {
  mapYahooSuggestions,
  validateSymbolQuery,
} from "@/lib/symbol-search";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=1200";
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5_000;
const cache = new Map<string, { at: number; suggestions: ReturnType<typeof mapYahooSuggestions> }>();

/** Yahoo's undocumented public search endpoint is best-effort only. */
export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = validateSymbolQuery(rawQuery);
  if (!query) {
    return NextResponse.json(
      { error: "q must be between 1 and 40 characters", code: "INVALID_QUERY" },
      { status: 400 },
    );
  }

  const key = query.toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json({ suggestions: hit.suggestions }, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);

    const suggestions = mapYahooSuggestions(await response.json());
    cache.set(key, { at: now, suggestions });
    return NextResponse.json({ suggestions }, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch {
    // NO CDN caching on the failure path. CACHE_CONTROL is s-maxage=600, so
    // caching this would turn a momentary Yahoo blip into ten minutes of
    // "suggestions unavailable" for every visitor, long after the upstream
    // recovered. Successes are worth caching; an outage is not.
    return NextResponse.json({
      suggestions: [],
      warning: "Ticker suggestions are temporarily unavailable. You can still enter a symbol directly.",
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    clearTimeout(timeout);
  }
}
