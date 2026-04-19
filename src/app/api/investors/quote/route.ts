import { NextResponse } from "next/server";

import { buildInvestorPayload, normalizeTicker } from "@/lib/investors/yahoo-finance";

/** CDN + browser hint; origin still dedupes with in-process TTL below. */
const SUCCESS_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=600";

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

function jsonOk(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": SUCCESS_CACHE_CONTROL },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ticker") ?? "";
  const key = normalizeTicker(raw);

  if (!key) {
    return NextResponse.json(
      { error: "Missing ticker", code: "MISSING" },
      { status: 400 },
    );
  }

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return jsonOk(hit.body);
  }

  try {
    const body = await buildInvestorPayload(raw);
    cache.set(key, { at: now, body });
    return jsonOk(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "INVALID_TICKER") {
      return NextResponse.json(
        { error: "Invalid ticker symbol", code: "INVALID_TICKER" },
        { status: 400 },
      );
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Symbol not found or no data", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Upstream data unavailable", code: "UPSTREAM" },
      { status: 502 },
    );
  }
}
