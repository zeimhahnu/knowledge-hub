import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { verifyAccessJwt } from "./lib/ca-analyst/auth";

export const config = {
  matcher: ["/upload", "/api/ingest", "/api/ca-analyst/:path*"],
  runtime: "nodejs",
};

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isAuthorized(authorization: string | null, expected: string | undefined) {
  if (!expected) return false;
  const supplied = authorization?.startsWith("Basic ")
    ? Buffer.from(authorization.slice(6), "base64").toString()
    : "";
  return safeEqual(supplied, expected);
}

export function contentLengthStatus(value: string | null, limit: number): 413 | null {
  const length = Number(value ?? "0");
  return length > limit ? 413 : null;
}

export async function middleware(request: NextRequest) {
  const { NextResponse } = await import("next/server");
  if (request.nextUrl.pathname.startsWith("/api/ca-analyst/")) {
    try {
      await verifyAccessJwt(request.headers.get("cf-access-jwt-assertion"), { consumeReplay: false });
      return NextResponse.next();
    } catch {
      return new NextResponse(JSON.stringify({ type: "error", code: "access_required", message: "Access identity required", retryable: false }), {
        status: 403,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
  }
  if (!isAuthorized(request.headers.get("authorization"), process.env.INGEST_BASIC_AUTH)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="ca-hub-ingest"' },
    });
  }
  return NextResponse.next();
}
