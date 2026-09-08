import { createHash, createPublicKey, createVerify } from "node:crypto";

export type AccessClaims = {
  sub: string;
  email?: string;
  iss: string;
  aud: string | string[];
  exp: number;
  nbf?: number;
  jti?: string;
};

type Jwk = JsonWebKey & { kid?: string; alg?: string; kty?: string };
type Jwks = { keys?: Jwk[] };

export type AccessFailureCode = "CA01" | "CA02" | "CA03" | "CA04" | "CA05" | "CA06" | "CA07";

function accessFailure(code: AccessFailureCode): never {
  throw new Error(code);
}

export function accessFailureCode(error: unknown): AccessFailureCode | "CA00" {
  const code = error instanceof Error ? error.message : "";
  return /^CA0[1-7]$/.test(code) ? code as AccessFailureCode : "CA00";
}

const replayCache = new Map<string, number>();
const MAX_REPLAY_ENTRIES = 10_000;
const ACCESS_COOKIE = "CF_Authorization=";

/**
 * Select Cloudflare Access's signed application token without trusting any
 * client-supplied identity fields. The origin assertion header is canonical;
 * the signed Access cookie is the fallback used when an upstream omits it.
 */
export function accessJwtFromHeaders(headers: Headers): string | null {
  const assertion = headers.get("cf-access-jwt-assertion");
  if (assertion?.trim()) return assertion;
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";")) {
    const candidate = cookie.trimStart();
    if (candidate.startsWith(ACCESS_COOKIE)) return candidate.slice(ACCESS_COOKIE.length);
  }
  return null;
}

function decodePart(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function audienceMatches(aud: string | string[], expected: string) {
  return Array.isArray(aud) ? aud.includes(expected) : aud === expected;
}

export function clearAccessReplayCache() {
  replayCache.clear();
}

export async function verifyAccessJwt(
  token: string | null | undefined,
  config: { jwksUrl?: string; jwksFallbackUrl?: string; issuer?: string; audience?: string; now?: number; consumeReplay?: boolean } = {},
): Promise<AccessClaims> {
  const jwksUrl = config.jwksUrl ?? process.env.CA_ACCESS_JWKS_URL;
  const issuer = config.issuer ?? process.env.CA_ACCESS_ISSUER;
  const audience = config.audience ?? process.env.CA_ACCESS_AUDIENCE;
  if (!jwksUrl || !issuer || !audience) accessFailure("CA01");
  if (!token) accessFailure("CA02");
  const pieces = token.split(".");
  if (pieces.length !== 3) accessFailure("CA03");
  let header: { alg?: string; kid?: string };
  let claims: AccessClaims;
  try {
    header = decodePart(pieces[0]) as typeof header;
    claims = decodePart(pieces[1]) as AccessClaims;
  } catch {
    accessFailure("CA03");
  }
  if (header.alg !== "RS256" || !header.kid || typeof claims.sub !== "string" || !claims.sub ||
      typeof claims.iss !== "string" || typeof claims.aud !== "string" && !Array.isArray(claims.aud) ||
      claims.iss !== issuer || !audienceMatches(claims.aud, audience) ||
      !Number.isFinite(claims.exp) || claims.exp <= (config.now ?? Date.now() / 1000) ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > (config.now ?? Date.now() / 1000)))) {
    accessFailure("CA04");
  }
  let jwks: Jwks | undefined;
  for (const url of [...new Set([jwksUrl, config.jwksFallbackUrl].filter((value): value is string => Boolean(value)))]) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!response.ok) continue;
      jwks = (await response.json()) as Jwks;
      break;
    } catch {
      // Try the same official Access keys through the protected app hostname.
    }
  }
  if (!jwks) accessFailure("CA05");
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA" && (!key.alg || key.alg === "RS256"));
  if (!jwk) accessFailure("CA06");
  let valid = false;
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${pieces[0]}.${pieces[1]}`);
    verifier.end();
    valid = verifier.verify(createPublicKey({ key: jwk as unknown as import("node:crypto").JsonWebKey, format: "jwk" }), Buffer.from(pieces[2], "base64url"));
  } catch {
    valid = false;
  }
  if (!valid) accessFailure("CA07");
  // Replay detection needs a PER-REQUEST nonce. Cloudflare Access assertions carry no jti,
  // so the fingerprint fallback is stable for the whole session: consuming it rejected the
  // SECOND request of every session with CA07, which reads to the user as a login failure.
  // (middleware.ts already passes consumeReplay:false; this route did not, so the route
  // consumed the token the middleware had just accepted.) Enforce only with a real jti.
  const nonce = typeof claims.jti === "string" && claims.jti ? claims.jti : null;
  if (config.consumeReplay !== false && nonce) {
    const fingerprint = `jti:${nonce}`;
    const now = config.now ?? Date.now() / 1000;
    for (const [key, expiry] of replayCache) if (expiry <= now) replayCache.delete(key);
    if (replayCache.has(fingerprint)) accessFailure("CA07");
    if (replayCache.size >= MAX_REPLAY_ENTRIES) {
      const oldest = replayCache.keys().next().value;
      if (oldest) replayCache.delete(oldest);
    }
    replayCache.set(fingerprint, claims.exp);
  }
  return claims;
}
