import { NextResponse } from "next/server";

import { searchSymbols } from "@/lib/investors/yahoo-finance";

const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=1200";
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 1) {
    return NextResponse.json({ results: [] }, { headers: { "Cache-Control": CACHE_CONTROL } });
  }
  if (q.length > 40) {
    return NextResponse.json(
      { error: "Query too long", code: "TOO_LONG" },
      { status: 400 },
    );
  }

  const key = q.toLowerCase();
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    return NextResponse.json(hit.body, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  const results = await searchSymbols(q, 10);
  const body = { results };
  cache.set(key, { at: now, body });

  return NextResponse.json(body, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
