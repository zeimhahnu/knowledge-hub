#!/usr/bin/env node
/**
 * Offline contract check for ingest Basic Auth and the wire-size guard.
 * Run from repo root: node scripts/check-ingest-auth.mjs
 */
import assert from "node:assert/strict";
import { contentLengthStatus, isAuthorized } from "../src/middleware.ts";

const expected = "user:pass";
const basic = (value) => `Basic ${Buffer.from(value).toString("base64")}`;

assert.equal(isAuthorized(basic(expected), expected), true, "correct credentials must pass");
assert.equal(isAuthorized(basic("user:wrong"), expected), false, "wrong password must fail");
assert.equal(isAuthorized(basic("wrong:pass"), expected), false, "wrong username must fail");
assert.equal(isAuthorized(null, expected), false, "absent Authorization must fail");
assert.equal(isAuthorized(`Bearer ${Buffer.from(expected).toString("base64")}`, expected), false, "non-Basic scheme must fail");
assert.equal(isAuthorized(basic("user:pas"), expected), false, "a prefix must fail before timingSafeEqual");
assert.equal(isAuthorized(basic(expected), undefined), false, "missing configured credentials must fail closed");

const maxBytes = 25_000_000;
assert.equal(contentLengthStatus(String(maxBytes + 1), maxBytes), 413, "oversized declaration must reject");
assert.equal(contentLengthStatus(String(maxBytes), maxBytes), null, "limit-sized declaration must pass");
assert.equal(contentLengthStatus(String(maxBytes - 1), maxBytes), null, "smaller declaration must pass");
assert.equal(contentLengthStatus(null, maxBytes), null, "absent declaration must pass to the post-parse guard");

console.log("OK — ingest auth and Content-Length contracts pass");
