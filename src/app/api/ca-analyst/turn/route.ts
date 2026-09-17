import { NextResponse } from "next/server";
import { accessJwtFromHeaders, verifyAccessJwt } from "../../../../lib/ca-analyst/auth";
import { relayFailure, upstreamHost } from "../../../../lib/ca-analyst/relay-diagnostics";
import { validRequest } from "../../../../lib/ca-analyst/validate-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 120_000;
const ACCESS_JWKS_FALLBACK_URL = "https://hub.vpszeimhahnu.uk/cdn-cgi/access/certs";
function error(code: "invalid_request" | "access_required" | "service_unavailable") {
  const status = code === "access_required" ? 403 : code === "invalid_request" ? 400 : 503;
  return NextResponse.json({ type: "error", code, message: code === "access_required" ? "Access identity required" : code === "invalid_request" ? "Invalid request" : "Analyst service unavailable", retryable: code === "service_unavailable" }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let assertion: string | null;
  try {
    assertion = accessJwtFromHeaders(request.headers);
    await verifyAccessJwt(assertion, { jwksFallbackUrl: ACCESS_JWKS_FALLBACK_URL });
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
  if (!validRequest(payload)) return error("invalid_request");
  if (!process.env.CA_ANALYST_SERVICE_URL) {
    relayFailure("CA_ANALYST_SERVICE_URL is unset");
    return error("service_unavailable");
  }
  const host = upstreamHost(process.env.CA_ANALYST_SERVICE_URL);
  try {
    // Cloudflare linked-app-token handoff: forward the user JWT as cf-access-token.
    // Access validates it against the linked-app rule, then mints a NEW
    // cf-access-jwt-assertion scoped to App B AUD for the origin.
    // Renaming this to cf-access-jwt-assertion breaks it (see revert of 407337f).
    const upstream = await fetch(`${process.env.CA_ANALYST_SERVICE_URL.replace(/\/$/, "")}/v1/turn`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-access-token": assertion as string, accept: "text/event-stream" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) {
      // 403 is Access doing its job and already maps to a distinct client code,
      // so it is not a mystery worth logging. Everything else is.
      if (upstream.status !== 403) {
        relayFailure(`upstream ${host} returned ${upstream.status}${upstream.body ? "" : " with no body"}`);
      }
      return error(upstream.status === 403 ? "access_required" : "service_unavailable");
    }
    return new Response(upstream.body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch (cause) {
    // DNS failure, TLS failure, a malformed URL reaching fetch, or a timeout.
    relayFailure(`fetch to ${host} threw ${cause instanceof Error ? cause.name : "unknown"}`);
    return error("service_unavailable");
  }
}

