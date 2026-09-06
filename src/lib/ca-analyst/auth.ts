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

const replayCache = new Map<string, number>();
const MAX_REPLAY_ENTRIES = 10_000;

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
  config: { jwksUrl?: string; issuer?: string; audience?: string; now?: number; consumeReplay?: boolean } = {},
): Promise<AccessClaims> {
  const jwksUrl = config.jwksUrl ?? process.env.CA_ACCESS_JWKS_URL;
  const issuer = config.issuer ?? process.env.CA_ACCESS_ISSUER;
  const audience = config.audience ?? process.env.CA_ACCESS_AUDIENCE;
  if (!token || !jwksUrl || !issuer || !audience) throw new Error("access_required");
  const pieces = token.split(".");
  if (pieces.length !== 3) throw new Error("access_required");
  let header: { alg?: string; kid?: string };
  let claims: AccessClaims;
  try {
    header = decodePart(pieces[0]) as typeof header;
    claims = decodePart(pieces[1]) as AccessClaims;
  } catch {
    throw new Error("access_required");
  }
  if (header.alg !== "RS256" || !header.kid || typeof claims.sub !== "string" || !claims.sub ||
      claims.iss !== issuer || !audienceMatches(claims.aud, audience) ||
      !Number.isFinite(claims.exp) || claims.exp <= (config.now ?? Date.now() / 1000) ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > (config.now ?? Date.now() / 1000)))) {
    throw new Error("access_required");
  }
  const response = await fetch(jwksUrl, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error("access_required");
  const jwks = (await response.json()) as Jwks;
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new Error("access_required");
  let valid = false;
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${pieces[0]}.${pieces[1]}`);
    verifier.end();
    valid = verifier.verify(createPublicKey({ key: jwk as unknown as import("node:crypto").JsonWebKey, format: "jwk" }), Buffer.from(pieces[2], "base64url"));
  } catch {
    valid = false;
  }
  if (!valid) throw new Error("access_required");
  if (config.consumeReplay !== false) {
    const fingerprint = claims.jti ? `jti:${claims.jti}` : `fp:${createHash("sha256").update(token).digest("hex")}`;
    const now = config.now ?? Date.now() / 1000;
    for (const [key, expiry] of replayCache) if (expiry <= now) replayCache.delete(key);
    if (replayCache.has(fingerprint)) throw new Error("access_required");
    if (replayCache.size >= MAX_REPLAY_ENTRIES) {
      const oldest = replayCache.keys().next().value;
      if (oldest) replayCache.delete(oldest);
    }
    replayCache.set(fingerprint, claims.exp);
  }
  return claims;
}
