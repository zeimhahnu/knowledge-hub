#!/usr/bin/env node
/**
 * Access JWT replay behaviour.
 *
 * Cloudflare Access assertions carry NO jti. The replay cache used to fall back
 * to fingerprinting the whole token, which is stable for an entire session, so
 * the SECOND API call of every session was rejected as CA07 - a bogus "Access
 * identity required" that looked like a login failure. This pins both halves:
 * a jti-less token must verify repeatedly, and a real nonce must still be
 * single-use.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync, createSign, randomUUID } from "node:crypto";
import { verifyAccessJwt, clearAccessReplayCache, accessFailureCode } from "../src/lib/ca-analyst/auth.ts";

const KID = "test-key-1";
const ISSUER = "https://example.cloudflareaccess.com";
const AUDIENCE = "aud-tag-under-test";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ keys: [{ ...jwk, kid: KID, kty: "RSA", alg: "RS256", use: "sig" }] }));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const jwksUrl = `http://127.0.0.1:${server.address().port}/certs`;

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

function mint({ jti } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", kid: KID, typ: "JWT" };
  const claims = { sub: "user-123", email: "a@b.test", iss: ISSUER, aud: AUDIENCE,
    iat: now, exp: now + 3600, ...(jti ? { jti } : {}) };
  const signingInput = `${b64(header)}.${b64(claims)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(privateKey).toString("base64url")}`;
}

const config = { jwksUrl, issuer: ISSUER, audience: AUDIENCE };
let failures = 0;
const check = async (label, fn) => {
  try { await fn(); console.log(`  ok  ${label}`); }
  catch (error) { failures++; console.error(`  FAIL ${label}\n       ${error.message}`); }
};

// The regression: a Cloudflare-shaped token (no jti) must survive repeated use.
clearAccessReplayCache();
const sessionToken = mint();
await check("jti-less token verifies on first use", async () => {
  const claims = await verifyAccessJwt(sessionToken, config);
  assert.equal(claims.sub, "user-123");
});
await check("jti-less token verifies AGAIN (was CA07 before the fix)", async () => {
  const claims = await verifyAccessJwt(sessionToken, config);
  assert.equal(claims.sub, "user-123");
});
await check("jti-less token survives a third and fourth use", async () => {
  await verifyAccessJwt(sessionToken, config);
  await verifyAccessJwt(sessionToken, config);
});

// The security property that must NOT be lost: a real nonce stays single-use.
clearAccessReplayCache();
const noncedToken = mint({ jti: randomUUID() });
await check("token with a jti verifies once", async () => {
  const claims = await verifyAccessJwt(noncedToken, config);
  assert.equal(claims.sub, "user-123");
});
await check("replaying a jti token is still rejected as CA07", async () => {
  await assert.rejects(
    () => verifyAccessJwt(noncedToken, config),
    (error) => accessFailureCode(error) === "CA07",
  );
});

// consumeReplay:false must stay a full bypass (middleware relies on it).
clearAccessReplayCache();
const bypassToken = mint({ jti: randomUUID() });
await check("consumeReplay:false never consumes a nonce", async () => {
  await verifyAccessJwt(bypassToken, { ...config, consumeReplay: false });
  await verifyAccessJwt(bypassToken, { ...config, consumeReplay: false });
});

server.close();
if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log("access replay behaviour OK");
