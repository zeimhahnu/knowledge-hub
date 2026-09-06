import { NextResponse } from "next/server";
import { verifyAccessJwt } from "../../../../lib/ca-analyst/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VENDORS = new Set(["ftse-russell", "msci", "sp-dji", "nasdaq", "stoxx", "solactive", "bloomberg"]);
const STATES = new Set(["covered", "not-yet-due", "missing", "not-assessed", "not-applicable"]);
const PROVENANCE = new Set(["measured", "news-confirmed", "inferred", "no-rule"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY = 120_000;
const ownKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const boundedString = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function validDate(value: unknown) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validRequest(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (!ownKeys(request, ["lookup", "question", "requestDeepReasoning"]) || !boundedString(request.question, 1200)) return false;
  if (request.requestDeepReasoning !== undefined && typeof request.requestDeepReasoning !== "boolean") return false;
  const lookup = request.lookup;
  if (!lookup || typeof lookup !== "object" || Array.isArray(lookup)) return false;
  const l = lookup as Record<string, unknown>;
  if (!ownKeys(l, ["ticker", "eventType", "exDate", "selectedVendors", "matrixRows", "news"]) ||
      !boundedString(l.ticker, 15) || !boundedString(l.eventType, 64) || !validDate(l.exDate)) return false;
  if (!Array.isArray(l.selectedVendors) || l.selectedVendors.length > 7 || l.selectedVendors.some((v) => typeof v !== "string" || !VENDORS.has(v))) return false;
  if (!Array.isArray(l.matrixRows) || l.matrixRows.length > 7 || l.matrixRows.some((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return true;
    const r = row as Record<string, unknown>;
    return !ownKeys(r, ["vendor", "state", "provenance", "ruleRefs"]) || typeof r.vendor !== "string" || !VENDORS.has(r.vendor) ||
      typeof r.state !== "string" || !STATES.has(r.state) || typeof r.provenance !== "string" || !PROVENANCE.has(r.provenance) ||
      !Array.isArray(r.ruleRefs) || r.ruleRefs.length > 8 || r.ruleRefs.some((ref) => !boundedString(ref, 100));
  })) return false;
  const news = l.news;
  if (!news || typeof news !== "object" || Array.isArray(news)) return false;
  const n = news as Record<string, unknown>;
  if (!ownKeys(n, ["validationRan", "verdict", "confidence", "warning", "sources"]) || typeof n.validationRan !== "boolean" ||
      !["confirmed", "contradicted", "unverified"].includes(String(n.verdict)) || !["high", "medium", "low"].includes(String(n.confidence)) ||
      (n.warning !== undefined && !boundedString(n.warning, 300)) || !Array.isArray(n.sources) || n.sources.length > 8 ||
      n.sources.some((source) => !source || typeof source !== "object" || Array.isArray(source) || !ownKeys(source as Record<string, unknown>, ["url", "title", "publishedAt"]) ||
        !boundedString((source as Record<string, unknown>).url, 500) || !/^https:\/\//.test((source as Record<string, unknown>).url as string) ||
        !boundedString((source as Record<string, unknown>).title, 200) || !boundedString((source as Record<string, unknown>).publishedAt, 80))) return false;
  return n.validationRan || n.sources.length === 0;
}

function error(code: "invalid_request" | "access_required" | "service_unavailable") {
  const status = code === "access_required" ? 403 : code === "invalid_request" ? 400 : 503;
  return NextResponse.json({ type: "error", code, message: code === "access_required" ? "Access identity required" : code === "invalid_request" ? "Invalid request" : "Analyst service unavailable", retryable: code === "service_unavailable" }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let assertion: string | null;
  try {
    assertion = request.headers.get("cf-access-jwt-assertion");
    await verifyAccessJwt(assertion);
  } catch {
    return error("access_required");
  }
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return error("invalid_request");
    payload = JSON.parse(text);
  } catch {
    return error("invalid_request");
  }
  if (!validRequest(payload) || !process.env.CA_ANALYST_SERVICE_URL) return error(!validRequest(payload) ? "invalid_request" : "service_unavailable");
  try {
    const upstream = await fetch(`${process.env.CA_ANALYST_SERVICE_URL.replace(/\/$/, "")}/v1/turn`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-access-token": assertion as string, accept: "text/event-stream" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) return error(upstream.status === 403 ? "access_required" : "service_unavailable");
    return new Response(upstream.body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return error("service_unavailable");
  }
}

export { validRequest };
