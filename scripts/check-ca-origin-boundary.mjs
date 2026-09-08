#!/usr/bin/env node
import assert from "node:assert/strict";
import { generateKeyPairSync, createSign } from "node:crypto";
import { accessFailureCode, accessJwtFromHeaders, verifyAccessJwt } from "../src/lib/ca-analyst/auth.ts";
import { originAccessMode, originBoundaryDecision } from "../src/lib/ca-analyst/origin-boundary.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
const now = 1_800_000_000;

function part(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(overrides = {}, key = privateKey) {
  const header = part({ alg: "RS256", kid: "test-key", typ: "JWT" });
  const payload = part({ sub: "user-1", iss: "https://tenant.cloudflareaccess.com", aud: "app-a", exp: now + 300, nbf: now - 10, jti: "jti-1", ...overrides });
  const input = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  signer.end();
  return `${input}.${signer.sign(key).toString("base64url")}`;
}

const jwksUrl = "https://tenant.cloudflareaccess.com/cdn-cgi/access/certs";
globalThis.fetch = async (url) => {
  assert.equal(url, jwksUrl);
  return new Response(JSON.stringify({ keys: [{ ...jwk, kid: "test-key", alg: "RS256", kty: "RSA" }] }), { status: 200 });
};

assert.equal(originAccessMode({}), "pre-activation");
assert.equal(originAccessMode({ CA_ACCESS_ORIGIN_A_MODE: "enforce" }), "enforce");
assert.equal(originAccessMode({ CA_ACCESS_ORIGIN_A_MODE: "public" }), "invalid");
assert.equal(originBoundaryDecision("/", "pre-activation"), "deny");
assert.equal(originBoundaryDecision("/.well-known/acme-challenge/x", "pre-activation"), "allow-certificate");
assert.equal(originBoundaryDecision("/.well-known/vercel/x", "pre-activation"), "allow-certificate");
assert.equal(originBoundaryDecision("/.well-known/other/x", "pre-activation"), "deny");
assert.equal(originBoundaryDecision("/lookup/AAPL/", "enforce"), "verify");

process.env.CA_ACCESS_ORIGIN_A_MODE = "pre-activation";
assert.equal(originBoundaryDecision("/", originAccessMode()), "deny");
assert.equal(originBoundaryDecision("/.well-known/acme-challenge/x", originAccessMode()), "allow-certificate");
assert.equal(originBoundaryDecision("/.well-known/vercel/x", originAccessMode()), "allow-certificate");
assert.equal(originBoundaryDecision("/.well-known/other/x", originAccessMode()), "deny");

process.env.CA_ACCESS_ORIGIN_A_MODE = "enforce";
process.env.CA_ACCESS_JWKS_URL = jwksUrl;
process.env.CA_ACCESS_ISSUER = "https://tenant.cloudflareaccess.com";
process.env.CA_ACCESS_AUDIENCE = "app-a";

async function verifyStatus(assertion) {
  try {
    await verifyAccessJwt(assertion, { jwksUrl, issuer: "https://tenant.cloudflareaccess.com", audience: "app-a", now });
    return 200;
  } catch {
    return 403;
  }
}

assert.equal(await verifyStatus(null), 403, "missing assertion must be rejected at direct origin");
assert.equal(await verifyStatus("eyJhbGciOiJSUzI1NiJ9.forged.signature"), 403, "forged assertion must be rejected");
assert.equal(await verifyStatus(token({ aud: "wrong-app" })), 403, "wrong audience must be rejected");
assert.equal(await verifyStatus(token({ iss: "https://wrong.example" })), 403, "wrong issuer must be rejected");
assert.equal(await verifyStatus(token({ exp: now - 1 })), 403, "expired assertion must be rejected");
assert.equal(await verifyStatus(token({ nbf: now + 301 })), 403, "future nbf assertion must be rejected");
const validAssertion = token({ jti: "valid-assertion" });
const cookieAssertion = token({ jti: "cookie-assertion" });
assert.equal(await verifyStatus(validAssertion), 200, "verified assertion must permit a Hub route");

const accessCookie = `other=value; CF_Authorization=${cookieAssertion}; trailing=value`;
assert.equal(
  accessJwtFromHeaders(new Headers({ "cf-access-jwt-assertion": validAssertion, cookie: accessCookie })),
  validAssertion,
  "the assertion header must take precedence over the Access cookie",
);
assert.equal(
  accessJwtFromHeaders(new Headers({ cookie: accessCookie })),
  cookieAssertion,
  "the exact CF_Authorization cookie must be used when the assertion header is absent",
);
assert.equal(
  accessJwtFromHeaders(new Headers({ "cf-access-jwt-assertion": "", cookie: accessCookie })),
  cookieAssertion,
  "an empty upstream assertion header must not suppress the signed Access cookie",
);
assert.equal(
  accessJwtFromHeaders(new Headers({ "cf-access-jwt-assertion": "invalid", cookie: accessCookie })),
  "invalid",
  "an invalid assertion header must not fall back to a cookie",
);
assert.equal(accessJwtFromHeaders(new Headers({ cookie: "CF_Authorization_extra=invalid" })), null, "only the exact Access cookie name is accepted");
assert.equal(accessJwtFromHeaders(new Headers()), null, "a request without an Access token must fail closed");
assert.equal(await verifyStatus(accessJwtFromHeaders(new Headers({ cookie: accessCookie }))), 200, "the cookie fallback remains subject to strict JWT verification");
assert.equal(await verifyStatus(accessJwtFromHeaders(new Headers({ "cf-access-jwt-assertion": "invalid", cookie: accessCookie }))), 403, "header precedence must not weaken token verification");
assert.equal(await verifyStatus(accessJwtFromHeaders(new Headers())), 403, "missing token must still be denied");
assert.equal(accessFailureCode(new Error("CA01")), "CA01", "known diagnostics remain bounded");
assert.equal(accessFailureCode(new Error("unexpected detail")), "CA00", "unknown errors must not leak details");

const fs = await import("node:fs/promises");
const middlewareSource = await fs.readFile(new URL("../src/middleware.ts", import.meta.url), "utf8");
const routeSource = await fs.readFile(new URL("../src/app/api/ca-analyst/turn/route.ts", import.meta.url), "utf8");
assert.match(middlewareSource, /accessJwtFromHeaders\(request\.headers\)/, "page and API middleware must use the shared Access-token selector");
assert.match(routeSource, /accessJwtFromHeaders\(request\.headers\)/, "the analyst route must use the shared Access-token selector");
assert.match(routeSource, /cf-access-token/);
assert.doesNotMatch(routeSource, /request\.(identity|budget|systemPrompt|model|tool|url|citation|newsUrl)/);

console.log("OK — CA origin boundary, certificate exceptions, JWT claims/signature, and relay contract pass");
